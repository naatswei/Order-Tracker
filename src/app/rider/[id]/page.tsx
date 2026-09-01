"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getOrderWithHistory, riderUpdateStatus } from "@/app/actions/orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Package, 
    MapPin, 
    Navigation, 
    Phone, 
    CheckCircle2, 
    Clock, 
    Truck, 
    ArrowRight, 
    ExternalLink, 
    AlertCircle,
    User,
    FileText
} from "lucide-react"
import { toast } from "sonner"
import { SignatureLoader } from "@/components/signature-loader"
import Link from "next/link"

export default function RiderActionPage() {
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        let isMounted = true
        async function fetchOrder() {
            try {
                const data = await getOrderWithHistory(orderId)
                if (isMounted) {
                    setOrder(data)
                }
            } catch (err) {
                console.error("Failed to load order for rider:", err)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        fetchOrder()
        return () => { isMounted = false }
    }, [orderId])

    const handleStatusUpdate = async (newStatus: string) => {
        if (!order) return
        setIsUpdating(true)
        try {
            const res = await riderUpdateStatus(order.id, newStatus)
            if (res.success) {
                toast.success(`Status updated: ${newStatus}`, {
                    style: { background: "#0F172A", color: "#fff", border: "none" }
                })
                setOrder((prev: any) => ({ ...prev, currentStatus: newStatus }))
            } else {
                toast.error(res.error || "Failed to update status")
            }
        } catch (err: any) {
            toast.error(err.message || "Network error. Please try again.")
        } finally {
            setIsUpdating(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <SignatureLoader />
                <p className="text-xs font-bold text-slate-400 mt-4 tracking-wider uppercase">Loading delivery manifest...</p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-black text-white">Order Not Found</h1>
                <p className="text-xs text-slate-400 max-w-sm mt-2 font-medium">
                    This order link is invalid or the shipment has been deleted.
                </p>
            </div>
        )
    }

    const orderMeta = (typeof order.metadata === "object" && order.metadata !== null) ? order.metadata as Record<string, unknown> : {}
    const pickupLoc = (orderMeta.pickupLocation as string) || ""
    const deliveryLoc = (orderMeta.deliveryLocation as string) || order.measurements || ""
    const currentStatus = order.currentStatus || "Shipment Booked"
    const isDelivered = currentStatus.toLowerCase() === "delivered"

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-sky-500/20">
            {/* Top Bar */}
            <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 shadow-lg">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
                            <Truck className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400 block leading-none mb-0.5">
                                Rider Dispatch Manifest
                            </span>
                            <span className="text-sm font-black text-white tracking-tight">
                                Waybill #{order.orderNumber}
                            </span>
                        </div>
                    </div>
                    <Badge 
                        variant="outline"
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isDelivered 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                : "bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse"
                        }`}
                    >
                        {currentStatus}
                    </Badge>
                </div>
            </div>

            {/* Main Content Container */}
            <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
                
                {/* Package Quick Summary */}
                <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Package Type</span>
                                <span className="text-sm font-black text-white">{order.itemType || "Standard Package"}</span>
                            </div>
                        </div>
                        {order.businessDetails?.name && (
                            <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Origin Store</span>
                                <span className="text-xs font-bold text-slate-300">{order.businessDetails.name}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pickup Location Card */}
                {pickupLoc && (
                    <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                                            1. Pickup Point
                                        </span>
                                        <p className="text-sm font-bold text-white mt-0.5">
                                            {pickupLoc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-1">
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLoc)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all shadow-sm"
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>Open GPS Route to Pickup</span>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Delivery Destination Card */}
                {deliveryLoc && (
                    <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                                        <MapPin className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 block">
                                            2. Delivery Destination
                                        </span>
                                        <p className="text-sm font-bold text-white mt-0.5">
                                            {deliveryLoc}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer & Call Action */}
                            <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300">
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-white block">{order.customerName}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</span>
                                    </div>
                                </div>
                                {order.customerPhone && (
                                    <a
                                        href={`tel:${order.customerPhone}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>Call</span>
                                    </a>
                                )}
                            </div>

                            {/* Turn-by-Turn GPS Button */}
                            <div className="pt-1">
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryLoc)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>Open GPS Route to Destination</span>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Special Instructions (if present and distinct) */}
                {order.measurements && order.measurements !== deliveryLoc && (
                    <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                            Special Instructions
                        </span>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            {order.measurements}
                        </p>
                    </Card>
                )}

                {/* Primary Action Button Bar */}
                <div className="pt-2 space-y-3">
                    {isDelivered ? (
                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Delivery Completed</h3>
                            <p className="text-[11px] text-emerald-300/80 font-medium">Waybill #{order.orderNumber} is marked as delivered.</p>
                        </div>
                    ) : (
                        <>
                            {/* Step-by-Step Rider Action */}
                            {currentStatus === "Shipment Booked" && (
                                <Button
                                    onClick={() => handleStatusUpdate("Picked Up")}
                                    disabled={isUpdating}
                                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {isUpdating ? "Updating..." : "Confirm Package Picked Up"}
                                </Button>
                            )}

                            {currentStatus === "Picked Up" && (
                                <Button
                                    onClick={() => handleStatusUpdate("In Transit")}
                                    disabled={isUpdating}
                                    className="w-full h-14 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black uppercase tracking-wider shadow-xl shadow-sky-500/20 transition-all active:scale-95"
                                >
                                    <Truck className="w-5 h-5 mr-2" />
                                    {isUpdating ? "Updating..." : "Start Delivery (In Transit)"}
                                </Button>
                            )}

                            {(currentStatus === "In Transit" || currentStatus === "Dispatched") && (
                                <Button
                                    onClick={() => handleStatusUpdate("Delivered")}
                                    disabled={isUpdating}
                                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {isUpdating ? "Completing Delivery..." : "Confirm Delivered to Customer"}
                                </Button>
                            )}

                            {/* Fallback direct Deliver button if in any other non-delivered status */}
                            {currentStatus !== "Shipment Booked" && currentStatus !== "Picked Up" && currentStatus !== "In Transit" && currentStatus !== "Dispatched" && (
                                <Button
                                    onClick={() => handleStatusUpdate("Delivered")}
                                    disabled={isUpdating}
                                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {isUpdating ? "Completing Delivery..." : "Confirm Delivered"}
                                </Button>
                            )}
                        </>
                    )}

                    {/* Secondary Link to Customer Tracking */}
                    <div className="text-center pt-2">
                        <Link 
                            href={`/track/${order.id}`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <span>View Public Customer Tracking & Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    )
}
