"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Order } from "@/lib/storage"
import { getBusinessConfig } from "@/lib/business-configs"

interface OrderCardProps {
    order: Order
    copiedId: string | null
    onCopy: (id: string) => void
    businessType: string | null
    needsRenewal?: boolean
}

export function OrderCard({ order, copiedId, onCopy, businessType, needsRenewal }: OrderCardProps) {
    const config = getBusinessConfig(businessType)

    const getStatusColor = (status: string | null | undefined) => {
        const s = (status || "").toLowerCase()
        if (s.includes("delivered") || s.includes("completed")) {
            return "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200"
        }
        if (s.includes("ready") || s.includes("picked") || s.includes("dispatched")) {
            return "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200"
        }
        return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100/80 border-zinc-200"
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex justify-center w-full">
                <Card className="group overflow-hidden border border-slate-100 bg-white shadow-[0_4px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-500 rounded-2xl w-full max-w-[1370px] h-auto flex flex-col justify-center">
                    <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            {/* Main Info */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-bold tracking-tight text-slate-800">{order.orderNumber}</h3>
                                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-normal text-sm border ${getStatusColor(order.currentStatus)} bg-opacity-50`}>
                                        {order.currentStatus}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-[15px]">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-slate-400 text-sm font-medium w-32 shrink-0 whitespace-nowrap">Customer:</span>
                                        <span className="font-semibold text-slate-800">{order.customerName}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-slate-400 text-sm font-medium w-32 shrink-0 whitespace-nowrap">Contact:</span>
                                        <span className="font-semibold text-slate-800">{order.customerPhone}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-slate-400 text-sm font-medium w-32 shrink-0 whitespace-nowrap">{config.itemLabel}:</span>
                                        <span className="font-semibold text-slate-800 capitalize">{order.itemType || order.garmentType}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-slate-400 text-sm font-medium w-32 shrink-0 whitespace-nowrap">{config.orderLabel === "Tracking Number" ? "Delivery Date" : "Delivery Date"}:</span>
                                        <span className="font-semibold text-red-500" suppressHydrationWarning>{order.pickupDate ? new Date(order.pickupDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                                    </div>
                                    {order.inventoryItems && order.inventoryItems.length > 0 && (
                                        <div className="flex gap-2 items-start pt-1">
                                            <span className="text-slate-400 text-sm font-medium w-32 shrink-0 whitespace-nowrap pt-0.5">Stock Sold:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {order.inventoryItems.map((item, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs font-bold bg-emerald-50/50 border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                        <span className="font-black">{item.quantity}</span> x <span>{item.name}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <div className="text-sm text-muted-foreground/60" suppressHydrationWarning>Created: {new Date(order.createdAt).toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-48 shrink-0">
                                {needsRenewal ? (
                                        <Button
                                        disabled
                                        className="w-full text-white rounded-full h-11 font-bold border-0 opacity-50 cursor-not-allowed"
                                        style={{ backgroundColor: "#94a3b8" }}
                                    >
                                        Update Status
                                    </Button>
                                ) : (
                                    <Link href={`/backoffice/order/${order.id}`} className="w-full">
                                        <Button
                                            className="w-full text-white rounded-full h-11 shadow-[0_4px_20px_rgb(0,0,0,0.08)] font-bold border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98]"
                                            style={{ backgroundColor: config.theme.secondary }}
                                        >
                                            Update Status
                                        </Button>
                                    </Link>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => onCopy(order.id)}
                                    className={`w-full bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:-translate-y-px active:scale-[0.98] transition-all duration-300 rounded-full h-11 font-bold ${copiedId === order.id ? "text-green-600 border-green-200 bg-green-50 hover:bg-green-50 hover:border-green-200 hover:shadow-none translate-y-0" : ""}`}
                                >
                                    {copiedId === order.id ? "Copied!" : "Copy Link"}
                                </Button>

                                {needsRenewal ? (
                                        <Button
                                        disabled
                                        className="w-full text-white rounded-full h-11 font-bold mt-1 border-0 opacity-50 cursor-not-allowed"
                                        style={{ backgroundColor: "#94a3b8" }}
                                    >
                                        Edit Order
                                    </Button>
                                ) : (
                                    <Link href={`/backoffice/create?edit=${order.id}`} className="w-full">
                                        <Button
                                            className="w-full text-white rounded-full h-11 shadow-[0_4px_20px_rgb(0,0,0,0.08)] font-bold mt-1 border-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98]"
                                            style={{ backgroundColor: config.theme.primary }}
                                        >
                                            Edit Order
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}
