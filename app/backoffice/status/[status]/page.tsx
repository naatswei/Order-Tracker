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
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"

export default function StatusFilterPage() {
    const params = useParams()
    // Decode the status from the URL (e.g. "Order%20Received" -> "Order Received")
    const statusFilter = decodeURIComponent(params.status as string)

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

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
            <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
                <div className="w-full px-[30px] py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                <Package className="text-[#191A43] w-5 h-5" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold tracking-tight">OTracker</h1>
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

            <div className="container mx-auto px-4 py-8 max-w-[1400px] space-y-8">
                {/* Back Button and Title */}
                {/* Back Button and Title */}
                <div className="flex justify-between items-start">
                    <Link href="/backoffice">
                        <Button variant="outline" className="gap-2 text-slate-600 hover:bg-[#191A43] hover:text-[#ffffff] transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Button>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Filtered Orders</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 text-sm font-medium rounded-full">
                                    {statusFilter}
                                </Badge>
                                <span className="text-muted-foreground ml-2">({filteredOrders.length} found)</span>
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
                                    <Link href="/backoffice">
                                        <Button variant="link" className="mt-2">View All Orders</Button>
                                    </Link>
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
        </div>
    )
}
