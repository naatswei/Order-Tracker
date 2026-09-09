"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrders } from "@/app/actions/orders"
import { getWorkflowStages } from "@/app/actions/operations"
import Link from "next/link"
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Search, Plus, Package, Mail, ChevronRight, Copy, ExternalLink, Menu, X, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { OrderCard } from "@/components/order-card"
import { getBusinessConfig, getStatusTheme } from "@/lib/business-configs"
import { BackofficeHeader } from "@/components/backoffice-header"
import { SignatureLoader } from "@/components/signature-loader"
import { RenewalBanner } from "@/components/renewal-banner"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface StageColorTheme {
    hex: string;
    bgLight: string;
    textLight: string;
    borderLight: string;
    dotBg: string;
}

const STAGE_COLOR_PALETTE: StageColorTheme[] = [
    { hex: "#F59E0B", bgLight: "bg-amber-50", textLight: "text-amber-700", borderLight: "border-amber-200", dotBg: "bg-amber-500" }, // Amber (Order Placed / Received)
    { hex: "#0284C7", bgLight: "bg-sky-50", textLight: "text-sky-700", borderLight: "border-sky-200", dotBg: "bg-sky-500" }, // Sky (Kitchen / Cooking / Processing)
    { hex: "#8B5CF6", bgLight: "bg-purple-50", textLight: "text-purple-700", borderLight: "border-purple-200", dotBg: "bg-purple-500" }, // Purple (Ready for Pickup / Packed)
    { hex: "#6366F1", bgLight: "bg-indigo-50", textLight: "text-indigo-700", borderLight: "border-indigo-200", dotBg: "bg-indigo-500" }, // Indigo (Out for Delivery / Rider)
    { hex: "#10B981", bgLight: "bg-emerald-50", textLight: "text-emerald-700", borderLight: "border-emerald-200", dotBg: "bg-emerald-500" }, // Emerald (Delivered / Completed)
    { hex: "#F43F5E", bgLight: "bg-rose-50", textLight: "text-rose-700", borderLight: "border-rose-200", dotBg: "bg-rose-500" }, // Rose (Cancelled / Delayed)
    { hex: "#06B6D4", bgLight: "bg-cyan-50", textLight: "text-cyan-700", borderLight: "border-cyan-200", dotBg: "bg-cyan-500" }, // Cyan
];

function getStageTheme(stageName: string, index: number): StageColorTheme {
    const s = (stageName || "").toLowerCase();
    if (s.includes("deliver") || s.includes("complet") || s.includes("done")) {
        return STAGE_COLOR_PALETTE[4]; // Emerald
    }
    if (s.includes("cancel") || s.includes("delay") || s.includes("return") || s.includes("fail") || s.includes("hold")) {
        return STAGE_COLOR_PALETTE[5]; // Rose
    }
    if (s.includes("transit") || s.includes("delivery") || s.includes("dispatch") || s.includes("rider") || s.includes("route")) {
        return STAGE_COLOR_PALETTE[3]; // Indigo
    }
    if (s.includes("ready") || s.includes("pack") || s.includes("prep") || s.includes("cook") || s.includes("kitchen")) {
        return STAGE_COLOR_PALETTE[2]; // Purple
    }
    if (s.includes("receiv") || s.includes("placed") || s.includes("pending") || s.includes("new") || s.includes("book")) {
        return STAGE_COLOR_PALETTE[0]; // Amber
    }
    return STAGE_COLOR_PALETTE[index % STAGE_COLOR_PALETTE.length];
}

interface BusinessProfile {
    companyName: string
    contact: string
    location: string
    email: string
    website: string
    imagePreview: string | null
}

export default function BackofficePage() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [customStages, setCustomStages] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Business Config
    const { organization, isLoaded } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const [logisticsType, setLogisticsType] = useState<string>("restaurant")
    const config = useMemo(() => getBusinessConfig(businessType, logisticsType), [businessType, logisticsType])
    const isLogistics = businessType === "logistics"
    const isRestaurant = isLogistics ? logisticsType === "restaurant" : false

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    // Filter state
    const [statusFilter, setStatusFilter] = useState("All")

    // Subscription check state
    const [needsRenewal, setNeedsRenewal] = useState(false)
    const [renewalStatus, setRenewalStatus] = useState<'expired' | 'trial_ended' | 'inactive' | 'no_plan'>('inactive')

    // Load business type from organization metadata
    useEffect(() => {
        if (!isLoaded || !organization) return

        loadOrders()
        const orgBusinessType = organization.publicMetadata?.businessType as string
        if (orgBusinessType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        }

        // Handle logistics subtype (e.g. restaurant delivery service)
        const metadata = organization.publicMetadata as any
        const orgLogisticsType = (metadata?.logisticsType as string) || (typeof window !== "undefined" ? localStorage.getItem("logisticsType") : null) || "restaurant"
        if (orgLogisticsType) {
            setLogisticsType(orgLogisticsType)
            if (typeof window !== "undefined") {
                localStorage.setItem("logisticsType", orgLogisticsType)
            }
        }

        // Handle subscription metadata safely on client
        const subStatus = metadata?.subscriptionStatus as string
        const subExpiry = metadata?.subscriptionExpiry as string
        const hasPlan = !!metadata?.subscriptionPlan
        
        const isSubActive = subStatus === 'active' || subStatus === 'trialing'
        const isExpired = subExpiry ? new Date() > new Date(subExpiry) : false
        const needsRen = !isSubActive || isExpired || !hasPlan
        
        setNeedsRenewal(needsRen)
        setRenewalStatus(
            !hasPlan ? 'no_plan' :
            isExpired ? 'expired' : 
            (subStatus === 'trialing' ? 'trial_ended' : 'inactive')
        )
    }, [isLoaded, organization?.id, businessType])

    const loadOrders = async () => {
        setIsLoading(true)
        try {
            const [allOrders, stagesData] = await Promise.all([
                getOrders(),
                getWorkflowStages()
            ])
            
            if (stagesData && stagesData.length > 0) {
                const stageNames = stagesData.map((s: any) => s.name);
                setCustomStages(stageNames);
            } else {
                setCustomStages([]);
            }

            const errorItem = allOrders.find(o => (o as any).__isError);
            if (errorItem) {
                toast.error(`Failed to load orders: ${(errorItem as any).message}`);
                setIsLoading(false);
                return;
            }

            // Map DB fields to what the UI expects if necessary
            const mappedOrders: Order[] = (allOrders as Record<string, any>[]).map(o => ({
                id: o.id as string,
                orderNumber: o.orderNumber as string,
                customerName: o.customerName as string,
                customerEmail: (o.customerEmail as string) || "",
                customerPhone: o.customerPhone as string,
                garmentType: o.itemType as string,
                measurements: (o.measurements as string) || "",
                currentStatus: o.currentStatus as string,
                createdAt: o.createdAt as Date,
                updatedAt: o.updatedAt as Date,
                businessType: o.businessType as string,
                pickupDate: o.pickupDate as string,
                statusHistory: [],
                inventoryItems: o.inventoryLinks?.map((link: any) => ({
                    id: link.inventoryItem?.id,
                    name: link.inventoryItem?.name,
                    quantity: link.quantity,
                    sku: link.inventoryItem?.sku,
                    unit: link.inventoryItem?.unit,
                    category: link.inventoryItem?.category
                })) || []
            }))
            setOrders(mappedOrders)
        } catch (error: any) {
            console.error("Failed to load orders:", error);
            const errMsg = error?.message || (typeof error === "string" ? error : "Check database connection");
            toast.error(`Failed to load orders: ${errMsg}`);
        } finally {
            setIsLoading(false)
        }
    }

    const copyTrackingLink = (id: string) => {
        const link = `${window.location.origin}/track/${id}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // Pipeline stages configured in Operations is our source of truth
    const pipelineStageList = useMemo(() => {
        if (customStages && customStages.length > 0) {
            return customStages;
        }
        const bConfig = getBusinessConfig(businessType, logisticsType);
        return bConfig.statuses;
    }, [customStages, businessType, logisticsType]);

    // Live counts per status
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(o => {
            if (o.currentStatus) {
                counts[o.currentStatus] = (counts[o.currentStatus] || 0) + 1;
            }
        });
        return counts;
    }, [orders]);

    const filteredOrders = orders.filter(order => {
        if (!order) return false
        
        const matchesStatus = statusFilter === "All" || order.currentStatus === statusFilter
        if (!matchesStatus) return false

        const customerName = order.customerName || ""
        const orderNumber = order.orderNumber || ""
        const orderId = order.id || ""
        const customerPhone = order.customerPhone || ""
        const q = (searchQuery || "").toLowerCase()

        const matchesSearch =
            customerName.toLowerCase().includes(q) ||
            orderNumber.toLowerCase().includes(q) ||
            orderId.toLowerCase().includes(q) ||
            customerPhone.toLowerCase().includes(q)

        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <BackofficeHeader config={config} />

            {/* Renewal Banner */}
            {needsRenewal && <RenewalBanner status={renewalStatus} />}

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12 max-w-[1400px] space-y-6 sm:space-y-8">
                {/* Actions Bar */}
                <div className="space-y-3">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative w-full lg:flex-1 lg:max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={config.searchPlaceholder}
                                className="pl-11 h-11 rounded-xl bg-white border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-visible:ring-1 focus-visible:ring-slate-200 transition-all text-sm font-medium placeholder:text-slate-400 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <Button
                                asChild={!needsRenewal}
                                disabled={needsRenewal}
                                className={cn(
                                    "flex-1 lg:flex-none h-11 rounded-full text-white gap-2 px-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] text-sm font-bold border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98]",
                                    needsRenewal && "opacity-50 cursor-not-allowed"
                                )}
                                style={{ backgroundColor: !needsRenewal ? config.theme.primary : "#94a3b8" }}
                            >
                                {needsRenewal ? (
                                    <span>Bulk Update</span>
                                ) : (
                                    <Link href={searchQuery ? `/backoffice/bulk?search=${encodeURIComponent(searchQuery)}` : "/backoffice/bulk"}>
                                        Bulk Update
                                    </Link>
                                )}
                            </Button>
                            <Button
                                asChild={!needsRenewal}
                                disabled={needsRenewal}
                                className={cn(
                                    "flex-1 md:flex-none h-11 rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] gap-2 px-6 text-sm font-bold text-white border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98]",
                                    needsRenewal && "opacity-50 cursor-not-allowed"
                                )}
                                style={{ backgroundColor: !needsRenewal ? config.theme.secondary : "#94a3b8" }}
                            >
                                {needsRenewal ? (
                                    <>
                                        <Plus className="w-4 h-4" /> Create New Order
                                    </>
                                ) : (
                                    <Link href="/backoffice/create">
                                        <Plus className="w-4 h-4" /> Create New Order
                                    </Link>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Pipeline Stages Metric Filter Cards */}
                <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar">
                    {/* All Orders Card */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter("All")}
                        className={cn(
                            "flex-1 min-w-[170px] sm:min-w-[200px] max-w-[260px] shrink-0 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-left transition-all duration-200 cursor-pointer active:scale-[0.98] border-2",
                            statusFilter === "All"
                                ? "bg-[#181920] text-white border-slate-600 shadow-lg shadow-black/10 ring-2 ring-slate-700/50"
                                : "bg-white text-slate-800 border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-sm"
                        )}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                                "text-xs sm:text-sm font-semibold truncate",
                                statusFilter === "All" ? "text-slate-300" : "text-slate-600"
                            )}>
                                All Orders
                            </span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                                statusFilter === "All" 
                                    ? "bg-white/10 text-white border-white/20" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                All
                            </span>
                        </div>

                        <div className={cn(
                            "text-2xl sm:text-3xl font-extrabold tracking-tight my-2",
                            statusFilter === "All" ? "text-white" : "text-slate-900"
                        )}>
                            {orders.length}
                        </div>

                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={cn("flex items-center gap-1.5", statusFilter === "All" ? "text-slate-300" : "text-slate-500")}>
                                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                    <span>Total Pipeline</span>
                                </span>
                                <span className={cn("font-bold", statusFilter === "All" ? "text-slate-300" : "text-slate-600")}>100%</span>
                            </div>
                            <div className={cn("h-1.5 w-full rounded-full overflow-hidden", statusFilter === "All" ? "bg-white/10" : "bg-slate-100")}>
                                <div className="h-full rounded-full transition-all duration-300 bg-slate-400 w-full" />
                            </div>
                        </div>
                    </button>

                    {/* Pipeline Stage Cards (Color-Coded) */}
                    {pipelineStageList.map((stageName, idx) => {
                        const count = statusCounts[stageName] || 0;
                        const isSelected = statusFilter === stageName;
                        const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                        const theme = getStageTheme(stageName, idx);

                        return (
                            <button
                                key={stageName}
                                type="button"
                                onClick={() => setStatusFilter(isSelected ? "All" : stageName)}
                                style={{
                                    borderColor: isSelected ? theme.hex : count > 0 ? `${theme.hex}55` : undefined
                                }}
                                className={cn(
                                    "flex-1 min-w-[170px] sm:min-w-[200px] max-w-[260px] shrink-0 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-left transition-all duration-200 cursor-pointer active:scale-[0.98] border-2",
                                    isSelected
                                        ? "bg-[#181920] text-white shadow-xl shadow-black/10 ring-2"
                                        : "bg-white text-slate-800 border-slate-200/90 shadow-2xs hover:shadow-sm"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={cn(
                                        "text-xs sm:text-sm font-semibold truncate",
                                        isSelected ? "text-slate-200" : "text-slate-700"
                                    )}>
                                        {stageName}
                                    </span>
                                    <span 
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                                        style={{
                                            backgroundColor: isSelected ? `${theme.hex}25` : `${theme.hex}15`,
                                            color: theme.hex,
                                            borderColor: isSelected ? `${theme.hex}50` : `${theme.hex}30`
                                        }}
                                    >
                                        Stage {idx + 1}
                                    </span>
                                </div>

                                <div className={cn(
                                    "text-2xl sm:text-3xl font-extrabold tracking-tight my-2",
                                    isSelected ? "text-white" : "text-slate-900"
                                )}>
                                    {count}
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-semibold">
                                        <span className={cn("flex items-center gap-1.5 truncate max-w-[110px]", isSelected ? "text-slate-300" : "text-slate-500")}>
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.hex }} />
                                            <span className="truncate">{stageName}</span>
                                        </span>
                                        <span className="font-bold shrink-0" style={{ color: theme.hex }}>{pct}%</span>
                                    </div>
                                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isSelected ? "bg-white/10" : "bg-slate-100")}>
                                        <div 
                                            className="h-full rounded-full transition-all duration-300" 
                                            style={{ 
                                                width: `${Math.max(pct, count > 0 ? 8 : 0)}%`, 
                                                backgroundColor: theme.hex 
                                            }} 
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Active Filter Indicator */}
                {statusFilter !== "All" && (
                    <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-700 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <span>
                                Filtered by <strong className="text-slate-900">{statusFilter}</strong> ({filteredOrders.length} {filteredOrders.length === 1 ? (isLogistics && !isRestaurant ? 'shipment' : 'order') : (isLogistics && !isRestaurant ? 'shipments' : 'orders')})
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("All")}
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold hover:underline ml-2 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear Filter</span>
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">{config.dashboardTitle}</h2>
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white border-slate-200 text-slate-600 shadow-sm">{filteredOrders.length}</Badge>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <SignatureLoader message="Syncing Order Board" />
                        ) : filteredOrders.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                layout
                            >
                                <Card className="bg-transparent border-dashed border-2 border-slate-200 shadow-none text-center py-24 rounded-3xl">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                        <Package className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No orders found</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Get started by creating your first order or adjusting your search filters.</p>
                                    {(searchQuery || statusFilter !== "All") && (
                                        <Button 
                                            variant="link" 
                                            onClick={() => {
                                                setSearchQuery("")
                                                setStatusFilter("All")
                                            }} 
                                            className="mt-4 text-[#191A43] font-medium"
                                        >
                                            Clear all filters
                                        </Button>
                                    )}
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredOrders.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        copiedId={copiedId}
                                        onCopy={copyTrackingLink}
                                        businessType={businessType}
                                        needsRenewal={needsRenewal}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

