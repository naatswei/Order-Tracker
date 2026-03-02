"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Order } from "@/lib/storage"
import { useState, useEffect } from "react"
import { getBusinessConfig } from "@/lib/business-configs"

interface OrderCardProps {
    order: Order
    copiedId: string | null
    onCopy: (id: string) => void
    businessType: string | null
}

export function OrderCard({ order, copiedId, onCopy, businessType }: OrderCardProps) {
    const config = getBusinessConfig(businessType)

    const getStatusColor = (status: string) => {
        if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("completed")) {
            return "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200"
        }
        if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked") || status.toLowerCase().includes("dispatched")) {
            return "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200"
        }
        return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100/80 border-zinc-200"
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex justify-center w-full">
                <Card className="group overflow-hidden border-white/50 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all shadow-sm hover:shadow-md rounded-xl w-full max-w-[1370px] h-auto flex flex-col justify-center">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            {/* Main Info */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-bold tracking-tight" style={{ color: config.theme.primary }}>{order.orderNumber}</h3>
                                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-normal text-sm border ${getStatusColor(order.currentStatus)} bg-opacity-50`}>
                                        {order.currentStatus}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-[15px]">
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground w-32 shrink-0 whitespace-nowrap">Customer:</span>
                                        <span className="font-medium text-slate-700">{order.customerName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground w-32 shrink-0 whitespace-nowrap">Contact:</span>
                                        <span className="font-medium text-slate-700">{order.customerPhone}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground w-32 shrink-0 whitespace-nowrap">{config.itemLabel}:</span>
                                        <span className="font-medium text-slate-700 capitalize">{order.itemType || order.garmentType}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground w-32 shrink-0 whitespace-nowrap">{config.orderLabel === "Tracking Number" ? "Pickup Date" : "Pick Up Date"}:</span>
                                        <span className="font-medium text-red-400">{order.pickupDate}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="text-sm text-muted-foreground/60">Created: {new Date(order.createdAt).toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-48 shrink-0">
                                <Link href={`/backoffice/order/${order.id}`}>
                                    <Button
                                        className="w-full text-white rounded-lg h-11 shadow-sm font-medium border-0"
                                        style={{ backgroundColor: config.theme.secondary }}
                                    >
                                        Update Status
                                    </Button>
                                </Link>

                                <Button
                                    variant="outline"
                                    onClick={() => onCopy(order.id)}
                                    className={`w-full bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg h-11 font-medium ${copiedId === order.id ? "text-green-600 border-green-200 bg-green-50" : ""}`}
                                >
                                    {copiedId === order.id ? "Copied!" : "Copy Link"}
                                </Button>

                                <Link href={`/backoffice/create?edit=${order.id}`}>
                                    <Button
                                        className="w-full text-white rounded-lg h-11 shadow-sm font-medium mt-1 border-0"
                                        style={{ backgroundColor: config.theme.primary }}
                                    >
                                        Edit Order
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}
