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
import { Search, Plus, Filter, Package, Mail, ChevronRight, Copy, ExternalLink, Menu, X, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { OrderCard } from "@/components/order-card"
import { getBusinessConfig, getStatusTheme } from "@/lib/business-configs"
import { BackofficeHeader } from "@/components/backoffice-header"
import { SignatureLoader } from "@/components/signature-loader"
import { RenewalBanner } from "@/components/renewal-banner"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    const config = getBusinessConfig(businessType)
    const isLogistics = businessType === "logistics"

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

        // Handle subscription metadata safely on client
        const metadata = organization.publicMetadata as any
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
        // Important: depend only on the ID so we don't reload orders on every state change (e.g. searching, copying links)
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

    // Dynamic status options from pipeline stages + fallback
    const statusOptions = useMemo(() => {
        const base = customStages.length > 0 ? customStages : config.statuses;
        const set = new Set<string>();
        base.forEach(s => set.add(s));
        
        // Ensure standard terminal options are present if custom stages only contain in-progress steps
        const terminalOptions = isLogistics 
            ? ["Delivered", "Cancelled", "Returned to Sender", "Held at Customs"] 
            : ["Completed", "Delivered", "Cancelled", "Refunded"];
        terminalOptions.forEach(t => set.add(t));

        // Also include any active status currently on orders
        orders.forEach(o => {
            if (o.currentStatus && o.currentStatus.trim()) {
                set.add(o.currentStatus);
            }
        });

        return Array.from(set);
    }, [customStages, config.statuses, orders, isLogistics]);

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

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12 max-w-[1400px] space-y-8 sm:space-y-[70px]">
                {/* Actions Bar */}
                <div className="space-y-3">
                    <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500 ml-1">Track Order</h2>
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
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        className={cn(
                                            "h-11 rounded-full border gap-2 px-4 sm:px-5 transition-all duration-300 text-sm font-semibold active:scale-95",
                                            statusFilter !== "All"
                                                ? "bg-[#191A43] text-white border-[#191A43] hover:bg-slate-800 shadow-md shadow-[#191A43]/15"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                                        )}
                                    >
                                        <Filter className={cn("w-4 h-4", statusFilter !== "All" ? "text-indigo-400" : "text-slate-500")} />
                                        {statusFilter === "All" ? (
                                            <span>Filter</span>
                                        ) : (
                                            <div className="flex items-center gap-1.5 max-w-[140px] sm:max-w-none truncate">
                                                <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusTheme(statusFilter).dot)} />
                                                <span className="truncate">{statusFilter}</span>
                                                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[11px] font-mono">
                                                    {statusCounts[statusFilter] || 0}
                                                </span>
                                            </div>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="end" 
                                    className="w-[280px] sm:w-[320px] max-h-[380px] overflow-y-auto rounded-3xl p-2 shadow-2xl border-slate-200/80 bg-white/95 backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95"
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-1">
                                        <DropdownMenuLabel className="p-0 text-xs font-black text-slate-800 uppercase tracking-wider">
                                            Filter by Status
                                        </DropdownMenuLabel>
                                        {statusFilter !== "All" && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStatusFilter("All");
                                                }}
                                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                            >
                                                Reset Filter
                                            </button>
                                        )}
                                    </div>

                                    {/* All Shipments / All Orders Option */}
                                    <DropdownMenuItem
                                        className={cn(
                                            "cursor-pointer rounded-2xl px-3 py-2.5 transition-colors flex items-center justify-between gap-2 text-xs sm:text-sm font-medium",
                                            statusFilter === "All"
                                                ? "bg-[#191A43] text-white font-bold"
                                                : "text-slate-700 hover:bg-slate-100/80 focus:bg-slate-100"
                                        )}
                                        onSelect={() => setStatusFilter("All")}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={cn(
                                                "w-2.5 h-2.5 rounded-full shrink-0",
                                                statusFilter === "All" ? "bg-white" : "bg-slate-400"
                                            )} />
                                            <span className="truncate">{isLogistics ? "All Shipments" : "All Orders"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[11px] font-mono font-bold",
                                                statusFilter === "All" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {orders.length}
                                            </span>
                                            {statusFilter === "All" && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                        </div>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                                    {/* Pipeline Stages & Status Options */}
                                    <div className="space-y-0.5">
                                        {statusOptions.map((status) => {
                                            const count = statusCounts[status] || 0;
                                            const isSelected = statusFilter === status;
                                            const theme = getStatusTheme(status);

                                            return (
                                                <DropdownMenuItem
                                                    key={status}
                                                    className={cn(
                                                        "cursor-pointer rounded-2xl px-3 py-2.5 transition-colors flex items-center justify-between gap-2 text-xs sm:text-sm",
                                                        isSelected
                                                            ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/60"
                                                            : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
                                                    )}
                                                    onSelect={() => setStatusFilter(status)}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", theme.dot)} />
                                                        <span className="truncate">{status}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[11px] font-mono font-bold",
                                                            isSelected ? "bg-indigo-200/60 text-indigo-900" : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {count}
                                                        </span>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                                    </div>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

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

                {/* Active Filter Indicator */}
                {statusFilter !== "All" && (
                    <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-700 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", getStatusTheme(statusFilter).dot)} />
                            <span>
                                Filtered by <strong className="text-slate-900">{statusFilter}</strong> ({filteredOrders.length} {filteredOrders.length === 1 ? (isLogistics ? 'shipment' : 'order') : (isLogistics ? 'shipments' : 'orders')})
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("All")}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline ml-2"
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

