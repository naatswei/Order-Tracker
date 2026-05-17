"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrderWithHistory } from "@/app/actions/orders"
import { submitCustomerMessage, getThreadMessages, updateTypingStatus, getTypingStatus } from "@/app/actions/messages"
import { savePushSubscription } from "@/app/actions/push"
import Link from "next/link"
import { getBusinessConfig } from "@/lib/business-configs"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Package, CheckCircle2, Clock, Truck, MapPin, Search, Send, MessageSquare, MessageSquareMore, X, ArrowRight, User, Building2, ChevronRight, ExternalLink, Calendar, Zap, Bell, BellRing, BellOff } from "lucide-react"
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
                    setIsSubscribed(!!subscription);
                } catch (e) {
                    console.error("Error checking push subscription status:", e);
                }
            }
        };

        checkPushSupport();
    }, []);

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

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0A0B14] text-white selection:bg-[#3B82F6]/30 overflow-x-hidden relative">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#3B82F6]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            {loading ? (
                <div className="min-h-screen flex items-center justify-center">
                    <SignatureLoader message="Refining Experience" />
                </div>
            ) : !order ? (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card className="bg-white/10 backdrop-blur-xl border-white/30 shadow-2xl rounded-[2rem] overflow-hidden">
                            <CardContent className="py-16 text-center space-y-8">
                                <div className="w-24 h-24 bg-[#3B82F6]/10 rounded-full flex items-center justify-center mx-auto border border-[#3B82F6]/20">
                                    <Package className="w-10 h-10 text-[#3B82F6]" strokeWidth={1} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-light text-white tracking-tight">Order Not Found</h2>
                                    <p className="text-white/60 font-light text-sm">
                                        Reference <span className="text-white/80 font-medium">{trackingId}</span> is invalid.
                                    </p>
                                </div>
                                <Link href="/track" className="block px-8">
                                    <Button variant="outline" className="w-full h-12 rounded-full border-white/30 text-white hover:bg-white/10 font-light tracking-wide">
                                        Return to Search
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            ) : (
                <>
                    {/* Premium Welcome Overlay */}
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
                                        Track your order and item availability <br />
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

                    {/* Sticky Navigation */}
                    <motion.header
                        style={{ opacity: headerOpacity }}
                        className="fixed top-0 inset-x-0 z-40 h-20 bg-[#0A0B14]/80 backdrop-blur-xl border-b border-white/15"
                    >
                        <div className="container h-full mx-auto px-6 flex items-center justify-center text-center">
                            <div className="flex items-center text-xl font-bold tracking-tight">
                                <span className="text-[#CE0003]">O</span><span className="text-white">Tracker</span>
                            </div>
                        </div>
                    </motion.header>

                    <main className="container mx-auto px-6 pt-24 pb-32 max-w-2xl relative z-10">
                        {/* Order Hero */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="mb-12 text-center sm:text-left"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/30 mb-4">
                                        <span className="w-1 h-1 rounded-full bg-[#3B82F6] animate-pulse" />
                                        <span className="text-[10px] uppercase tracking-widest text-white/70 font-medium">Live Journey</span>
                                    </div>
                                    <h1 className="text-4xl sm:text-6xl font-light tracking-tighter text-white">
                                        {order.orderNumber}
                                    </h1>
                                    <p className="text-white/60 font-light tracking-wide">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="flex flex-col items-center sm:items-end gap-2 text-center sm:text-right">
                                    <Badge className="bg-[#3B82F6] hover:bg-[#3B82F6] text-white text-[11px] px-4 py-1.5 rounded-full border-none font-medium tracking-wider uppercase">
                                        {order.currentStatus}
                                    </Badge>
                                    <span className="text-xs text-white/50 font-light tracking-widest uppercase">{order.garmentType}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-4 mb-12">
                            <Card className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
                                <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                                    <Calendar className="w-5 h-5 text-[#3B82F6]" strokeWidth={1.5} />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-white/80 font-bold mb-1">Order Created</p>
                                        <p className="text-sm font-light text-white">
                                            {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
                                <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                                    <Clock className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-white/80 font-bold mb-1">Estimated Arrival</p>
                                        <p className="text-sm font-light text-white">
                                            {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Evaluating..."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Push Notification Card */}
                        {isPushSupported && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-12"
                            >
                                <Card className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                                            <div className={`p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 ${isSubscribed ? 'text-blue-400' : 'text-white/60'}`}>
                                                {isSubscribed ? (
                                                    <BellRing className="w-6 h-6 animate-bounce" />
                                                ) : (
                                                    <Bell className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-medium text-white tracking-wide">
                                                    {isSubscribed ? "Updates Active" : "Get Real-time Updates"}
                                                </h4>
                                                <p className="text-xs text-white/50 font-light max-w-sm leading-relaxed">
                                                    {isSubscribed 
                                                        ? "You will receive browser notifications whenever your order status updates." 
                                                        : "Enable push notifications to track this order instantly when status changes."}
                                                </p>
                                                {isIOS && !isSubscribed && (
                                                    <p className="text-[10px] text-blue-400/80 font-light leading-relaxed max-w-xs mt-1">
                                                        ℹ️ iPhone user? Tap "Share" and "Add to Home Screen" first to enable notifications.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            disabled={isSubscribed || subscriptionLoading}
                                            onClick={handleSubscribe}
                                            className={`w-full sm:w-auto px-6 py-5 rounded-2xl font-medium text-xs tracking-wider uppercase transition-all duration-300 ${
                                                isSubscribed
                                                    ? "bg-white/[0.05] border border-white/10 text-white/40 cursor-default"
                                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0"
                                            }`}
                                        >
                                            {subscriptionLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : isSubscribed ? (
                                                "Active"
                                            ) : (
                                                "Enable Notifications"
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Timeline */}
                        <div className="space-y-8 mb-16 px-4 sm:px-0">
                            <div className="flex items-center justify-between mb-8 px-2 text-center sm:text-left">
                                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Tracking History</h3>
                                <div className="text-[10px] text-white/40 tracking-[0.1em]">{order.statusHistory.length} checkpoints</div>
                            </div>
                            <div className="relative pl-6 sm:pl-10 space-y-12">
                                {/* Timeline Spine */}
                                <div className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#3B82F6] via-white/30 to-transparent" />

                                {order.statusHistory.map((statusItem, index) => {
                                    const isCurrent = index === 0;
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                            className={`relative group ${isCurrent ? "opacity-100" : "opacity-40"}`}
                                        >
                                            {/* Vertical Node */}
                                            <div className={`absolute -left-[24px] sm:-left-[32px] top-1 w-[11px] h-[11px] rounded-full border-2 border-[#0A0B14] z-10 transition-transform group-hover:scale-125 ${isCurrent ? "bg-[#3B82F6] ring-4 ring-[#3B82F6]/20" : "bg-white/50"
                                                }`} />

                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className={`text-lg font-light tracking-tight transition-colors ${isCurrent ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                                                            {statusItem.status}
                                                        </h4>
                                                        {statusItem.location && (
                                                            <div className="flex items-center gap-1 text-[10px] text-white/50 uppercase tracking-widest">
                                                                <MapPin className="w-3 h-3" strokeWidth={1.5} />
                                                                {statusItem.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-white/60 font-light leading-relaxed max-w-md">
                                                        {statusItem.message}
                                                    </p>
                                                </div>
                                                <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0">
                                                    <div className="text-[11px] text-white/70 font-medium tabular-nums uppercase tracking-tighter">
                                                        {new Date(statusItem.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                    </div>
                                                    <div className="text-[10px] text-white/50 font-light tabular-nums">
                                                        {new Date(statusItem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Special Instructions / Notes */}
                        {order.measurements && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mb-16 px-4 py-6 rounded-3xl bg-white/[0.02] border border-white/5 border-dashed"
                            >
                                <Label className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]/60 font-black block mb-2">
                                    {order.businessType === "tailoring" ? "Specifications" : "Special Instructions"}
                                </Label>
                                <p className="text-sm font-light text-white/50 leading-relaxed italic">
                                    "{order.measurements}"
                                </p>
                            </motion.div>
                        )}
                        
                        {/* Item Availability Section */}
                        {order.inventoryItems && order.inventoryItems.length > 0 && (
                            <div className="mb-20 space-y-8">
                                <div className="flex flex-col items-center gap-5 text-center mb-14 pt-12">
                                    <div className="px-8 py-3.5 rounded-full bg-white/10 border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-2xl inline-flex items-center gap-3 group hover:bg-white/20 hover:border-white/40 transition-all duration-500 hover:scale-[1.02] cursor-default">
                                        <div className="w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />
                                        <h3 className="text-[12px] font-light uppercase tracking-[0.4em] text-white">Available store items</h3>
                                    </div>
                                    <div className="text-[10px] text-white/40 tracking-[0.3em] font-medium uppercase">{order.inventoryItems.length} items</div>
                                </div>
                                <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                                    <div className="divide-y divide-white/5">
                                        {order.inventoryItems.map((item) => (
                                            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.03] transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-[#3B82F6]/20 group-hover:border-[#3B82F6]/30 transition-all">
                                                        <Package className="w-3.5 h-3.5 text-white/40 group-hover:text-[#3B82F6] transition-colors" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-light text-white/90 group-hover:text-white transition-colors">{item.name}</p>
                                                        {item.sku && <p className="text-[9px] text-white/20 tracking-wider uppercase font-medium">{item.sku}</p>}
                                                    </div>
                                                </div>
                                                <Badge 
                                                    className={`rounded-full px-3 py-1 text-[9px] font-black tracking-wider uppercase border-none ${
                                                        item.availability === "In Stock" 
                                                        ? "bg-[#10B981] text-[#0A0B14]" 
                                                        : "bg-white/5 text-[#EF4444] border border-[#EF4444]/10"
                                                    }`}
                                                >
                                                    {item.availability}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Section */}
                        {order.messagingEnabled && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-xs text-white/50 font-light tracking-[0.2em] uppercase mb-6">Customer Care</p>
                                </div>

                                {!chatOpen ? (
                                    <div className="text-center">
                                        <Button
                                            onClick={() => setChatOpen(true)}
                                            className="group relative overflow-hidden bg-white text-[#0A0B14] hover:bg-white/90 h-11 px-8 rounded-full font-light tracking-wide transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] border-none text-xs"
                                        >
                                            <span className="relative z-10 flex items-center gap-3">
                                                <MessageSquare className="w-4 h-4 transition-transform group-hover:rotate-12" />
                                                {chatMessages.length > 0 ? `Resume Chat (${chatMessages.length})` : "Start Chat"}
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3B82F6]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        </Button>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                                            <div className="flex items-center gap-3">
                                                <MessageSquare className="w-4 h-4 text-white/60" />
                                                <span className="text-sm font-light text-white/80">Support Chat</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setChatOpen(false)}
                                                className="text-white/40 hover:text-white hover:bg-white/10 text-xs rounded-full h-7 px-3"
                                            >
                                                Minimize
                                            </Button>
                                        </div>

                                        <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                                            {chatMessages.length === 0 && (
                                                <p className="text-center text-white/30 text-sm py-8 font-light">No message history found.</p>
                                            )}
                                            {chatMessages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === "customer"
                                                        ? "bg-white/15 text-white"
                                                        : "bg-[#3B82F6]/20 text-white border border-[#3B82F6]/20"
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {msg.sender === "customer" ? (
                                                                <User className="w-3 h-3 opacity-50" />
                                                            ) : (
                                                                <Building2 className="w-3 h-3 opacity-50" />
                                                            )}
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                                                                {msg.sender === "customer" ? "You" : "Business"}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-light">{msg.message}</p>
                                                        <p className="text-[10px] mt-2 opacity-40">
                                                            {new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>

                                        <div className="p-4 border-t border-white/10">
                                            {isBusinessTyping && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="px-2 py-2 flex items-center gap-2 mb-1"
                                                >
                                                    <div className="flex items-center gap-2 text-white/40">
                                                        <MessageSquareMore className="w-3.5 h-3.5 animate-pulse" />
                                                        <div className="flex gap-1">
                                                            <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
                                                            <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce delay-75" />
                                                            <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce delay-150" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white/40 font-sans">{order.customerName} is typing...</span>
                                                </motion.div>
                                            )}
                                            <div className="flex gap-3">
                                                <Textarea
                                                    value={messageBody}
                                                    onChange={(e) => {
                                                        setMessageBody(e.target.value)
                                                        updateTypingStatus(order.id, "customer")
                                                    }}
                                                    placeholder="Inquire here..."
                                                    className="flex-1 min-h-[44px] max-h-[100px] bg-white/10 border-white/20 rounded-2xl text-sm font-light text-white placeholder:text-white/30 resize-none focus:border-[#3B82F6]/50 focus:ring-0"
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
                                                    className="h-11 px-4 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white font-semibold text-xs border-none shrink-0 transition-all active:scale-95"
                                                >
                                                    {isSending ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        <div className="pt-24 text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-10 sm:p-14"
                            >
                                {/* Decorative Glow */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#3B82F6]/20 rounded-full blur-[80px] group-hover:bg-[#3B82F6]/30 transition-colors duration-700" />
                                
                                <div className="relative z-10 space-y-8">
                                    <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight leading-tight">
                                        Want to sign up your business on <span className="text-[#CE0003] font-bold">O</span><span className="font-bold">Tracker</span>?
                                    </h2>

                                    <div className="flex flex-col items-center gap-4">
                                        <Link href="/sign-up">
                                            <Button className="bg-white text-[#0A0B14] hover:bg-white/90 h-12 px-10 rounded-full font-bold text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 group/btn">
                                                Sign up now
                                                <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                        </Link>
                                        <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-medium">Contact: 0577064301</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </main>
                </>
            )}

            {/* Visual Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
    )
}
