"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getOrderWithHistory, riderUpdateStatus } from "@/app/actions/orders"
import { Button } from "@/components/ui/button"
import { 
    Truck, 
    CheckCircle2, 
    ExternalLink, 
    AlertCircle, 
    Copy, 
    Check, 
    Lock,
    ArrowRight
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
    const [verificationCode, setVerificationCode] = useState("")

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
        toast.success("Waybill copied", {
            style: { background: "#000", color: "#fff", border: "none" }
        })
        setTimeout(() => setCopiedWaybill(false), 2000)
    }

    const handleStatusUpdate = async (newStatus: string, code?: string) => {
        if (!order) return
        setIsUpdating(true)
        try {
            const res = await riderUpdateStatus(order.id, newStatus, code)
            if (res.success) {
                toast.success(`Status updated: ${newStatus}`, {
                    style: { background: "#000", color: "#fff", border: "none" }
                })
                setOrder((prev: any) => ({ ...prev, currentStatus: newStatus }))
                setVerificationCode("")
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
            <div className="min-h-screen bg-[#F6F6F8] flex flex-col items-center justify-center p-6 text-center">
                <SignatureLoader />
                <p className="text-xs font-bold text-neutral-500 mt-6 tracking-widest uppercase animate-pulse">
                    Connecting to Dispatch...
                </p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F6F6F8] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-100 flex items-center justify-center text-red-500 mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-black text-neutral-900 tracking-tight">Shipment Not Found</h1>
                <p className="text-xs text-neutral-500 max-w-xs mt-1.5 font-medium">
                    This order link is invalid or has been archived.
                </p>
            </div>
        )
    }

    const currentStatus = order.currentStatus || "Shipment Booked"
    const isDelivered = currentStatus.toLowerCase() === "delivered"

    // Workflow Stepper Definitions
    const steps = [
        { label: "Booked" },
        { label: "Pickup" },
        { label: "In-Transit" },
        { label: "Delivered" }
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
        <div className="min-h-screen bg-[#F6F6F8] text-neutral-900 font-sans flex flex-col justify-between p-5 sm:p-7 selection:bg-black selection:text-white">
            <div className="max-w-md w-full mx-auto space-y-6 pt-2 sm:pt-4">

                {/* 1. TOP HEADER: Vehicle Badge + Live Dot + Waybill # */}
                <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Vehicle Icon Badge */}
                        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
                            <Truck className="w-6 h-6" />
                        </div>

                        {/* Status Dot + Waybill */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span className="text-xl sm:text-2xl font-black tracking-tighter text-black truncate">
                                #{order.orderNumber}
                            </span>
                        </div>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={() => copyToClipboard(order.orderNumber)}
                        className="w-10 h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-black transition-all active:scale-95 shrink-0"
                        title="Copy Waybill Number"
                    >
                        {copiedWaybill ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </motion.div>

                {/* 2. HORIZONTAL TIMELINE STEPPER (Signature Uber Driver Floating Sheet) */}
                <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
                >
                    <div className="flex items-center justify-between relative px-2">
                        {/* Connecting Track Line */}
                        <div className="absolute top-[14px] left-6 right-6 h-[2px] bg-neutral-200 -z-0" />
                        <div 
                            className="absolute top-[14px] left-6 h-[2px] bg-black transition-all duration-700 ease-out -z-0"
                            style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                        />

                        {/* Step Nodes */}
                        {steps.map((step, idx) => {
                            const isPassed = idx < activeStep
                            const isCurrent = idx === activeStep
                            return (
                                <div key={step.label} className="relative z-10 flex flex-col items-center gap-2">
                                    <div 
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                                            isPassed 
                                                ? "bg-black text-white shadow-md shadow-black/10" 
                                                : isCurrent 
                                                ? "bg-black text-white ring-4 ring-black/10 scale-110 shadow-lg shadow-black/20" 
                                                : "bg-white text-neutral-300 border-2 border-neutral-200"
                                        }`}
                                    >
                                        {isPassed ? (
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : isCurrent ? (
                                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-colors ${
                                        isCurrent 
                                            ? "text-black font-black" 
                                            : isPassed 
                                            ? "text-neutral-700 font-bold" 
                                            : "text-neutral-400 font-medium"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* 3. ACTION & VERIFICATION AREA */}
                <div className="space-y-4 pt-1">
                    {isDelivered ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white rounded-3xl p-8 text-center space-y-3 shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-black/[0.04]"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-black uppercase">
                                Delivery Completed
                            </h3>
                            <p className="text-xs text-neutral-500 font-mono">
                                Waybill #{order.orderNumber} successfully handed over
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            {/* Step 0: Confirm Package Pickup */}
                            {activeStep === 0 && (
                                <Button
                                    onClick={() => handleStatusUpdate("Picked Up")}
                                    disabled={isUpdating}
                                    className="w-full h-16 sm:h-20 rounded-3xl bg-black hover:bg-neutral-900 text-white text-base sm:text-lg font-black uppercase tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] border-none flex items-center justify-center gap-3"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>{isUpdating ? "Updating..." : "Confirm Package Pickup"}</span>
                                </Button>
                            )}

                            {/* Step 1: Start Transit */}
                            {activeStep === 1 && (
                                <Button
                                    onClick={() => handleStatusUpdate("In Transit")}
                                    disabled={isUpdating}
                                    className="w-full h-16 sm:h-20 rounded-3xl bg-black hover:bg-neutral-900 text-white text-base sm:text-lg font-black uppercase tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] border-none flex items-center justify-center gap-3"
                                >
                                    <Truck className="w-6 h-6" />
                                    <span>{isUpdating ? "Updating..." : "Start Delivery (In Transit)"}</span>
                                </Button>
                            )}

                            {/* Step 2: Handover Confirmation with Customer Ref Code */}
                            {activeStep >= 2 && (
                                <div className="space-y-4">
                                    {/* Action Button */}
                                    <Button
                                        onClick={() => handleStatusUpdate("Delivered", verificationCode)}
                                        disabled={isUpdating || !verificationCode.trim()}
                                        className="w-full h-16 sm:h-20 rounded-3xl bg-black hover:bg-neutral-900 text-white text-base sm:text-lg font-black uppercase tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] border-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle2 className="w-6 h-6" />
                                        <span>{isUpdating ? "Verifying Code..." : "Confirm Delivery"}</span>
                                    </Button>

                                    {/* Dedicated Code Box */}
                                    <div className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]">
                                        <div className="flex items-center gap-2 px-1 mb-2">
                                            <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 font-mono">
                                                Customer Ref Code
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                            placeholder="ENTER CODE (e.g. 4B2A8C1D)"
                                            maxLength={12}
                                            autoComplete="off"
                                            className="w-full h-14 px-4 text-center font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-black bg-[#F6F6F8] rounded-2xl border border-neutral-200 focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all uppercase placeholder:text-neutral-400 placeholder:font-sans placeholder:tracking-normal placeholder:text-xs placeholder:font-bold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* 4. BOTTOM LINK: Open Public Customer Tracking */}
            <div className="max-w-md w-full mx-auto text-center pt-8 pb-2">
                <Link 
                    href={`/track/${order.id}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-black transition-colors py-2.5 px-5 rounded-full hover:bg-neutral-200/60"
                >
                    <span>Open Public Customer Tracking</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    )
}
