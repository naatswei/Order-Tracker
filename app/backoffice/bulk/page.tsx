"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { getAllOrders, type Order, deleteOrder } from "@/lib/storage"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal, ExternalLink, Copy, Trash2, Eye } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner" // Assuming sonner is installed as seen in package.json
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function BulkUpdatePage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [copiedId, setCopiedId] = useState<string | null>(null)

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrders = () => {
        const allOrders = getAllOrders()
        // Sort by newest first usually makes sense
        setOrders(allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(orders.map(o => o.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const copyTrackingLink = (id: string) => {
        const link = `${window.location.origin}/track/${id}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        toast.success("Link copied to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this order?")) {
            deleteOrder(id)
            loadOrders()
            // also remove from selection if present
            setSelectedIds(prev => prev.filter(sid => sid !== id))
            toast.success("Order deleted")
        }
    }

    const handleBulkUpdate = () => {
        toast.info(`Bulk update initiated for ${selectedIds.length} orders. (Feature coming soon)`)
    }

    const getStatusColor = (status: string) => {
        if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("completed")) {
            return "bg-green-100 text-green-700 border-green-200"
        }
        if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked")) {
            return "bg-blue-100 text-blue-700 border-blue-200"
        }
        return "bg-zinc-100 text-zinc-700 border-zinc-200"
    }

    return (
        <div className="min-h-screen bg-background font-sans p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/backoffice">
                    <Button variant="outline" className="gap-2 rounded-xl h-10 px-4 border-slate-200 shadow-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                </Link>
            </div>

            <div className="flex justify-end">
                <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-11 px-6 shadow-sm font-medium"
                    onClick={handleBulkUpdate}
                    disabled={selectedIds.length === 0}
                >
                    Bulk Update
                </Button>
            </div>

            {/* Select All Bar */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-500 ml-1">Click to select all</h3>
                <div
                    className="w-full bg-blue-50/50 border border-blue-100 rounded-xl h-16 flex items-center px-6 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={toggleSelectAll}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.length === orders.length && orders.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                            {selectedIds.length === orders.length && orders.length > 0 && <span className="text-white text-lg leading-none pb-1">✓</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        className={`w-full bg-white border rounded-xl p-4 md:p-6 transition-all shadow-sm hover:shadow-md ${selectedIds.includes(order.id) ? 'border-blue-200 bg-blue-50/10' : 'border-slate-100'}`}
                    >
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

                            {/* Checkbox */}
                            <div
                                className="mt-1 md:mt-0 cursor-pointer p-2 -ml-2 hover:bg-slate-100 rounded-full"
                                onClick={() => toggleSelectOne(order.id)}
                            >
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(order.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                    {selectedIds.includes(order.id) && <span className="text-white text-lg leading-none pb-1">✓</span>}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-bold text-slate-900 text-lg">{order.orderNumber}</span>
                                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-normal text-xs border ${getStatusColor(order.currentStatus)}`}>
                                        {order.currentStatus}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-8 text-[15px] text-slate-600">
                                    <div className="flex gap-2">
                                        <span className="text-slate-400 w-24 shrink-0">Customer:</span>
                                        <span className="font-medium text-slate-900">{order.customerName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-slate-400 w-24 shrink-0">Contact:</span>
                                        <span className="font-medium text-slate-900">{order.customerPhone}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-slate-400 w-24 shrink-0">Item Ordered:</span>
                                        <span className="font-medium text-slate-900 whitespace-nowrap">{order.garmentType}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-slate-400 w-24 shrink-0">Pick Up Date:</span>
                                        <span className="font-medium text-red-400">{order.pickupDate}</span>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-300 pt-1">
                                    Created: {new Date(order.createdAt).toLocaleString()}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 border-slate-100">
                                <Link href={`/backoffice/order/${order.id}`}>
                                    <Button className="w-full bg-[#3d3e69] hover:bg-[#2d2e55] text-white text-xs h-8 rounded-lg">
                                        Update Status
                                    </Button>
                                </Link>

                                <Button
                                    variant="outline"
                                    className="w-full text-xs h-8 rounded-lg bg-white border-slate-200 text-slate-700"
                                    onClick={() => copyTrackingLink(order.id)}
                                >
                                    Copy Link
                                </Button>

                                <Link href={`/track/${order.id}`} target="_blank">
                                    <Button variant="outline" className="w-full text-xs h-8 rounded-lg bg-white border-slate-200 text-slate-700">
                                        View Tracking
                                    </Button>
                                </Link>

                                <Button
                                    variant="destructive"
                                    className="w-full text-xs h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white mt-1"
                                    onClick={() => handleDelete(order.id)}
                                >
                                    Delete
                                </Button>
                            </div>

                        </div>
                    </div>
                ))}

                {orders.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        No orders found.
                    </div>
                )}
            </div>
        </div>
    )
}
