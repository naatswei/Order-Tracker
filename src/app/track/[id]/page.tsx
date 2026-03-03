"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrderWithHistory } from "@/app/actions/orders"
import { submitCustomerMessage } from "@/app/actions/messages"
import Link from "next/link"
import { getBusinessConfig } from "@/lib/business-configs"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Package, MessageSquare, Send, ChevronRight, MapPin, Calendar, Clock, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"

export default function TrackingDetailsPage() {
    const params = useParams()
    const trackingId = params.id as string
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [messageSubject, setMessageSubject] = useState("")
    const [messageBody, setMessageBody] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [showOverlay, setShowOverlay] = useState(true)

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
                        }))
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

    const handleSendMessage = async () => {
        if (!messageBody) {
            toast.error("Please compose your message")
            return
        }

        setIsSending(true)
        try {
            const result = await submitCustomerMessage({
                orderId: order!.id,
                subject: messageSubject || "Concierge Inquiry",
                message: messageBody
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Request submitted. Our team will contact you shortly.")
                setIsDialogOpen(false)
                setMessageSubject("")
                setMessageBody("")
            }
        } catch (error) {
            toast.error("Submission failed. Please try again.")
        } finally {
            setIsSending(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0B14] flex items-center justify-center">
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-center"
                >
                    <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#CE0003] to-transparent mx-auto mb-4" />
                    <p className="text-white/40 text-xs font-light tracking-[0.2em] uppercase">Refining Experience</p>
                </motion.div>
            </div>
        )
    }

    const config = getBusinessConfig(order?.businessType || "tailoring")

    if (!order) {
        return (
            <div className="min-h-screen bg-[#0A0B14] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full"
                >
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardContent className="py-16 text-center space-y-8">
                            <div className="w-24 h-24 bg-[#CE0003]/10 rounded-full flex items-center justify-center mx-auto border border-[#CE0003]/20">
                                <Package className="w-10 h-10 text-[#CE0003]" strokeWidth={1} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-light text-white tracking-tight">Trace Not Found</h2>
                                <p className="text-white/40 font-light text-sm">
                                    Reference <span className="text-white/80 font-medium">{trackingId}</span> is invalid.
                                </p>
                            </div>
                            <Link href="/track" className="block px-8">
                                <Button variant="outline" className="w-full h-12 rounded-full border-white/20 text-white hover:bg-white/10 font-light tracking-wide">
                                    Return to Search
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0A0B14] text-white selection:bg-[#CE0003]/30 overflow-x-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#CE0003]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

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
                                    className="absolute inset-0 border border-white/10 rounded-full"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                />
                                <div className="absolute inset-2 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border border-white/[0.08]">
                                    {order.businessDetails?.imageUrl ? (
                                        <img src={order.businessDetails.imageUrl} alt="Brand" className="w-full h-full object-cover scale-110" />
                                    ) : (
                                        <span className="text-4xl font-extralight text-white/20">O</span>
                                    )}
                                </div>
                            </div>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="block text-[10px] uppercase tracking-[0.4em] text-white/30 mb-4"
                            >
                                Private Access
                            </motion.span>
                            <h1 className="text-4xl font-extralight text-white mb-4 tracking-tight">
                                Welcome, <span className="font-normal">{order.customerName.split(' ')[0]}</span>
                            </h1>
                            <div className="h-[1px] w-12 bg-[#CE0003] mx-auto mb-6" />
                            <p className="text-sm text-white/40 font-light leading-loose tracking-wide">
                                Track your order progress from <br />
                                <span className="text-white/80 font-medium tracking-normal">
                                    {order.businessDetails?.name || "The Atelier"}
                                </span>
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Navigation */}
            <motion.header
                style={{ opacity: headerOpacity }}
                className="fixed top-0 inset-x-0 z-40 h-20 bg-[#0A0B14]/80 backdrop-blur-xl border-b border-white/[0.05]"
            >
                <div className="container h-full mx-auto px-6 flex items-center justify-between">
                    <Link href="/track" className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[#CE0003] font-black text-xl tracking-tighter">O</span>
                        <span className="text-white/90 font-light text-lg tracking-widest uppercase items-center flex">Tracker</span>
                    </div>
                    <div className="w-9" /> {/* Spacer */}
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
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                                <span className="w-1 h-1 rounded-full bg-[#CE0003] animate-pulse" />
                                <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Live Journey</span>
                            </div>
                            <h1 className="text-4xl sm:text-6xl font-light tracking-tighter text-white">
                                {order.orderNumber}
                            </h1>
                            <p className="text-white/30 font-light tracking-wide">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-end gap-2">
                            <Badge className="bg-[#CE0003] hover:bg-[#CE0003] text-white text-[11px] px-4 py-1.5 rounded-full border-none font-medium tracking-wider uppercase">
                                {order.currentStatus}
                            </Badge>
                            <span className="text-xs text-white/20 font-light tracking-widest uppercase">{order.garmentType}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-12">
                    <Card className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
                        <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                            <Calendar className="w-5 h-5 text-[#CE0003]" strokeWidth={1.5} />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Initiated</p>
                                <p className="text-sm font-light text-white/80">
                                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
                        <CardContent className="p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                            <Clock className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Estimated Arrival</p>
                                <p className="text-sm font-medium text-white/90">
                                    {order.pickupDate || "Evaluating..."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                <div className="space-y-8 mb-16">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Tracking History</h3>
                        <div className="text-[10px] text-white/10 tracking-[0.1em]">{order.statusHistory.length} checkpoints passed</div>
                    </div>
                    <div className="relative pl-6 sm:pl-10 space-y-12">
                        {/* Timeline Spine */}
                        <div className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#CE0003] via-white/10 to-transparent" />

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
                                    <div className={`absolute -left-[24px] sm:-left-[32px] top-1 w-[11px] h-[11px] rounded-full border-2 border-[#0A0B14] z-10 transition-transform group-hover:scale-125 ${isCurrent ? "bg-[#CE0003] ring-4 ring-[#CE0003]/20" : "bg-white/20"
                                        }`} />

                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className={`text-lg font-light tracking-tight transition-colors ${isCurrent ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                                                    {statusItem.status}
                                                </h4>
                                                {statusItem.location && (
                                                    <div className="flex items-center gap-1 text-[10px] text-white/20 uppercase tracking-widest">
                                                        <MapPin className="w-3 h-3" strokeWidth={1.5} />
                                                        {statusItem.location}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/30 font-light leading-relaxed max-w-md">
                                                {statusItem.message}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[11px] text-white/40 font-medium tabular-nums uppercase tracking-tighter">
                                                {new Date(statusItem.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-white/20 font-light tabular-nums">
                                                {new Date(statusItem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Clientele Identity */}
                <Card className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] mb-16 shadow-inner">
                    <CardContent className="p-8 space-y-8">
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/20 text-center">Customer Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center sm:text-left">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-[0.2em] text-[#CE0003] font-bold">Client</Label>
                                <p className="text-xl font-light text-white">{order.customerName}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">Contact Channel</Label>
                                <p className="text-sm font-light text-white/60 break-all">{order.customerEmail}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Help Section */}
                <div className="text-center space-y-10">
                    <p className="text-xs text-white/20 font-light tracking-[0.2em] uppercase">Need any help?</p>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="group relative overflow-hidden bg-white text-[#0A0B14] hover:bg-white/90 h-16 px-10 rounded-full font-medium tracking-wide transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] border-none"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 transition-transform group-hover:rotate-12" />
                                    Send a Message
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CE0003]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-[#10111A] border-white/10 text-white rounded-[2rem] shadow-2xl backdrop-blur-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-light tracking-tight text-white/90">Send us a message</DialogTitle>
                                <DialogDescription className="text-white/40 font-light">
                                    Response expected via {order.customerEmail.split('@')[0]}... shortly.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-8">
                                <div className="space-y-3">
                                    <Label htmlFor="subject" className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Topic</Label>
                                    <Input
                                        id="subject"
                                        value={messageSubject}
                                        onChange={(e) => setMessageSubject(e.target.value)}
                                        placeholder="Specific refinement request..."
                                        className="bg-white/5 border-white/10 rounded-2xl h-12 focus:border-[#CE0003] focus:ring-1 focus:ring-[#CE0003]/20 placeholder:text-white/10 text-sm font-light"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="message" className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Message</Label>
                                    <Textarea
                                        id="message"
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        placeholder="How may we elevate your experience?"
                                        className="min-h-[160px] bg-white/5 border-white/10 rounded-[1.5rem] focus:border-[#CE0003] focus:ring-1 focus:ring-[#CE0003]/20 resize-none placeholder:text-white/10 text-sm font-light leading-relaxed"
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full bg-[#CE0003] hover:bg-[#CE0003]/90 text-white rounded-full h-14 font-medium gap-3 shadow-xl transition-all active:scale-95 border-none"
                                onClick={handleSendMessage}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" strokeWidth={2} />
                                        Transmit Request
                                    </>
                                )}
                            </Button>
                        </DialogContent>
                    </Dialog>

                    <div className="pt-20 opacity-20 text-[10px] uppercase tracking-[0.5em] font-light">
                        Powering Premium Trust
                    </div>
                </div>
            </main>

            {/* Visual Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
    )
}
