"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrders } from "@/app/actions/orders"
import Link from "next/link"
import { UserButton, OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { Package, Plus, Search, Filter, RefreshCw, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { OrderCard } from "@/components/order-card"
import { getBusinessConfig } from "@/lib/business-configs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function BackofficePage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)
    const statusOptions = config.statuses

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    // Filter state
    const [statusFilter, setStatusFilter] = useState("All")

    // Load orders and business type on mount/org change
    useEffect(() => {
        loadOrders()

        // 1. Initial load from localStorage for immediate UI consistency
        const storedType = localStorage.getItem("businessType")
        if (storedType) {
            setBusinessType(storedType)
        }

        // 2. Sync from organization metadata IF AND ONLY IF we don't have a local selection
        // This prevents stale org metadata from overwriting a fresh selection in onboarding
        const orgBusinessType = organization?.publicMetadata?.businessType as string
        if (orgBusinessType && !storedType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        }
    }, [organization])

    const loadOrders = async () => {
        setIsLoading(true)
        try {
            const allOrders = await getOrders()
            // Map DB fields to what the UI expects if necessary
            // In our case, schema matches mostly, but we use 'itemType' instead of 'garmentType'
            // and we need to ensure the types match the Order interface
            const mappedOrders: Order[] = (allOrders as Record<string, unknown>[]).map(o => ({
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
                statusHistory: [],
            }))
            setOrders(mappedOrders)
        } catch (error) {
            console.error("Failed to load orders:", error)
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

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <div
                className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm"
            >
                <div className="w-full px-4 sm:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-6 h-6" style={{ color: config.theme.primary }} />
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold tracking-tight">
                                    <span className="text-[#CE0003]">O</span>
                                    <span className="text-[#191A43]">Tracker</span>
                                </h1>
                                <p className="text-xs text-muted-foreground">Backoffice Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <OrganizationSwitcher
                                afterCreateOrganizationUrl="/backoffice"
                                appearance={{
                                    elements: {
                                        rootBox: "flex items-center",
                                        organizationSwitcherTrigger: "h-9 px-3 rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
                                    }
                                }}
                            />
                            <UserButton
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-9 h-9"
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-[1400px] space-y-8 sm:space-y-[70px]">
                {/* Actions Bar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900">Track {config.orderLabel.toLowerCase()}</h2>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative w-full md:flex-1 md:max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={config.searchPlaceholder}
                                className="pl-9 h-11 rounded-lg bg-white/50 border-slate-200 focus-visible:ring-primary/20 transition-all font-medium placeholder:font-normal w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-11 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 px-4 shadow-sm flex-1 md:flex-none">
                                        <Filter className="w-4 h-4" />
                                        {statusFilter === "All" ? "Filter" : statusFilter}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-y-auto">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <Link href="/backoffice" className="w-full">
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            style={{ color: config.theme.primary }}
                                        >
                                            All {config.dashboardTitle.split(" ")[1]}s
                                        </DropdownMenuItem>
                                    </Link>
                                    {statusOptions.map((status) => (
                                        <Link key={status} href={`/backoffice/status/${encodeURIComponent(status)}`} className="w-full">
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                style={{ color: config.theme.primary }}
                                            >
                                                {status}
                                            </DropdownMenuItem>
                                        </Link>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Link href={searchQuery ? `/backoffice/bulk?search=${encodeURIComponent(searchQuery)}` : "/backoffice/bulk"} className="flex-1 md:flex-none">
                                <Button
                                    className="w-full h-11 rounded-lg text-white gap-2 px-4 shadow-sm font-medium border-0 transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
                                    style={{ backgroundColor: config.theme.primary }}
                                >
                                    Bulk Update
                                </Button>
                            </Link>
                            <Link href="/onboarding/business-type" className="flex-1 md:flex-none">
                                <Button
                                    variant="outline"
                                    className="w-full h-11 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 px-4 shadow-sm"
                                    title="Change Business Type"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span className="md:hidden lg:inline">Switch Type</span>
                                </Button>
                            </Link>
                            <Link href="/backoffice/create" className="flex-1 md:flex-none">
                                <Button
                                    className="w-full h-11 rounded-lg shadow-sm gap-2 px-6 font-medium text-white border-0 transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
                                    style={{ backgroundColor: config.theme.secondary }}
                                >
                                    <Plus className="w-4 h-4" /> Create New Order
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[16px] font-semibold tracking-tight text-foreground/80">{config.dashboardTitle}</h2>
                        <Badge variant="outline" className="rounded-full px-3 bg-white/50">{filteredOrders.length}</Badge>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 border-dashed border-2 border-white/60 rounded-xl">
                                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                                <p className="text-muted-foreground">Loading orders...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                layout
                            >
                                <Card className="bg-white/40 border-dashed border-2 border-white/60 shadow-none text-center py-20">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">No orders found</p>
                                    {searchQuery && <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-primary">Clear search</Button>}
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
