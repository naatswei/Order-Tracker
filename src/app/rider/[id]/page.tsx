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
    FileText,
    Copy,
    Check,
    Radio,
    ShieldCheck,
    Sparkles,
    ChevronRight,
    Map
} from "lucide-react"
import { toast } from "sonner"
import { SignatureLoader } from "@/components/signature-loader"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export default function RiderActionPage() {
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const [copiedWaybill, setCopiedWaybill] = useState(false)

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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedWaybill(true)
        toast.success("Waybill copied to clipboard")
        setTimeout(() => setCopiedWaybill(false), 2000)
    }

    const handleStatusUpdate = async (newStatus: string) => {
        if (!order) return
        setIsUpdating(true)
        try {
            const res = await riderUpdateStatus(order.id, newStatus)
            if (res.success) {
                toast.success(`Status updated to: ${newStatus}`, {
                    style: { background: "#0F172A", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }
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
            <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-6 text-center">
                <SignatureLoader />
                <p className="text-sm font-black text-sky-400 mt-6 tracking-widest uppercase animate-pulse">
                    Connecting to Dispatch...
                </p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 shadow-2xl">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Order Not Found</h1>
                <p className="text-sm text-slate-400 max-w-sm mt-2 font-medium">
                    This order link is invalid or the shipment has been archived.
                </p>
            </div>
        )
    }

    const orderMeta = (typeof order.metadata === "object" && order.metadata !== null) ? order.metadata as Record<string, unknown> : {}
    const pickupLoc = (orderMeta.pickupLocation as string) || ""
    const deliveryLoc = (orderMeta.deliveryLocation as string) || order.measurements || ""
    const currentStatus = order.currentStatus || "Shipment Booked"
    const isDelivered = currentStatus.toLowerCase() === "delivered"

    // Workflow Step Index
    const steps = [
        { label: "Booked", match: ["shipment booked", "order received", "booked"] },
        { label: "Picked Up", match: ["picked up", "sorting", "arriving at facility"] },
        { label: "In Transit", match: ["in transit", "dispatched", "out for delivery"] },
        { label: "Delivered", match: ["delivered", "completed"] }
    ]

    const getActiveStepIndex = () => {
        const lower = currentStatus.toLowerCase()
        if (lower === "delivered" || lower === "completed") return 3
        if (lower === "in transit" || lower === "dispatched" || lower === "out for delivery") return 2
        if (lower === "picked up" || lower === "sorting" || lower === "arriving at facility") return 1
        return 0
    }

    const activeStep = getActiveStepIndex()

    return (
        <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans pb-24 selection:bg-sky-500/30">
            {/* Top Navigation / Status Header */}
            <header className="sticky top-0 z-50 bg-[#0B101E]/95 backdrop-blur-2xl border-b border-white/10 px-4 py-3.5 shadow-2xl">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 truncate">
                                    Active Delivery Run
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-base font-black text-white tracking-tight truncate">
                                    #{order.orderNumber}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(order.orderNumber)}
                                    className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                                    title="Copy Waybill"
                                >
                                    {copiedWaybill ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm border ${
                            isDelivered 
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                                : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? "bg-emerald-400" : "bg-sky-400 animate-pulse"}`} />
                            {currentStatus}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 pt-5 space-y-4">

                {/* Modern Step Progress Tracker */}
                <div className="p-4 rounded-3xl bg-[#0D1426] border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-800 -z-0" />
                        <div 
                            className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500 -z-0"
                            style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                        />

                        {steps.map((step, idx) => {
                            const isPassed = idx < activeStep
                            const isCurrent = idx === activeStep
                            return (
                                <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                        isPassed 
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                                            : isCurrent 
                                            ? "bg-sky-500 text-white ring-4 ring-sky-500/30 scale-110 shadow-lg shadow-sky-500/40" 
                                            : "bg-slate-800 text-slate-400 border border-slate-700"
                                    }`}>
                                        {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-tight ${
                                        isCurrent ? "text-white font-black" : isPassed ? "text-slate-300" : "text-slate-500"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Package Card */}
                <div className="p-4 rounded-3xl bg-[#0D1426] border border-white/10 shadow-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                            <Package className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                Shipment Contents
                            </span>
                            <h3 className="text-base font-black text-white truncate mt-0.5">
                                {order.itemType || "Standard Package"}
                            </h3>
                        </div>
                    </div>
                    {order.businessDetails?.name && (
                        <div className="text-right shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                Dispatch Hub
                            </span>
                            <span className="text-xs font-bold text-slate-200 block mt-0.5 max-w-[120px] truncate">
                                {order.businessDetails.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* STEP 1: PICKUP POINT CARD */}
                {pickupLoc && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-3xl border transition-all shadow-xl space-y-4 ${
                            activeStep === 0 
                                ? "bg-gradient-to-b from-emerald-950/40 to-[#0D1426] border-emerald-500/40 ring-1 ring-emerald-500/30" 
                                : "bg-[#0D1426] border-white/10 opacity-80"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                    Step 1 • Collection Point
                                </span>
                            </div>
                            {activeStep > 0 && (
                                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> Collected
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-lg font-black text-white leading-snug">
                                {pickupLoc}
                            </p>
                        </div>

                        {/* High-visibility Turn-by-Turn GPS Button */}
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLoc)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all active:scale-95"
                        >
                            <Navigation className="w-5 h-5" />
                            <span>Navigate to Pickup (GPS)</span>
                        </a>
                    </motion.div>
                )}

                {/* STEP 2: DELIVERY DESTINATION CARD */}
                {deliveryLoc && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-3xl border transition-all shadow-xl space-y-4 ${
                            activeStep >= 1 && !isDelivered
                                ? "bg-gradient-to-b from-sky-950/40 to-[#0D1426] border-sky-500/40 ring-1 ring-sky-500/30" 
                                : "bg-[#0D1426] border-white/10"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-400">
                                    Step 2 • Customer Destination
                                </span>
                            </div>
                            {isDelivered && (
                                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> Delivered
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-xl font-black text-white leading-snug tracking-tight">
                                {deliveryLoc}
                            </p>
                        </div>

                        {/* Customer Info & 1-Tap Call */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 font-black">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-sm font-black text-white block truncate">
                                        {order.customerName}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-400 block">
                                        {order.customerPhone}
                                    </span>
                                </div>
                            </div>

                            {order.customerPhone && (
                                <a
                                    href={`tel:${order.customerPhone}`}
                                    className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 shrink-0"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span>Call</span>
                                </a>
                            )}
                        </div>

                        {/* High-visibility Turn-by-Turn GPS Button */}
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryLoc)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-14 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-sky-600/30 transition-all active:scale-95"
                        >
                            <Navigation className="w-5 h-5" />
                            <span>Navigate to Destination (GPS)</span>
                        </a>
                    </motion.div>
                )}

                {/* Special Delivery Instructions */}
                {order.measurements && order.measurements !== deliveryLoc && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                            Special Instructions
                        </span>
                        <p className="text-xs font-bold text-amber-200/90 leading-relaxed">
                            {order.measurements}
                        </p>
                    </div>
                )}

                {/* PRIMARY DISPATCH ACTION BUTTON BAR */}
                <div className="pt-3 space-y-3">
                    {isDelivered ? (
                        <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/60 to-[#0D1426] border border-emerald-500/40 text-center space-y-2 shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">
                                Delivery Completed
                            </h3>
                            <p className="text-xs text-emerald-300/80 font-medium">
                                Waybill #{order.orderNumber} is marked as delivered in the dispatch hub.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Step 1 Action: Pick up package */}
                            {activeStep === 0 && (
                                <Button
                                    onClick={() => handleStatusUpdate("Picked Up")}
                                    disabled={isUpdating}
                                    className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black uppercase tracking-wider shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-slate-950" />
                                    {isUpdating ? "Updating..." : "Confirm Package Picked Up"}
                                </Button>
                            )}

                            {/* Step 2 Action: Start Transit */}
                            {activeStep === 1 && (
                                <Button
                                    onClick={() => handleStatusUpdate("In Transit")}
                                    disabled={isUpdating}
                                    className="w-full h-16 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-black uppercase tracking-wider shadow-2xl shadow-sky-500/30 transition-all active:scale-95"
                                >
                                    <Truck className="w-5 h-5 mr-2 text-slate-950" />
                                    {isUpdating ? "Updating..." : "Start Delivery (In Transit)"}
                                </Button>
                            )}

                            {/* Step 3 Action: Complete Delivery */}
                            {activeStep >= 2 && (
                                <Button
                                    onClick={() => handleStatusUpdate("Delivered")}
                                    disabled={isUpdating}
                                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 text-sm font-black uppercase tracking-wider shadow-2xl shadow-emerald-500/40 transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-slate-950" />
                                    {isUpdating ? "Finalizing Delivery..." : "Confirm Delivered to Customer"}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Customer Receipt / Tracking Link */}
                    <div className="text-center pt-2">
                        <Link 
                            href={`/track/${order.id}`}
                            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/[0.03] px-4 py-2.5 rounded-xl border border-white/5"
                        >
                            <span>Open Public Customer Receipt / Tracking</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

            </main>
        </div>
    )
}
