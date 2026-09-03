"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrderWithHistory } from "@/app/actions/orders"
import { getOrderDeliveryPin } from "@/lib/delivery-pin"
import { submitCustomerMessage, getThreadMessages, updateTypingStatus, getTypingStatus } from "@/app/actions/messages"
import { savePushSubscription } from "@/app/actions/push"
import Link from "next/link"
import { getBusinessConfig } from "@/lib/business-configs"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Package, CheckCircle2, Clock, Truck, MapPin, Search, Send, MessageSquare, MessageSquareMore, X, ArrowRight, User, Building2, ChevronRight, ExternalLink, Calendar, Zap, Bell, BellRing, BellOff, FileText, Download, Navigation, Phone, ShieldCheck, Copy, Check } from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { SignatureLoader } from "@/components/signature-loader"

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const PaystackInvoiceCheckout = dynamic(() => import('@/components/paystack-invoice-checkout'), { 
    ssr: false,
    loading: () => (
        <Button disabled className="w-full h-12 bg-blue-600/50 text-white rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 cursor-wait">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading checkout...</span>
        </Button>
    )
})

export default function TrackingDetailsPage() {
    const params = useParams()
    const trackingId = params.id as string
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [messageBody, setMessageBody] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const [chatMessages, setChatMessages] = useState<any[]>([])
    const [isBusinessTyping, setIsBusinessTyping] = useState(false)
    const [isPushSupported, setIsPushSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscriptionLoading, setSubscriptionLoading] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [showOtpModal, setShowOtpModal] = useState(true)
    const [copiedOtp, setCopiedOtp] = useState(false)
    
    const deliveryPin = order ? getOrderDeliveryPin(order) : ""

    const handlePaymentSuccess = async (reference: string) => {
        toast.loading("Verifying payment, please wait...")
        try {
            const { confirmInvoicePayment } = await import("@/app/actions/invoice")
            const res = await confirmInvoicePayment(order!.id, reference)
            if (res.success) {
                toast.dismiss()
                toast.success("Payment confirmed! Your order status has been updated.")
                // Refresh order state
                const foundOrder = await getOrderWithHistory(order!.id)
                if (foundOrder) {
                    setOrder({
                        ...order!,
                        currentStatus: foundOrder.currentStatus,
                        metadata: foundOrder.metadata as any,
                        statusHistory: (foundOrder.statusHistory as Record<string, unknown>[]).map((h) => ({
                            id: h.id as string,
                            status: h.status as string,
                            location: h.location as string | null,
                            message: h.message as string | null,
                            timestamp: new Date(h.timestamp as string | number | Date)
                        }))
                    })
                }
            } else {
                toast.dismiss()
                toast.error("Payment confirmation failed. Please contact the merchant.")
            }
        } catch (e) {
            toast.dismiss()
            toast.error("An error occurred during payment confirmation.")
        }
    }

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered successfully with scope:', reg.scope))
                .catch(err => console.error('Service Worker registration failed:', err));
        }
    }, []);

    useEffect(() => {
        const checkPushSupport = async () => {
            const hasServiceWorker = 'serviceWorker' in navigator;
            const hasPushManager = 'PushManager' in window;
            
            // Check if iOS
            const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            setIsIOS(isIOSDevice);

            if (hasServiceWorker && hasPushManager) {
                setIsPushSupported(true);
                
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        const subscriptionJSON = subscription.toJSON();
                        if (subscriptionJSON.endpoint && subscriptionJSON.keys?.p256dh && subscriptionJSON.keys?.auth) {
                            // Silently register this active browser subscription to the current order in the database
                            const res = await savePushSubscription(trackingId, subscriptionJSON);
                            if (res.success) {
                                setIsSubscribed(true);
                            } else {
                                setIsSubscribed(false);
                            }
                        } else {
                            setIsSubscribed(false);
                        }
                    } else {
                        setIsSubscribed(false);
                    }
                } catch (e) {
                    console.error("Error checking push subscription status:", e);
                    setIsSubscribed(false);
                }
            }
        };

        checkPushSupport();
    }, [trackingId]);

    const handleSubscribe = async () => {
        if (!isPushSupported) return;
        setSubscriptionLoading(true);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error("Notification permission denied.");
                setSubscriptionLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error("VAPID public key not found in env vars!");
                toast.error("Push notification configuration is missing on the server.");
                setSubscriptionLoading(false);
                return;
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            const subscriptionJSON = subscription.toJSON();
            if (subscriptionJSON.endpoint && subscriptionJSON.keys?.p256dh && subscriptionJSON.keys?.auth) {
                const res = await savePushSubscription(trackingId, subscriptionJSON);
                if (res.success) {
                    setIsSubscribed(true);
                    toast.success("Subscribed to status updates!");
                } else {
                    toast.error(res.error || "Failed to register subscription.");
                }
            } else {
                toast.error("Invalid subscription payload returned from browser.");
            }
        } catch (error) {
            console.error("Failed to subscribe:", error);
            toast.error("An error occurred while enabling notifications.");
        } finally {
            setSubscriptionLoading(false);
        }
    };

    console.log("Tracking Page State:", { trackingId, chatOpen, messagesCount: chatMessages.length, isBusinessTyping })
    const [showOverlay, setShowOverlay] = useState(true)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1])

    useEffect(() => {
        if (!trackingId) return

        const fetchOrder = async () => {
            try {
                const foundOrder = await getOrderWithHistory(trackingId)
                if (foundOrder) {
                    const mappedOrder: Order = {
                        id: foundOrder.id,
                        orderNumber: foundOrder.orderNumber,
                        customerName: foundOrder.customerName,
                        customerEmail: foundOrder.customerEmail || "",
                        customerPhone: foundOrder.customerPhone,
                        garmentType: foundOrder.itemType,
                        measurements: foundOrder.measurements || "",
                        currentStatus: foundOrder.currentStatus,
                        createdAt: foundOrder.createdAt,
                        updatedAt: foundOrder.updatedAt,
                        businessType: foundOrder.businessType,
                        businessDetails: foundOrder.businessDetails,
                        pickupDate: foundOrder.pickupDate as string,
                        metadata: foundOrder.metadata as any,
                        statusHistory: (foundOrder.statusHistory as Record<string, unknown>[]).map((h) => ({
                            id: h.id as string,
                            status: h.status as string,
                            location: h.location as string | null,
                            message: h.message as string | null,
                            timestamp: new Date(h.timestamp as string | number | Date)
                        })),
                        messagingEnabled: foundOrder.messagingEnabled,
                        inventoryItems: (foundOrder as any).allBusinessInventory?.map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            sku: item.sku,
                            category: item.category,
                            availability: parseFloat(item.quantity) > 0 ? "In Stock" : "Out of Stock"
                        })) || []
                    }

                    if (order && mappedOrder.currentStatus !== order.currentStatus) {
                        toast.success(`Exclusive Update: ${mappedOrder.currentStatus}`, {
                            style: { background: "#191A43", color: "#fff", border: "none" }
                        })
                        import("@/lib/notifications").then(mod => mod.notificationSound.play())
                    }

                    setOrder(mappedOrder)
                }
                setLoading(false)
            } catch (err) {
                console.error("Error fetching order:", err)
                setLoading(false)
            }
        }

        fetchOrder()
        const interval = setInterval(fetchOrder, 60000)
        return () => clearInterval(interval)
    }, [trackingId, order?.currentStatus])

    useEffect(() => {
        if (!loading && order) {
            const timer = setTimeout(() => {
                setShowOverlay(false)
            }, 3500)
            return () => clearTimeout(timer)
        }
    }, [loading, order])

    // Load and poll chat messages
    useEffect(() => {
        if (!order) return

        const loadChat = async () => {
            const result = await getThreadMessages(order.id)
            if (result.messages) {
                const prev = chatMessages.length
                
                // Only update state if message count has changed to avoid unnecessary re-renders/scrolls
                if (result.messages.length !== prev) {
                    setChatMessages(result.messages)
                    // Play sound on new business reply
                    if (result.messages.length > prev && prev > 0) {
                        const latest = result.messages[result.messages.length - 1]
                        if (latest.sender === "business") {
                            import("@/lib/notifications").then(mod => mod.notificationSound.play())
                            toast.success("New reply from the business!", {
                                style: { background: "#191A43", color: "#fff", border: "none" }
                            })
                        }
                    }
                }
            }
        }

        loadChat()
        const interval = setInterval(loadChat, 3000)
        return () => clearInterval(interval)
    }, [order?.id])

    // Poll for typing status
    useEffect(() => {
        if (!order || !chatOpen) {
            setIsBusinessTyping(false)
            return
        }

        const pollTyping = async () => {
            if (!order?.id) return
            // Use the order.id as the primary identifier to match the backoffice grouping
            const result = await getTypingStatus(order.id)
            if (result.statuses) {
                const businessStatus = result.statuses.find(s => s.userType === "business")
                setIsBusinessTyping(!!businessStatus)
            }
        }

        pollTyping()
        const interval = setInterval(pollTyping, 2000)
        return () => clearInterval(interval)
    }, [order?.id, chatOpen, chatMessages])

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (!chatOpen || chatMessages.length === 0) return

        // Use a more localized scroll to avoid moving the entire page window
        const container = chatEndRef.current?.parentElement
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
            })
        }
    }, [chatMessages.length, chatOpen])

    const handleSendMessage = async () => {
        if (!messageBody.trim()) {
            toast.error("Please compose your message")
            return
        }
        const currentMessageBody = messageBody.trim()

        // Find existing threadId from chat
        const existingThread = chatMessages.length > 0 ? chatMessages[0].threadId : undefined

        // Optimistic UI update
        const newMessage = {
            id: `temp-${Date.now()}`,
            orderId: order!.id,
            threadId: existingThread || "new",
            sender: "customer",
            customerName: order!.customerName,
            customerEmail: order!.customerEmail,
            customerPhone: order!.customerPhone,
            subject: "Customer Inquiry",
            message: currentMessageBody,
            isRead: "false",
            createdAt: new Date().toISOString()
        }

        setChatMessages(prev => [...prev, newMessage])
        setMessageBody("")
        setIsSending(true)

        try {
            const result = await submitCustomerMessage({
                orderId: order!.id,
                subject: "Customer Inquiry",
                message: currentMessageBody,
                threadId: existingThread !== "legacy" ? existingThread : undefined
            })

            if (result.error) {
                toast.error(result.error)
                // Remove the optimistic message on error
                setChatMessages(prev => prev.filter(m => m.id !== newMessage.id))
            }
        } catch (error) {
            toast.error("Failed to send message")
            setChatMessages(prev => prev.filter(m => m.id !== newMessage.id))
        } finally {
            setIsSending(false)
        }
    }

    const config = getBusinessConfig(order?.businessType || "tailoring")

    const filteredItems = (order?.inventoryItems || []).filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // Stepper logic matching rider page
    const getActiveStepIndex = () => {
        if (!order) return 0
        const lower = (order.currentStatus || "").toLowerCase()
        if (lower === "delivered" || lower === "completed") return 3
        if (lower === "in transit" || lower === "dispatched" || lower === "out for delivery") return 2
        if (lower === "picked up" || lower === "sorting" || lower === "arriving at facility" || lower === "processing" || lower === "ready") return 1
        return 0
    }

    const steps = [
        { label: "Booked" },
        { label: order?.businessType === "logistics" ? "Pickup" : "Processing" },
        { label: order?.businessType === "logistics" ? "In-Transit" : "Ready" },
        { label: "Delivered" }
    ]

    const activeStep = getActiveStepIndex()

    return (
        <div ref={containerRef} className="min-h-screen bg-[#F6F6F8] text-neutral-900 font-sans selection:bg-black selection:text-white relative pb-28">
            {loading ? (
                <div className="min-h-screen bg-[#F6F6F8] flex flex-col items-center justify-center p-6 text-center">
                    <SignatureLoader />
                    <p className="text-xs font-bold text-neutral-500 mt-6 tracking-widest uppercase animate-pulse">
                        Loading Tracking Details...
                    </p>
                </div>
            ) : !order ? (
                <div className="min-h-screen bg-[#F6F6F8] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-100 flex items-center justify-center text-red-500 mb-4">
                        <Package className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-neutral-900 tracking-tight">Order Not Found</h1>
                    <p className="text-xs text-neutral-500 max-w-xs mt-1.5 font-medium">
                        Tracking reference #{trackingId} is invalid or has expired.
                    </p>
                    <Link href="/track" className="mt-6 inline-block">
                        <Button className="h-12 px-6 rounded-2xl bg-black text-white hover:bg-neutral-800 text-xs font-bold">
                            Return to Search
                        </Button>
                    </Link>
                </div>
            ) : (
                <>
                    {/* Sticky Minimalist Header */}
                    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/[0.04]">
                        <div className="max-w-md w-full mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black tracking-tight text-black">
                                    <span className="text-[#CE0003]">O</span>Tracker
                                </span>
                                {order.businessDetails?.name && order.businessDetails.name !== "OTracker" && (
                                    <span className="text-[11px] font-bold text-neutral-400 border-l border-neutral-200 pl-2 truncate max-w-[150px]">
                                        {order.businessDetails.name}
                                    </span>
                                )}
                            </div>
                            <Badge className="bg-neutral-100 hover:bg-neutral-100 text-neutral-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-black/[0.05]">
                                Customer Tracking
                            </Badge>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="max-w-md w-full mx-auto px-5 sm:px-6 py-6 space-y-5">

                        {/* 1. TOP HEADER: Vehicle/Package Badge + Live Dot + Waybill # */}
                        <motion.div 
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Vehicle or Package Icon Badge */}
                                    <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
                                        {order.businessType === "logistics" ? <Truck className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                    </div>

                                    {/* Status Dot + Waybill / Order # */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                            <span className="text-xl sm:text-2xl font-black tracking-tighter text-black truncate">
                                                #{order.orderNumber}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                                            {order.businessDetails?.name || "Order Dispatch"}
                                        </p>
                                    </div>
                                </div>

                                {/* Copy Waybill Button */}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(order.orderNumber)
                                        toast.success("Order number copied", {
                                            style: { background: "#000", color: "#fff", border: "none" }
                                        })
                                    }}
                                    className="w-10 h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-black transition-all active:scale-95 shrink-0"
                                    title="Copy Number"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-black/[0.04]">
                                <span className="text-xs text-neutral-500 font-medium">Status</span>
                                <Badge className="bg-black text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-none">
                                    {order.currentStatus}
                                </Badge>
                            </div>
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

                        {/* 3. DELIVERY PIN CARD (Logistics Handover OTP) */}
                        {order.businessType === "logistics" && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.1 }}
                                className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black font-black">
                                            <ShieldCheck className="w-5 h-5 text-black" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
                                                Package Verification
                                            </span>
                                            <h3 className="text-sm font-black text-black">
                                                Delivery Handover PIN
                                            </h3>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowOtpModal(true)}
                                        className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-700 hover:text-black transition-all"
                                    >
                                        View OTP
                                    </button>
                                </div>

                                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {deliveryPin.split("").map((digit: string, i: number) => (
                                            <span key={i} className="w-10 h-12 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center font-mono font-black text-xl text-black">
                                                {digit}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deliveryPin)
                                            setCopiedOtp(true)
                                            toast.success("PIN copied to clipboard", {
                                                style: { background: "#000", color: "#fff", border: "none" }
                                            })
                                            setTimeout(() => setCopiedOtp(false), 2000)
                                        }}
                                        className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                                    >
                                        {copiedOtp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedOtp ? "Copied" : "Copy"}</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                                    Share this 4-digit numeric code with your dispatch rider upon delivery to confirm handover.
                                </p>
                            </motion.div>
                        )}

                        {/* 4. KEY METRICS */}
                        <div className="grid grid-cols-2 gap-3.5">
                            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-2">
                                <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Created</p>
                                    <p className="text-xs sm:text-sm font-black text-black">
                                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-2">
                                <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Est. Arrival</p>
                                    <p className="text-xs sm:text-sm font-black text-black">
                                        {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "In Progress"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 5. INVOICE & PAYMENTS */}
                        {(order.metadata as any)?.invoice && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-5"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-black">Invoice & Payment</h3>
                                            <p className="text-xs text-neutral-500 font-mono">
                                                {((order.metadata as any).invoice as any).invoiceNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase border-none ${
                                            ((order.metadata as any).invoice as any).invoiceStatus === "paid"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-red-50 text-red-600"
                                        }`}
                                    >
                                        {((order.metadata as any).invoice as any).invoiceStatus}
                                    </Badge>
                                </div>

                                {/* Invoice Details */}
                                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-neutral-600">
                                    <div>
                                        <p className="text-neutral-400 text-[10px] uppercase font-bold mb-1">Issue Date</p>
                                        <p className="text-black font-bold">
                                            {new Date(((order.metadata as any).invoice as any).createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-neutral-400 text-[10px] uppercase font-bold mb-1">Due Date</p>
                                        <p className="text-black font-bold">
                                            {new Date(((order.metadata as any).invoice as any).dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Items Billed</p>
                                    <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl divide-y divide-neutral-200/60 overflow-hidden">
                                        {(((order.metadata as any).invoice as any).items || []).map((item: any, idx: number) => (
                                            <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                                <div className="space-y-0.5">
                                                    <p className="text-black font-bold">{item.name}</p>
                                                    <p className="text-neutral-500">Qty: {item.quantity} × GH₵ {item.price.toFixed(2)}</p>
                                                </div>
                                                <span className="text-black font-black">
                                                    GH₵ {(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Breakdown Totals */}
                                <div className="space-y-1.5 text-xs border-t border-black/[0.04] pt-3">
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Subtotal</span>
                                        <span className="font-bold text-neutral-800">GH₵ {((order.metadata as any).invoice as any).subtotal.toFixed(2)}</span>
                                    </div>
                                    {((order.metadata as any).invoice as any).tax > 0 && (
                                        <div className="flex justify-between text-neutral-500">
                                            <span>Tax</span>
                                            <span className="font-bold text-neutral-800">GH₵ {((order.metadata as any).invoice as any).tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {((order.metadata as any).invoice as any).deliveryFee > 0 && (
                                        <div className="flex justify-between text-neutral-500">
                                            <span>Delivery Fee</span>
                                            <span className="font-bold text-neutral-800">GH₵ {((order.metadata as any).invoice as any).deliveryFee.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {((order.metadata as any).invoice as any).discount > 0 && (
                                        <div className="flex justify-between text-red-500">
                                            <span>Discount</span>
                                            <span className="font-bold">- GH₵ {((order.metadata as any).invoice as any).discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-neutral-500 pt-1">
                                        <span>Payment Method</span>
                                        <span className="font-black uppercase text-[10px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">{((order.metadata as any).invoice as any).paymentMethod || "online"}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-black border-t border-black/[0.04] pt-2">
                                        <span>Amount Due</span>
                                        <span>GH₵ {((order.metadata as any).invoice as any).amountDue.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2.5 pt-1">
                                    {((order.metadata as any).invoice as any).invoiceStatus === "unpaid" ? (
                                        ((order.metadata as any).invoice as any).paymentMethod === "cash" ? (
                                            <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-center flex flex-col gap-1">
                                                <span className="text-black text-xs font-black">Cash / Manual Settlement</span>
                                                <p className="text-[11px] text-neutral-500">
                                                    Please arrange payment directly with the merchant upon handover.
                                                </p>
                                            </div>
                                        ) : (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY && (order.businessDetails as any)?.paystackSubaccountCode) ? (
                                            <PaystackInvoiceCheckout
                                                order={order}
                                                invoice={(order.metadata as any).invoice}
                                                publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}
                                                subaccountCode={(order.businessDetails as any).paystackSubaccountCode}
                                                onSuccess={handlePaymentSuccess}
                                            />
                                        ) : (
                                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                                                <p className="text-xs text-amber-800 font-medium">
                                                    Online checkout is pending setup by the merchant. Please settle directly with the merchant.
                                                </p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Payment Settled Successfully</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={async () => {
                                            const { printInvoice } = await import("@/lib/pdf-generator")
                                            printInvoice(
                                                order.metadata!.invoice as any,
                                                order.customerName,
                                                order.customerPhone,
                                                order.customerEmail,
                                                order.businessDetails?.name || "Business"
                                            )
                                        }}
                                        className="w-full py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-black rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Download className="w-4 h-4 text-black shrink-0" />
                                        <span>Download PDF Receipt</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* 6. PUSH NOTIFICATIONS */}
                        {isPushSupported && !isSubscribed && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04]"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-black">Live Status Alerts</h4>
                                            <p className="text-[11px] text-neutral-500 font-medium leading-tight">
                                                Receive instant browser notifications whenever your order updates.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        disabled={subscriptionLoading}
                                        onClick={handleSubscribe}
                                        className="w-full sm:w-auto h-11 px-5 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider shrink-0 transition-all active:scale-95"
                                    >
                                        {subscriptionLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            "Enable"
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* 7. TRACKING TIMELINE HISTORY */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-6"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
                                <h3 className="text-xs font-black uppercase tracking-wider text-black">Milestone History</h3>
                                <span className="text-[10px] text-neutral-400 font-bold uppercase">{order.statusHistory.length} checkpoints</span>
                            </div>

                            <div className="relative pl-6 space-y-8">
                                {/* Vertical track line */}
                                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-neutral-100" />

                                {order.statusHistory.map((statusItem, index) => {
                                    const isCurrent = index === 0
                                    return (
                                        <div key={index} className="relative group">
                                            <div 
                                                className={`absolute -left-[24px] top-1 w-3 h-3 rounded-full border-2 border-white transition-transform ${
                                                    isCurrent ? "bg-black ring-4 ring-black/10 scale-110" : "bg-neutral-300"
                                                }`} 
                                            />
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-sm font-black ${isCurrent ? "text-black" : "text-neutral-500"}`}>
                                                        {statusItem.status}
                                                    </h4>
                                                    <span className="text-[10px] text-neutral-400 font-bold tabular-nums">
                                                        {new Date(statusItem.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}, {new Date(statusItem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </span>
                                                </div>
                                                {statusItem.message && (
                                                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                                                        {statusItem.message}
                                                    </p>
                                                )}
                                                {statusItem.location && (
                                                    <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-bold">
                                                        <MapPin className="w-3 h-3" />
                                                        {statusItem.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>

                        {/* Special Instructions for non-logistics businesses */}
                        {order.businessType !== "logistics" && order.measurements && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-1.5"
                            >
                                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                                    {order.businessType === "tailoring" ? "Specifications" : "Special Instructions"}
                                </span>
                                <p className="text-xs text-neutral-600 font-medium leading-relaxed italic">
                                    "{order.measurements}"
                                </p>
                            </motion.div>
                        )}

                        {/* Store Inventory Availability (for retail/stores) */}
                        {order.businessType !== "logistics" && order.inventoryItems && order.inventoryItems.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] overflow-hidden">
                                <div className="p-5 border-b border-black/[0.04] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-black">Available Items</h3>
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase">{order.inventoryItems.length} items</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search items..."
                                            className="w-full bg-neutral-50 border border-neutral-200/60 rounded-2xl py-2.5 pl-10 pr-10 text-xs font-medium text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                </div>
                                <div className="divide-y divide-black/[0.04] max-h-[360px] overflow-y-auto">
                                    {filteredItems.map((item) => (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                            <div className="space-y-0.5 min-w-0 pr-2">
                                                <p className="text-xs font-bold text-black truncate">{item.name}</p>
                                                {item.sku && <p className="text-[10px] text-neutral-400 font-mono">{item.sku}</p>}
                                            </div>
                                            <Badge className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border-none shrink-0 ${
                                                item.availability === "In Stock" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"
                                            }`}>
                                                {item.availability}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom Promo & Sign Up Footer */}
                        <div className="pt-6 text-center">
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/[0.04] space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-base font-black text-black tracking-tight">
                                        Manage your business logistics with OTracker
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-medium">
                                        Real-time tracking, rider dispatch, and automated client SMS alerts.
                                    </p>
                                </div>
                                <Link href="/sign-up" className="inline-block">
                                    <Button className="h-11 px-6 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider shadow-md">
                                        Get Started Free
                                    </Button>
                                </Link>
                            </div>
                        </div>

                    </main>

                    {/* Floating Customer Care Chat */}
                    {order.messagingEnabled && (
                        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
                            <AnimatePresence>
                                {chatOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="w-[320px] sm:w-[380px] bg-white rounded-3xl border border-black/[0.08] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col"
                                        style={{ height: '480px' }}
                                    >
                                        {/* Chat Header */}
                                        <div className="flex items-center justify-between p-4 border-b border-black/[0.06] bg-neutral-50">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-black block leading-none">Support Chat</span>
                                                    <span className="text-[10px] text-neutral-400 font-medium">{order.businessDetails?.name || "Business"}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setChatOpen(false)}
                                                className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-200 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Message Body */}
                                        <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#FBFBFC]">
                                            {chatMessages.length === 0 && (
                                                <div className="text-center py-12 space-y-1">
                                                    <p className="text-xs font-bold text-neutral-500">Need help with your order?</p>
                                                    <p className="text-[11px] text-neutral-400">Send a message directly to dispatch.</p>
                                                </div>
                                            )}
                                            {chatMessages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                                                        msg.sender === "customer"
                                                            ? "bg-black text-white"
                                                            : "bg-white text-neutral-900 border border-black/[0.06] shadow-sm"
                                                    }`}>
                                                        <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.message}</p>
                                                        <p className={`text-[9px] mt-1 font-mono ${msg.sender === "customer" ? "text-neutral-400" : "text-neutral-400"}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Chat Input */}
                                        <div className="p-3 border-t border-black/[0.06] bg-white">
                                            {isBusinessTyping && (
                                                <div className="px-2 pb-2 flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                                                    <MessageSquareMore className="w-3.5 h-3.5 animate-pulse text-black" />
                                                    <span>Support is typing...</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={messageBody}
                                                    onChange={(e) => {
                                                        setMessageBody(e.target.value)
                                                        updateTypingStatus(order.id, "customer")
                                                    }}
                                                    placeholder="Type a message..."
                                                    className="flex-1 h-11 bg-neutral-50 border border-neutral-200 rounded-2xl px-3.5 text-xs font-medium text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault()
                                                            handleSendMessage()
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    onClick={handleSendMessage}
                                                    disabled={!messageBody.trim() || isSending}
                                                    size="icon"
                                                    className="h-11 w-11 bg-black hover:bg-neutral-800 text-white rounded-2xl shrink-0 transition-all active:scale-95"
                                                >
                                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!chatOpen && (
                                <button
                                    onClick={() => setChatOpen(true)}
                                    className="relative bg-black hover:bg-neutral-900 text-white h-14 w-14 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-black/10"
                                >
                                    <MessageSquare className="w-6 h-6" />
                                    {chatMessages.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                                            {chatMessages.length}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Delivery OTP Popup Modal for Logistics */}
                    <AnimatePresence>
                        {order && order.businessType === "logistics" && showOtpModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                                    className="relative w-full max-w-sm rounded-[2.5rem] bg-white border border-black/[0.06] p-6 sm:p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] space-y-5"
                                >
                                    {/* Close Button */}
                                    <button
                                        onClick={() => setShowOtpModal(false)}
                                        className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    {/* Icon Header */}
                                    <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-black flex items-center justify-center mx-auto shadow-sm">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 block">
                                            Delivery Verification
                                        </span>
                                        <h3 className="text-xl font-black text-black tracking-tight">
                                            Your Handover OTP
                                        </h3>
                                        <p className="text-xs text-neutral-500 font-medium leading-relaxed max-w-xs mx-auto">
                                            Share this 4-digit numeric code with your dispatch rider upon delivery to confirm package handover.
                                        </p>
                                    </div>

                                    {/* 4-Digit Boxes */}
                                    <div className="flex justify-center items-center gap-2.5 pt-2">
                                        {deliveryPin.split("").map((digit: string, i: number) => (
                                            <div
                                                key={i}
                                                className="w-14 h-16 rounded-2xl bg-neutral-50 border-2 border-neutral-300 flex items-center justify-center text-3xl font-mono font-black text-black shadow-sm"
                                            >
                                                {digit}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 space-y-2.5">
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText(deliveryPin)
                                                setCopiedOtp(true)
                                                toast.success("Delivery PIN copied to clipboard", {
                                                    style: { background: "#000", color: "#fff", border: "none" }
                                                })
                                                setTimeout(() => setCopiedOtp(false), 2000)
                                            }}
                                            variant="outline"
                                            className="w-full h-12 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-xs font-bold text-neutral-800 flex items-center justify-center gap-2"
                                        >
                                            {copiedOtp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            <span>{copiedOtp ? "Copied PIN" : "Copy 4-Digit PIN"}</span>
                                        </Button>

                                        <Button
                                            onClick={() => setShowOtpModal(false)}
                                            className="w-full h-12 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider shadow-md"
                                        >
                                            Got It
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    )
}
