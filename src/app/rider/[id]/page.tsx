"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getOrderWithHistory, riderUpdateStatus, riderCollectCashPayment } from "@/app/actions/orders"
import { initiateMomoCharge } from "@/app/actions/paystack"
import { detectGhanaNetworkProvider } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { 
    Truck, 
    CheckCircle2, 
    ExternalLink, 
    AlertCircle, 
    Copy, 
    Check, 
    Lock,
    ArrowRight,
    Phone,
    DollarSign,
    Banknote,
    Navigation,
    MapPin,
    ShieldCheck,
    Loader2
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
    const [isCollectingCash, setIsCollectingCash] = useState(false)
    const [copiedWaybill, setCopiedWaybill] = useState(false)
    const [verificationCode, setVerificationCode] = useState("")

    // Momo Prompt modal state
    const [isMomoModalOpen, setIsMomoModalOpen] = useState(false)
    const [momoPhone, setMomoPhone] = useState("")
    const [momoProvider, setMomoProvider] = useState<'mtn' | 'vod' | 'atl'>("mtn")
    const [isMomoCharging, setIsMomoCharging] = useState(false)

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

    // Auto-detect Momo network provider from phone number
    useEffect(() => {
        if (momoPhone) {
            const detected = detectGhanaNetworkProvider(momoPhone);
            if (detected) {
                setMomoProvider(detected);
            }
        }
    }, [momoPhone]);

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

    const handleCashCollection = async () => {
        if (!order) return
        setIsCollectingCash(true)
        try {
            const res = await riderCollectCashPayment(order.id)
            if (res.success) {
                toast.success("Cash payment recorded successfully!", {
                    style: { background: "#000", color: "#fff", border: "none" }
                })
                const updated = await getOrderWithHistory(orderId)
                setOrder(updated)
            } else {
                toast.error(res.error || "Failed to record cash payment")
            }
        } catch (err: any) {
            toast.error("Network error. Please try again.")
        } finally {
            setIsCollectingCash(false)
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
    const meta = (order.metadata as Record<string, unknown>) || {}
    const pickupLoc = (meta.pickupLocation as string) || null
    const deliveryLoc = (meta.deliveryLocation as string) || null
    const recipientName = (meta.recipientName as string) || null
    const recipientPhone = (meta.recipientPhone as string) || null
    
    // Invoicing & Payment on Arrival Data
    const invoice = (meta.invoice as any) || null
    const isInvoiceUnpaid = invoice && invoice.invoiceStatus === "unpaid" && Number(invoice.amountDue || 0) > 0
    const isInvoicePaid = invoice && invoice.invoiceStatus === "paid"
    const amountDue = Number(invoice?.amountDue || 0)

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
        <div className="min-h-screen bg-[#F6F6F8] text-neutral-900 font-sans flex flex-col justify-between p-4 sm:p-7 selection:bg-black selection:text-white">
            <div className="max-w-md w-full mx-auto space-y-4 sm:space-y-6 pt-2 sm:pt-4">

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

                {/* 2. HORIZONTAL TIMELINE STEPPER */}
                <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
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

                {/* 3. ROUTE & DESTINATION CARD */}
                {(pickupLoc || deliveryLoc) && (
                    <motion.div 
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-3"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                            <Navigation className="w-3.5 h-3.5 text-black" />
                            <span>Route Details</span>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            {pickupLoc && (
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-neutral-400">PICKUP ADDRESS</p>
                                        <p className="font-bold text-neutral-900 break-words">{pickupLoc}</p>
                                    </div>
                                </div>
                            )}
                            {deliveryLoc && (
                                <div className="flex items-start gap-2.5 min-w-0 pt-1 border-t border-neutral-100">
                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-neutral-400">DELIVERY DESTINATION</p>
                                        <p className="font-bold text-neutral-900 break-words">{deliveryLoc}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 4. PAYMENT ON ARRIVAL CARD (If invoice exists) */}
                {isInvoiceUnpaid && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-md shadow-amber-500/5 space-y-3.5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                                        Payment on Arrival Required
                                    </p>
                                    <p className="text-lg sm:text-xl font-black text-black">
                                        GH₵ {amountDue.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                                Unpaid
                            </span>
                        </div>

                        <p className="text-[11px] text-amber-950 font-medium">
                            Collect payment before or upon handover. Customer can pay via Momo prompt or cash.
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* Prompt Momo Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setMomoPhone(recipientPhone || order.customerPhone || "")
                                    setIsMomoModalOpen(true)
                                }}
                                className="p-3 rounded-2xl bg-black hover:bg-neutral-900 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                                <DollarSign className="w-4 h-4 text-amber-400" />
                                <span>Prompt Momo</span>
                            </button>

                            {/* Confirm Cash Received Button */}
                            <button
                                type="button"
                                onClick={handleCashCollection}
                                disabled={isCollectingCash}
                                className="p-3 rounded-2xl bg-white hover:bg-neutral-50 text-black font-black text-xs uppercase tracking-wider border-2 border-black/10 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
                            >
                                <Banknote className="w-4 h-4 text-emerald-600" />
                                <span>{isCollectingCash ? "Recording..." : "Cash Received"}</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {isInvoicePaid && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 border border-emerald-200 rounded-3xl p-3.5 sm:p-4 flex items-center justify-between gap-2 shadow-2xs"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                    Payment Confirmed
                                </p>
                                <p className="text-xs sm:text-sm font-black text-emerald-950 truncate">
                                    GH₵ {Number(invoice.amountPaid || invoice.amountDue || 0).toFixed(2)} Paid ({invoice.paymentCollectedBy === "rider_cash" ? "Cash Collected" : "Online/Momo"})
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase shrink-0">
                            Paid
                        </span>
                    </motion.div>
                )}

                {/* 5. ACTION & VERIFICATION AREA */}
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

                            {/* Step 2: Handover Confirmation with Customer Numeric Delivery PIN */}
                            {activeStep >= 2 && (
                                <div className="space-y-4">
                                    {/* Dropoff Customer Contact Quick Call */}
                                    {(recipientPhone || order.customerPhone) && (
                                        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black font-black shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                                                        {recipientName ? "Dropoff Recipient" : "Customer Contact"}
                                                    </span>
                                                    <span className="text-xs font-black text-black truncate block">
                                                        {recipientName || order.customerName} ({recipientPhone || order.customerPhone})
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`tel:${recipientPhone || order.customerPhone}`}
                                                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0 shadow-sm"
                                            >
                                                Call
                                            </a>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <Button
                                        onClick={() => handleStatusUpdate("Delivered", verificationCode)}
                                        disabled={isUpdating || !verificationCode.trim()}
                                        className="w-full h-16 sm:h-20 rounded-3xl bg-black hover:bg-neutral-900 text-white text-base sm:text-lg font-black uppercase tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] border-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle2 className="w-6 h-6" />
                                        <span>{isUpdating ? "Verifying PIN..." : "Confirm Delivery"}</span>
                                    </Button>

                                    {/* Dedicated Numeric OTP Box */}
                                    <div className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]">
                                        <div className="flex items-center gap-2 px-1 mb-2">
                                            <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 font-mono">
                                                Customer Delivery PIN (OTP)
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                            placeholder="ENTER 4-DIGIT PIN"
                                            maxLength={6}
                                            autoComplete="one-time-code"
                                            className="w-full h-14 px-4 text-center font-mono text-2xl font-black tracking-[0.35em] text-black bg-[#F6F6F8] rounded-2xl border border-neutral-200 focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all placeholder:text-neutral-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-xs placeholder:font-bold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* 6. BOTTOM LINK: Open Public Customer Tracking */}
            <div className="max-w-md w-full mx-auto text-center pt-8 pb-2">
                <Link 
                    href={`/track/${order.id}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-black transition-colors py-2.5 px-5 rounded-full hover:bg-neutral-200/60"
                >
                    <span>Open Public Customer Tracking</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Momo Direct Payment Prompt Modal for Rider */}
            <Dialog open={isMomoModalOpen} onOpenChange={setIsMomoModalOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-white shadow-2xl rounded-3xl p-5 sm:p-6 overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Prompt Customer Momo
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    Sends direct USSD PIN prompt for GH₵ {amountDue.toFixed(2)}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="riderMomoPhone" className="text-xs font-bold text-slate-700">Customer Momo Number</Label>
                            <Input 
                                id="riderMomoPhone"
                                value={momoPhone} 
                                onChange={(e) => setMomoPhone(e.target.value)} 
                                placeholder="e.g. 0244000000" 
                                className="h-11 rounded-2xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-semibold text-slate-900"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="riderMomoProvider" className="text-xs font-bold text-slate-700">Network Provider</Label>
                            <Select 
                                value={momoProvider} 
                                onValueChange={(val: 'mtn' | 'vod' | 'atl') => setMomoProvider(val)}
                                disabled={!!detectGhanaNetworkProvider(momoPhone)}
                            >
                                <SelectTrigger id="riderMomoProvider" className="h-11 rounded-2xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-bold text-slate-900">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-200 shadow-xl bg-white">
                                     <SelectItem value="mtn" className="rounded-xl font-bold">MTN Ghana</SelectItem>
                                     <SelectItem value="vod" className="rounded-xl font-bold">Telecel (Vodafone)</SelectItem>
                                     <SelectItem value="atl" className="rounded-xl font-bold">AT (AirtelTigo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="mt-5 flex flex-col gap-2">
                        <Button
                            type="button"
                            disabled={isMomoCharging || !momoPhone}
                            onClick={async () => {
                                setIsMomoCharging(true)
                                try {
                                    const res = await initiateMomoCharge(orderId, momoPhone, momoProvider)
                                    if (res.success) {
                                        toast.success("Momo Prompt sent to customer! Ask them to approve on their phone.")
                                        setIsMomoModalOpen(false)
                                    } else {
                                        toast.error(`Could not trigger prompt: ${res.error}`)
                                    }
                                } catch (e) {
                                    toast.error("An error occurred while triggering the prompt.")
                                } finally {
                                    setIsMomoCharging(false)
                                }
                            }}
                            className="w-full text-white rounded-2xl h-11 sm:h-12 font-bold text-xs sm:text-sm shadow-md bg-black hover:bg-neutral-800 border-0"
                        >
                            {isMomoCharging ? "Sending Prompt..." : `Send Prompt (GH₵ ${amountDue.toFixed(2)})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
