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
import { Search, Plus, Filter, Package, Mail, ChevronRight, Copy, ExternalLink, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { OrderCard } from "@/components/order-card"
import { getBusinessConfig } from "@/lib/business-configs"
import { BackofficeHeader } from "@/components/backoffice-header"
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
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Business Config
    const { organization, isLoaded } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)
    const statusOptions = config.statuses

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    // Filter state
    const [statusFilter, setStatusFilter] = useState("All")

    // Load business type from organization metadata
    useEffect(() => {
        if (!isLoaded || !organization) return

        loadOrders()
        const orgBusinessType = organization.publicMetadata?.businessType as string
        if (orgBusinessType) {
            setBusinessType(orgBusinessType)
            // Sync to localStorage for components that still rely on it
            localStorage.setItem("businessType", orgBusinessType)
        }
        // Important: depend only on the ID so we don't reload orders on every state change (e.g. searching, copying links)
    }, [isLoaded, organization?.id])

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
                pickupDate: o.pickupDate as string,
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
            <BackofficeHeader config={config} />

            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-[1400px] space-y-8 sm:space-y-[70px]">
                {/* Actions Bar */}
                <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-800">Track Order</h2>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative w-full md:flex-1 md:max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={config.searchPlaceholder}
                                className="pl-11 h-10 sm:h-12 rounded-xl bg-white border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-visible:ring-1 focus-visible:ring-slate-200 transition-all text-sm sm:text-base font-medium placeholder:text-slate-400 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-10 sm:h-12 rounded-xl bg-white border border-slate-100 text-slate-700 hover:bg-white hover:border-slate-200 hover:text-slate-900 gap-2 px-4 sm:px-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex-1 md:flex-none text-sm sm:text-base font-medium">
                                        <Filter className="w-4 h-4" />
                                        {statusFilter === "All" ? "Filter" : statusFilter}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-y-auto">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <Link href="/backoffice" className="w-full">
                                        <DropdownMenuItem
                                            className="cursor-pointer focus:bg-slate-50 focus:text-slate-900 transition-colors"
                                            style={{ color: config.theme.primary }}
                                        >
                                            All {config.dashboardTitle.split(" ")[1]}s
                                        </DropdownMenuItem>
                                    </Link>
                                    {statusOptions.map((status) => (
                                        <Link key={status} href={`/backoffice/status/${encodeURIComponent(status)}`} className="w-full">
                                            <DropdownMenuItem
                                                className="cursor-pointer focus:bg-slate-50 focus:text-slate-900 transition-colors"
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
                                    className="w-full h-10 sm:h-12 rounded-xl text-white gap-2 px-4 sm:px-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] text-sm sm:text-base font-medium border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98]"
                                    style={{ backgroundColor: config.theme.primary }}
                                >
                                    Bulk Update
                                </Button>
                            </Link>
                            <Link href="/backoffice/create" className="flex-1 md:flex-none">
                                <Button
                                    className="w-full h-10 sm:h-12 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] gap-2 px-4 sm:px-6 text-sm sm:text-base font-medium text-white border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98]"
                                    style={{ backgroundColor: config.theme.secondary }}
                                >
                                    <Plus className="w-4 h-4" /> Create New Order
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">{config.dashboardTitle}</h2>
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white border-slate-200 text-slate-600 shadow-sm">{filteredOrders.length}</Badge>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="grid gap-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-full h-[180px] bg-white rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.02)] animate-pulse border border-slate-100 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                                            <div className="w-32 h-4 bg-slate-200 rounded-full" />
                                            <div className="w-48 h-3 bg-slate-200 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                    {searchQuery && <Button variant="link" onClick={() => setSearchQuery("")} className="mt-4 text-[#191A43] font-medium">Clear search filters</Button>}
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
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div >
        </div >
    )
}
