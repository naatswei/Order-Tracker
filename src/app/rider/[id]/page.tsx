"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { getOrderWithHistory, riderUpdateStatus, riderCollectCashPayment } from "@/app/actions/orders"
import { initiateMomoCharge } from "@/app/actions/paystack"
import { initiateBulkClixMomoCollection } from "@/app/actions/bulkclix-payment"
import { submitRiderMessage, getThreadMessages, updateTypingStatus, getTypingStatus } from "@/app/actions/messages"
import { detectGhanaNetworkProvider } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    AlertCircle, 
    Copy, 
    Check, 
    Lock,
    Phone,
    Banknote,
    Navigation,
    ShieldCheck,
    Compass,
    MessageSquare,
    Send,
    X,
    User,
    Building2,
    MessageSquareMore,
    Loader2
} from "lucide-react"
import { toast } from "sonner"
import { SignatureLoader } from "@/components/signature-loader"
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
    const [customMomoAmount, setCustomMomoAmount] = useState("")
    const [isMomoCharging, setIsMomoCharging] = useState(false)

    // In-app chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [chatMessages, setChatMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState("")
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [isPartyTyping, setIsPartyTyping] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

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
            const res = await riderCollectCashPayment(order.id, amountDue > 0 ? amountDue : undefined)
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

    const getGoogleMapsUrl = (location: string) => {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    }

    // Polling chat messages
    useEffect(() => {
        if (!order?.id) return

        const loadChat = async () => {
            try {
                const res = await getThreadMessages(order.id)
                if (res.messages) {
                    const prevCount = chatMessages.length
                    if (res.messages.length !== prevCount) {
                        setChatMessages(res.messages)
                        if (res.messages.length > prevCount && prevCount > 0) {
                            const latest = res.messages[res.messages.length - 1]
                            if (latest.sender !== "rider") {
                                toast.success("New message on dispatch thread!", {
                                    style: { background: "#000", color: "#fff", border: "none" }
                                })
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load chat for rider:", err)
            }
        }

        loadChat()
        const interval = setInterval(loadChat, 3000)
        return () => clearInterval(interval)
    }, [order?.id, chatMessages.length])

    // Polling typing status
    useEffect(() => {
        if (!order?.id || !chatOpen) {
            setIsPartyTyping(false)
            return
        }

        const pollTyping = async () => {
            const res = await getTypingStatus(order.id)
            if (res.statuses) {
                const otherPartyTyping = res.statuses.some((s: any) => s.sender !== "rider")
                setIsPartyTyping(otherPartyTyping)
            }
        }

        pollTyping()
        const interval = setInterval(pollTyping, 2000)
        return () => clearInterval(interval)
    }, [order?.id, chatOpen])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }, [chatMessages, chatOpen])

    const handleSendRiderMessage = async () => {
        if (!chatInput.trim() || !order?.id) return

        const messageText = chatInput.trim()
        const existingThread = chatMessages.length > 0 ? chatMessages[0].threadId : undefined

        const tempMsg = {
            id: `temp-${Date.now()}`,
            orderId: order.id,
            sender: "rider",
            senderName: "Rider",
            message: messageText,
            isRead: "false",
            createdAt: new Date().toISOString()
        }

        setChatMessages(prev => [...prev, tempMsg])
        setChatInput("")
        setIsSendingMessage(true)

        try {
            const res = await submitRiderMessage({
                orderId: order.id,
                message: messageText,
                threadId: existingThread
            })
            if (res.error) {
                toast.error(res.error)
                setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id))
            }
        } catch (err: any) {
            toast.error("Failed to send message")
            setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        } finally {
            setIsSendingMessage(false)
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
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h1 className="text-lg font-black text-black">Delivery Not Found</h1>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    This order link is invalid or has been archived.
                </p>
            </div>
        )
    }

    const currentStatus = order.currentStatus || "Shipment Booked"
    const isDelivered = ["delivered", "completed"].includes(currentStatus.toLowerCase())
    const meta = (order.metadata as Record<string, unknown>) || {}
    const pickupLoc = (meta.pickupLocation as string) || null
    const deliveryLoc = (meta.deliveryLocation as string) || null
    const recipientName = (meta.recipientName as string) || null
    const recipientPhone = (meta.recipientPhone as string) || null
    const pickupCustomerName = order.customerName || "Sender"
    const pickupCustomerPhone = order.customerPhone || ""

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
    const isPickupStage = activeStep <= 1
    const isDeliveryStage = activeStep >= 2

    // Stage-determined target customer for the rider (Pickup customer during pickup, Dropoff customer during transit/delivery)
    const targetCustomerName = isPickupStage 
        ? pickupCustomerName 
        : (recipientName || pickupCustomerName || "Recipient")

    const targetCustomerPhone = isPickupStage 
        ? pickupCustomerPhone 
        : (recipientPhone || pickupCustomerPhone || "")

    const targetCustomerRole = isPickupStage ? "Pickup Customer (Sender)" : "Dropoff Customer (Recipient)"
    const targetFirstName = targetCustomerName.trim().split(' ')[0]
    const contactPhone = targetCustomerPhone
    const contactName = targetCustomerName
    
    // Invoicing & Payment on Arrival Data
    const invoice = (meta.invoice as any) || null
    const amountDue = Number(invoice?.amountDue ?? meta.deliveryFee ?? meta.amountDue ?? meta.packagePrice ?? meta.total ?? 0)
    const isInvoicePaid = invoice && invoice.invoiceStatus === "paid" && amountDue > 0
    const isInvoiceUnpaid = !isInvoicePaid && !isDelivered && amountDue > 0

    return (
        <div className="min-h-screen bg-[#F6F6F8] text-neutral-900 font-sans flex flex-col justify-start p-3 sm:p-6 selection:bg-black selection:text-white">
            <div className="max-w-md w-full mx-auto space-y-3.5 sm:space-y-5 pt-1 sm:pt-3 pb-8">

                {/* 1. TOP HEADER: Vehicle Badge + Waybill # */}
                <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between bg-white rounded-3xl p-3.5 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Vehicle Icon Badge */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
                            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>

                        {/* Waybill # & Status */}
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg sm:text-2xl font-black tracking-tighter text-black truncate">
                                #{order.orderNumber}
                            </span>
                            {isDelivered && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                                    Delivered
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Copy Waybill Button */}
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
                    className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
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
                                <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2">
                                    <div 
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                                            isPassed || (isDelivered && idx === 3)
                                                ? "bg-black text-white shadow-md shadow-black/10" 
                                                : isCurrent 
                                                    ? "bg-black text-white shadow-md shadow-black/20 ring-4 ring-neutral-200" 
                                                    : "bg-white text-neutral-400 border-2 border-neutral-300"
                                        }`}
                                    >
                                        {isPassed || (isDelivered && idx === 3) ? (
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : (
                                            idx + 1
                                        )}
                                    </div>
                                    <span className={`text-[10px] sm:text-xs font-bold tracking-tight transition-colors duration-300 ${
                                        isCurrent ? "text-black font-black" : isPassed ? "text-neutral-700" : "text-neutral-400"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* 3. ROUTE DETAILS CARD */}
                {(pickupLoc || deliveryLoc) && (
                    <motion.div 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-black">Delivery Route</span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-700">
                                <Compass className="w-3.5 h-3.5 text-black" />
                                <span>Navigation</span>
                            </div>
                        </div>

                        <div className="space-y-3.5">
                            {/* Pickup Point */}
                            {pickupLoc && (
                                <div className="space-y-2 p-3 rounded-2xl bg-neutral-50/80 border border-black/[0.04]">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Pickup Address</p>
                                        <p className="font-bold text-neutral-900 text-xs sm:text-sm break-words mt-0.5">{pickupLoc}</p>
                                    </div>
                                    <div className="flex justify-center pt-1">
                                        {isDelivered ? (
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 text-neutral-400 text-xs font-bold cursor-not-allowed select-none">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Pickup Completed</span>
                                            </span>
                                        ) : (
                                            <a
                                                href={getGoogleMapsUrl(pickupLoc)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                                            >
                                                <Navigation className="w-3.5 h-3.5 text-white" />
                                                <span>Navigate in Google Maps</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Delivery Destination Point */}
                            {deliveryLoc && (
                                <div className="space-y-2 p-3 rounded-2xl bg-neutral-50/80 border border-black/[0.04]">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Drop-off Destination</p>
                                        <p className="font-bold text-neutral-900 text-xs sm:text-sm break-words mt-0.5">{deliveryLoc}</p>
                                    </div>
                                    <div className="flex justify-center pt-1">
                                        {isDelivered ? (
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold cursor-not-allowed select-none">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Delivered</span>
                                            </span>
                                        ) : (
                                            <a
                                                href={getGoogleMapsUrl(deliveryLoc)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                                            >
                                                <Navigation className="w-3.5 h-3.5 text-white" />
                                                <span>Navigate in Google Maps</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 4. PAYMENT ON ARRIVAL CARD (GH₵ Ghana Cedis) */}
                {isInvoiceUnpaid && amountDue > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-md shadow-amber-500/5 space-y-3.5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                                    <Banknote className="w-5 h-5" />
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
                            Collect payment before or upon handover. Customer can pay via Mobile Money prompt or cash.
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* Prompt Momo Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setMomoPhone(contactPhone)
                                    setCustomMomoAmount(amountDue > 0 ? String(amountDue) : "")
                                    setIsMomoModalOpen(true)
                                }}
                                className="p-3 rounded-2xl bg-black hover:bg-neutral-900 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                                <Banknote className="w-4 h-4 text-amber-400" />
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

                {isInvoicePaid && amountDue > 0 && (
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
                                    GH₵ {Number(invoice?.amountPaid || invoice?.amountDue || amountDue || 0).toFixed(2)} Paid ({invoice?.paymentCollectedBy === "rider_cash" ? "Cash Collected" : "Online / Momo"})
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase shrink-0">
                            Paid
                        </span>
                    </motion.div>
                )}

                {/* 5. ACTION & DELIVERY PIN VERIFICATION AREA */}
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
                            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-400">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>All interface actions disabled</span>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-3.5">
                            {/* Step 0: Confirm Package Pickup */}
                            {activeStep === 0 && (
                                <div className="space-y-3.5">
                                    {pickupCustomerPhone && (
                                        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black font-black shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                                                        Pickup Customer (Sender)
                                                    </span>
                                                    <span className="text-xs font-black text-black truncate block">
                                                        {pickupCustomerName} ({pickupCustomerPhone})
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`tel:${pickupCustomerPhone}`}
                                                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
                                            >
                                                Call
                                            </a>
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => handleStatusUpdate("Picked Up")}
                                        disabled={isUpdating}
                                        className="w-full h-14 sm:h-16 rounded-2xl bg-black hover:bg-neutral-900 text-white text-sm sm:text-base font-black uppercase tracking-wider shadow-lg shadow-black/15 transition-all active:scale-[0.98] border-none flex items-center justify-center gap-2.5"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>{isUpdating ? "Updating..." : "Confirm Package Pickup"}</span>
                                    </Button>
                                </div>
                            )}

                            {/* Step 1: Start Transit */}
                            {activeStep === 1 && (
                                <div className="space-y-3.5">
                                    {pickupCustomerPhone && (
                                        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black font-black shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                                                        Pickup Customer (Sender)
                                                    </span>
                                                    <span className="text-xs font-black text-black truncate block">
                                                        {pickupCustomerName} ({pickupCustomerPhone})
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`tel:${pickupCustomerPhone}`}
                                                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
                                            >
                                                Call
                                            </a>
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => handleStatusUpdate("In Transit")}
                                        disabled={isUpdating}
                                        className="w-full h-14 sm:h-16 rounded-2xl bg-black hover:bg-neutral-900 text-white text-sm sm:text-base font-black uppercase tracking-wider shadow-lg shadow-black/15 transition-all active:scale-[0.98] border-none flex items-center justify-center gap-2.5"
                                    >
                                        <Truck className="w-5 h-5" />
                                        <span>{isUpdating ? "Updating..." : "Start Delivery (In Transit)"}</span>
                                    </Button>
                                </div>
                            )}

                            {/* Step 2: Handover Confirmation with Customer Numeric Delivery PIN */}
                            {activeStep >= 2 && (
                                <div className="space-y-3.5">
                                    {/* Dropoff Customer Contact Quick Call */}
                                    {contactPhone && (
                                        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black font-black shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                                                        Dropoff Customer (Recipient)
                                                    </span>
                                                    <span className="text-xs font-black text-black truncate block">
                                                        {targetCustomerName} ({contactPhone})
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`tel:${contactPhone}`}
                                                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
                                            >
                                                Call
                                            </a>
                                        </div>
                                    )}

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

                                    {/* Action Button */}
                                    <Button
                                        onClick={() => handleStatusUpdate("Delivered", verificationCode)}
                                        disabled={isUpdating || !verificationCode.trim()}
                                        className="w-full h-14 sm:h-16 rounded-2xl bg-black hover:bg-neutral-900 text-white text-sm sm:text-base font-black uppercase tracking-wider shadow-lg shadow-black/15 transition-all active:scale-[0.98] border-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>{isUpdating ? "Verifying PIN..." : "Confirm Delivery"}</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Momo Direct Payment Prompt Modal for Rider */}
            <Dialog open={isMomoModalOpen} onOpenChange={setIsMomoModalOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-white shadow-2xl rounded-3xl p-5 sm:p-6 overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Prompt Customer Momo
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    Sends instant USSD PIN prompt to customer phone
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="riderMomoAmount" className="text-xs font-bold text-slate-700">Amount to Charge (GH₵)</Label>
                            <Input 
                                id="riderMomoAmount"
                                type="number"
                                step="0.01"
                                min="0.1"
                                value={customMomoAmount} 
                                onChange={(e) => setCustomMomoAmount(e.target.value)} 
                                placeholder={amountDue > 0 ? amountDue.toFixed(2) : "0.00"} 
                                className="h-11 rounded-2xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-semibold text-slate-900"
                            />
                        </div>

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
                            disabled={isMomoCharging || !momoPhone || (parseFloat(customMomoAmount || String(amountDue || 0)) <= 0)}
                            onClick={async () => {
                                const chargeAmount = parseFloat(customMomoAmount) || amountDue || 0
                                if (chargeAmount <= 0) {
                                    toast.error("Please enter a valid amount to charge.")
                                    return
                                }
                                setIsMomoCharging(true)
                                try {
                                    // Primary gateway: BulkClix instant collection
                                    let res: any = await initiateBulkClixMomoCollection(orderId, momoPhone, momoProvider, chargeAmount)
                                    // Fallback: Paystack charge
                                    if (!res.success) {
                                        console.warn("BulkClix MoMo prompt failed, attempting Paystack fallback:", res.error)
                                        res = await initiateMomoCharge(orderId, momoPhone, momoProvider, chargeAmount)
                                    }

                                    if (res.success) {
                                        toast.success("Momo Prompt sent to customer! Ask them to approve on their phone.")
                                        setIsMomoModalOpen(false)
                                        const updated = await getOrderWithHistory(orderId)
                                        setOrder(updated)
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
                            {isMomoCharging ? "Sending Prompt..." : `Send Prompt (${(parseFloat(customMomoAmount) || amountDue) > 0 ? `GH₵ ${(parseFloat(customMomoAmount) || amountDue).toFixed(2)}` : "Enter Amount"})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Floating Dispatch & Customer Chat Box */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {chatOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-[calc(100vw-32px)] max-w-[360px] sm:w-[380px] bg-white rounded-3xl border border-black/[0.08] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col"
                            style={{ height: '460px' }}
                        >
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-black/[0.06] bg-neutral-50">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs font-black text-black block truncate">
                                            {isPickupStage ? `Chat with Pickup Customer (${targetFirstName})` : `Chat with Dropoff Customer (${targetFirstName})`}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-mono font-bold block truncate">
                                            {isPickupStage ? `Pickup Stage • ${pickupCustomerPhone || 'Sender'}` : `Delivery Stage • ${targetCustomerPhone || 'Recipient'}`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setChatOpen(false)}
                                    className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-200 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Message List */}
                            <div className="flex-1 p-3.5 sm:p-4 space-y-3 overflow-y-auto bg-[#FBFBFC]">
                                {chatMessages.length === 0 && (
                                    <div className="text-center py-12 space-y-1">
                                        <MessageSquare className="w-6 h-6 text-neutral-300 mx-auto" />
                                        <p className="text-neutral-400 text-xs font-medium">No messages on this order yet.</p>
                                        <p className="text-neutral-300 text-[10px]">
                                            {isPickupStage ? `Send a quick message to ${targetFirstName} (Pickup).` : `Send a quick message to ${targetFirstName} (Dropoff).`}
                                        </p>
                                    </div>
                                )}
                                {chatMessages.map((msg: any) => {
                                    const isRider = msg.sender === "rider"
                                    const isBusiness = msg.sender === "business"
                                    const customerLabel = msg.customerName || (isPickupStage ? `Pickup Customer (${targetFirstName})` : `Dropoff Customer (${targetFirstName})`)

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isRider ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                                                isRider
                                                    ? "bg-black text-white"
                                                    : "bg-white text-neutral-900 border border-black/[0.06] shadow-2xs"
                                            }`}>
                                                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                                    {isRider ? (
                                                        <Truck className="w-3 h-3" />
                                                    ) : isBusiness ? (
                                                        <Building2 className="w-3 h-3" />
                                                    ) : (
                                                        <User className="w-3 h-3" />
                                                    )}
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">
                                                        {isRider ? "You (Rider)" : isBusiness ? "Dispatch / Support" : customerLabel}
                                                    </span>
                                                </div>
                                                <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.message}</p>
                                                <p className={`text-[9px] mt-1 font-mono ${isRider ? "text-neutral-400" : "text-neutral-400"}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Typing indicator & Input */}
                            {isDelivered ? (
                                <div className="p-4 border-t border-black/[0.06] bg-neutral-100/80 text-center flex items-center justify-center gap-2 text-xs font-bold text-neutral-500">
                                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Delivery completed • Chat is read-only</span>
                                </div>
                            ) : (
                                <div className="p-3 border-t border-black/[0.06] bg-white">
                                    {isPartyTyping && (
                                        <div className="px-2 pb-2 flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                                            <MessageSquareMore className="w-3.5 h-3.5 animate-pulse text-black" />
                                            <span>Typing a reply...</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2 items-end">
                                        <Textarea
                                            value={chatInput}
                                            onChange={(e) => {
                                                setChatInput(e.target.value)
                                                if (order?.id) updateTypingStatus(order.id, "rider")
                                            }}
                                            placeholder={isPickupStage ? `Type message to ${targetFirstName} (Pickup)...` : `Type message to ${targetFirstName} (Dropoff)...`}
                                            className="flex-1 min-h-[42px] max-h-[96px] bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium text-black placeholder:text-neutral-400 resize-none focus:border-black focus:ring-0 py-2.5 px-3"
                                            rows={1}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSendRiderMessage()
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={handleSendRiderMessage}
                                            disabled={!chatInput.trim() || isSendingMessage}
                                            size="icon"
                                            className="h-11 w-11 bg-black hover:bg-neutral-800 text-white rounded-2xl shrink-0 transition-all active:scale-95"
                                        >
                                            {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Chat Button */}
                {!chatOpen && (
                    <button
                        onClick={() => setChatOpen(true)}
                        className="relative bg-black hover:bg-neutral-900 text-white h-13 w-13 sm:h-14 sm:w-14 rounded-2xl sm:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-black/10"
                        title="Open Chat"
                    >
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                        {chatMessages.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                                {chatMessages.length}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
