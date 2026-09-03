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
                    {/* Premium Welcome Introduction Overlay */}
                    <AnimatePresence>
                        {showOverlay && (
                            <motion.div
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0B14]"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="text-center px-6 max-w-sm"
                                >
                                    <div className="w-32 h-32 mx-auto mb-10 relative">
                                        <motion.div
                                            className="absolute inset-0 border border-white/30 rounded-full"
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        />
                                        <div className="absolute inset-2 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                                            {order.businessDetails?.imageUrl ? (
                                                <img src={order.businessDetails.imageUrl} alt="Brand" className="w-full h-full object-cover scale-110" />
                                            ) : (
                                                <span className="text-4xl font-extralight text-white/50">O</span>
                                            )}
                                        </div>
                                    </div>
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="block text-[10px] uppercase tracking-[0.4em] text-white/60 mb-4"
                                    >
                                        Private Access
                                    </motion.span>
                                    <h1 className="text-4xl font-extralight text-white mb-4 tracking-tight">
                                        Welcome, <span className="font-normal">{order.customerName.split(' ')[0]}</span>
                                    </h1>
                                    <div className="h-[1px] w-12 bg-[#3B82F6] mx-auto mb-6" />
                                    <p className="text-sm text-white/90 font-light leading-loose tracking-wide">
                                        {order.businessType === "logistics" ? "Track your order" : "Track your order and item availability"} <br />
                                        <span className="text-white/80 font-medium tracking-normal">
                                            {order.businessDetails?.name === "OTracker" ? (
                                                <><span className="text-[#CE0003]">O</span>Tracker</>
                                            ) : (
                                                order.businessDetails?.name || "The Atelier"
                                            )}
                                        </span>
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sticky Navigation Header */}
                    <motion.header
                        style={{ opacity: headerOpacity }}
                        className="fixed top-0 inset-x-0 z-40 h-16 sm:h-20 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]"
                    >
                        <div className="container h-full mx-auto px-6 flex items-center justify-center text-center">
                            <div className="flex items-center text-xl font-black tracking-tight text-black">
                                <span className="text-[#CE0003]">O</span><span>Tracker</span>
                            </div>
                        </div>
                    </motion.header>

                    <main className="container mx-auto px-4 sm:px-6 pt-20 pb-32 max-w-3xl relative z-10 space-y-10">
                        {/* Order Hero (Original Features & Placement) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center sm:text-left pt-6"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-black/[0.06] shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Live Journey</span>
                                    </div>
                                    <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-black">
                                        {order.orderNumber}
                                    </h1>
                                    {order.businessType === "logistics" ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowOtpModal(true)}
                                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-black/[0.06] shadow-sm hover:bg-neutral-50 transition-all text-neutral-800 text-xs font-mono group"
                                            title="Click to view full Delivery OTP"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Delivery PIN:</span>
                                            <span className="text-black font-black tracking-widest text-sm sm:text-base">{deliveryPin}</span>
                                            <span className="text-[10px] text-neutral-400 underline ml-1 group-hover:text-black font-sans">View OTP</span>
                                        </button>
                                    ) : (
                                        <p className="text-neutral-500 font-medium tracking-wide">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center sm:items-end gap-2 text-center sm:text-right">
                                    <Badge className="bg-black hover:bg-neutral-900 text-white text-[11px] px-4 py-1.5 rounded-full border-none font-black tracking-wider uppercase shadow-sm">
                                        {order.currentStatus}
                                    </Badge>
                                    <span className="text-xs text-neutral-400 font-bold tracking-widest uppercase">{order.itemType}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white border border-black/[0.04] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Order Created</p>
                                        <p className="text-sm font-black text-black">
                                            {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border border-black/[0.04] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Estimated Arrival</p>
                                        <p className="text-sm font-black text-black">
                                            {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Evaluating..."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Timeline (Original Checkpoints & History) */}
                        <div className="space-y-8 px-4 sm:px-0">
                            <div className="flex items-center justify-between mb-8 px-2 text-center sm:text-left">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">Tracking History</h3>
                                <div className="text-[10px] text-neutral-400 tracking-[0.1em] font-bold uppercase">{order.statusHistory.length} checkpoints</div>
                            </div>
                            <div className="relative pl-6 sm:pl-10 space-y-10">
                                {/* Timeline Spine */}
                                <div className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-[2px] bg-neutral-200" />

                                {order.statusHistory.map((statusItem, index) => {
                                    const isCurrent = index === 0;
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                            className={`relative group ${isCurrent ? "opacity-100" : "opacity-60"}`}
                                        >
                                            {/* Vertical Node */}
                                            <div className={`absolute -left-[24px] sm:-left-[32px] top-1 w-[12px] h-[12px] rounded-full border-2 border-white z-10 transition-transform ${
                                                isCurrent ? "bg-black ring-4 ring-black/10 scale-110" : "bg-neutral-300"
                                            }`} />

                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className={`text-base sm:text-lg font-black tracking-tight ${isCurrent ? "text-black" : "text-neutral-700"}`}>
                                                            {statusItem.status}
                                                        </h4>
                                                        {statusItem.location && (
                                                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                                                                <MapPin className="w-3 h-3" strokeWidth={1.5} />
                                                                {statusItem.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {statusItem.message && (
                                                        <p className="text-sm text-neutral-600 font-medium leading-relaxed max-w-md">
                                                            {statusItem.message}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0">
                                                    <div className="text-[11px] text-neutral-800 font-bold tabular-nums uppercase">
                                                        {new Date(statusItem.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                    </div>
                                                    <div className="text-[10px] text-neutral-400 font-medium tabular-nums">
                                                        {new Date(statusItem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Push Notification Card */}
                        {isPushSupported && !isSubscribed && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="bg-white border border-black/[0.04] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                                            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                                                <Bell className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-black">
                                                    Get Real-time Updates
                                                </h4>
                                                <p className="text-xs text-neutral-500 font-medium max-w-sm leading-relaxed">
                                                    Enable push notifications to track this order instantly when status changes.
                                                </p>
                                                {isIOS && (
                                                    <p className="text-[10px] text-neutral-400 font-medium leading-relaxed max-w-xs mt-1">
                                                        ℹ️ iPhone user? Tap "Share" and "Add to Home Screen" first to enable notifications.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            disabled={subscriptionLoading}
                                            onClick={handleSubscribe}
                                            className="w-full sm:w-auto px-6 py-5 rounded-2xl font-black text-xs tracking-wider uppercase bg-black hover:bg-neutral-800 text-white shadow-md active:scale-95"
                                        >
                                            {subscriptionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Enable Notifications"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Invoice & Payments Card */}
                        {(order.metadata as any)?.invoice && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="bg-white border border-black/[0.04] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                    <CardContent className="p-6 space-y-6">
                                        {/* Header */}
                                        <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-black">
                                                        Invoice & Payment
                                                    </h3>
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
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Special Instructions for non-logistics businesses */}
                        {order.businessType !== "logistics" && order.measurements && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="px-6 py-6 rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                            >
                                <Label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-black block mb-2">
                                    {order.businessType === "tailoring" ? "Specifications" : "Special Instructions"}
                                </Label>
                                <p className="text-sm font-medium text-neutral-700 leading-relaxed italic">
                                    "{order.measurements}"
                                </p>
                            </motion.div>
                        )}

                        {/* Item Availability Section */}
                        {order.businessType !== "logistics" && order.inventoryItems && order.inventoryItems.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">Available store items</h3>
                                    <div className="text-[10px] text-neutral-400 tracking-[0.1em] font-bold uppercase">
                                        {searchQuery ? `${filteredItems.length} of ${order.inventoryItems.length} items` : `${order.inventoryItems.length} items`}
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
                                    {/* Search Input Bar */}
                                    <div className="p-4 sm:p-5 border-b border-black/[0.04] bg-neutral-50/50">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search items by name or SKU..."
                                                className="w-full bg-white border border-neutral-200 rounded-2xl py-3 pl-11 pr-12 text-sm font-medium text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors text-xs font-medium"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="divide-y divide-black/[0.04] max-h-[500px] overflow-y-auto">
                                        {filteredItems.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <p className="text-sm text-neutral-400 font-medium">No items match "{searchQuery}"</p>
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="text-xs text-black hover:underline mt-2 font-bold"
                                                >
                                                    Clear search
                                                </button>
                                            </div>
                                        ) : (
                                            filteredItems.map((item) => (
                                                <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                                                            <Package className="w-3.5 h-3.5 text-neutral-600" />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-bold text-black">{item.name}</p>
                                                            {item.sku && <p className="text-[9px] text-neutral-400 tracking-wider uppercase font-mono">{item.sku}</p>}
                                                        </div>
                                                    </div>
                                                    <Badge 
                                                        className={`rounded-full px-3 py-1 text-[9px] font-black tracking-wider uppercase border-none ${
                                                            item.availability === "In Stock" 
                                                            ? "bg-emerald-100 text-emerald-800" 
                                                            : "bg-neutral-100 text-neutral-500"
                                                        }`}
                                                    >
                                                        {item.availability}
                                                    </Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bottom Promo */}
                        <div className="pt-12 text-center">
                            <div className="relative group overflow-hidden rounded-[2rem] bg-white border border-black/[0.04] p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] max-w-2xl mx-auto space-y-5">
                                <div className="space-y-2">
                                    <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-tight">
                                        Manage your business from anywhere.
                                    </h2>
                                    <p className="text-sm text-neutral-500 font-medium">
                                        Sign up your business on <span className="text-[#CE0003] font-bold">O</span><span className="font-bold text-black">Tracker</span> now.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-3">
                                    <Link href="/sign-up">
                                        <Button className="bg-black hover:bg-neutral-800 text-white h-11 px-8 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 group/btn">
                                            Sign up now
                                            <ChevronRight className="ml-2 w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-[0.3em] font-bold">Contact: 0577064301</p>
                                </div>
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
                                        <div className="flex items-center justify-between p-4 border-b border-black/[0.06] bg-neutral-50">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-black text-black">Support Chat</span>
                                            </div>
                                            <button
                                                onClick={() => setChatOpen(false)}
                                                className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-200 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#FBFBFC]">
                                            {chatMessages.length === 0 && (
                                                <p className="text-center text-neutral-400 text-xs py-8 font-medium">No message history found.</p>
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
                                                        <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                                            {msg.sender === "customer" ? (
                                                                <User className="w-3 h-3" />
                                                            ) : (
                                                                <Building2 className="w-3 h-3" />
                                                            )}
                                                            <span className="text-[9px] font-bold uppercase tracking-wider">
                                                                {msg.sender === "customer" ? "You" : "Business"}
                                                            </span>
                                                        </div>
                                                        <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.message}</p>
                                                        <p className={`text-[9px] mt-1 font-mono ${msg.sender === "customer" ? "text-neutral-400" : "text-neutral-400"}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>

                                        <div className="p-3 border-t border-black/[0.06] bg-white">
                                            {isBusinessTyping && (
                                                <div className="px-2 pb-2 flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                                                    <MessageSquareMore className="w-3.5 h-3.5 animate-pulse text-black" />
                                                    <span>Support is typing...</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Textarea
                                                    value={messageBody}
                                                    onChange={(e) => {
                                                        setMessageBody(e.target.value)
                                                        updateTypingStatus(order.id, "customer")
                                                    }}
                                                    placeholder="Type your message..."
                                                    className="flex-1 min-h-[42px] max-h-[100px] bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium text-black placeholder:text-neutral-400 resize-none focus:border-black focus:ring-0 py-2.5 px-3"
                                                    rows={1}
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
