"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getAllOrders, type Order } from "@/lib/storage"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { OrderCard } from "@/components/order-card"
import { motion, AnimatePresence } from "framer-motion"
import { UserButton, OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { getBusinessConfig } from "@/lib/business-configs"
import { Footer } from "@/components/footer"

export default function StatusFilterPage() {
    const params = useParams()
    // Decode the status from the URL (e.g. "Order%20Received" -> "Order Received")
    const statusFilter = decodeURIComponent(params.status as string)

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    useEffect(() => {
        // 1. Initial load from localStorage for immediate UI consistency
        const storedType = localStorage.getItem("businessType")
        if (storedType) {
            setBusinessType(storedType)
        }

        // 2. Sync from organization metadata IF AND ONLY IF we don't have a local selection
        const orgBusinessType = organization?.publicMetadata?.businessType as string
        if (orgBusinessType && !storedType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        }
    }, [organization])

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrders = () => {
        const allOrders = getAllOrders()
        setOrders(allOrders)
        setLoading(false)
    }

    const copyTrackingLink = (id: string) => {
        const link = `${window.location.origin}/track/${id}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const filteredOrders = orders.filter(
        (order) => order.currentStatus === statusFilter
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading orders...</p>
            </div>
        )
    }

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
                                    <span style={{ color: config.theme.secondary }}>O</span>
                                    <span style={{ color: config.theme.primary }}>Tracker</span>
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

            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-[1400px] space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Back Button */}
                    <Link href="/backoffice" className="w-full sm:w-auto">
                        <Button variant="outline"
                            className="w-full sm:w-auto gap-2 text-slate-600 transition-colors justify-center"
                            style={{ '--hover-bg': config.theme.primary } as any}
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Button>
                    </Link>

                    {/* Status Filter Info */}
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none w-full sm:w-auto">
                        <span className="sm:hidden text-sm font-medium text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            {filteredOrders.length > 0 && (
                                <Link href={`/backoffice/bulk?status=${encodeURIComponent(statusFilter)}`}>
                                    <Button
                                        className="text-white rounded-lg h-9 px-4 shadow-sm font-medium text-sm border-0"
                                        style={{ backgroundColor: config.theme.primary }}
                                    >
                                        Bulk Update
                                    </Button>
                                </Link>
                            )}

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="font-medium rounded-full px-4 h-9 cursor-default pointer-events-none border-0"
                                    style={{ backgroundColor: `${config.theme.primary}1A`, color: config.theme.primary }}
                                >
                                    {statusFilter}
                                </Button>
                                <span className="text-muted-foreground text-sm">{filteredOrders.length} orders</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                <AnimatePresence mode="popLayout">
                    {filteredOrders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            layout
                        >
                            <Card className="bg-white/40 border-dashed border-2 border-white/60 shadow-none">
                                <CardContent className="py-20 text-center text-muted-foreground">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">No orders found with status "{statusFilter}"</p>
                                    <div className="flex items-center justify-between">
                                        <Link href="/backoffice">
                                            <Button
                                                variant="outline"
                                                className="gap-2 border-[#191A43] text-[#191A43] hover:bg-[#191A43] hover:text-white transition-all duration-200 rounded-xl shadow-sm"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                Back to Dashboard
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
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
            <Footer />
        </div>
    )
}
