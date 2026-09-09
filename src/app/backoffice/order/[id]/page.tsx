"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrderWithHistory, updateOrderStatus } from "@/app/actions/orders"
import { initiateMomoCharge } from "@/app/actions/paystack"
import { resendRiderSMS, getWorkflowStages } from "@/app/actions/operations"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { detectGhanaNetworkProvider } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { 
    ArrowLeft, 
    MapPin, 
    Clock, 
    User, 
    Phone, 
    Mail, 
    Shirt, 
    Package, 
    Loader2, 
    Banknote,
    Receipt,
    CreditCard, 
    FileText, 
    Plus, 
    Trash, 
    Download, 
    Link2, 
    CheckCircle, 
    MessageCircle, 
    Copy,
    Navigation,
    Truck,
    KeyRound,
    Send,
    SendHorizonal,
    ArrowRight,
    Check
} from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { getBusinessConfig, getStatusTheme } from "@/lib/business-configs"
import { SignatureLoader } from "@/components/signature-loader"
import { cn } from "@/lib/utils"

interface StaffPerformer {
    id: string;
    name: string;
    role: string | null;
}

interface OrderStatusWithPerformer {
    id: string;
    timestamp: Date;
    status: string;
    location: string | null;
    message: string | null;
    performer?: StaffPerformer | null;
}

interface OrderWithPerformerAndMetadata extends Omit<Order, 'statusHistory' | 'metadata'> {
    statusHistory: OrderStatusWithPerformer[];
    metadata?: {
        pickupLocation?: string;
        deliveryLocation?: string;
        recipientName?: string;
        recipientPhone?: string;
        deliveryPin?: string;
        internalStage?: string;
        invoice?: any;
        internalHistory?: {
            stage: string;
            performer: StaffPerformer | null;
            timestamp: string;
        }[];
    } | null;
}

function getStatusDefaults(statusName: string, isLogistics: boolean, metadata: any) {
    const lower = (statusName || "").toLowerCase();

    if (lower.includes("booked") || lower.includes("received")) {
        return {
            location: isLogistics ? (metadata?.pickupLocation || "Origin Station") : "Main Office",
            message: isLogistics 
                ? "Shipment booked and confirmed in dispatch system." 
                : "Order received and confirmed."
        };
    }
    if (lower.includes("pick") && lower.includes("up")) {
        return {
            location: isLogistics ? (metadata?.pickupLocation || "Pickup Location") : "Workshop",
            message: isLogistics 
                ? "Package picked up by courier and on way to dispatch hub." 
                : "Item picked up for processing."
        };
    }
    if (lower.includes("transit") || lower.includes("delivery") || lower.includes("dispatched") || lower.includes("road") || lower.includes("shipped")) {
        return {
            location: isLogistics ? (metadata?.deliveryLocation || "Out on Route") : "Delivery Fleet",
            message: isLogistics 
                ? `Package is out for delivery to ${metadata?.deliveryLocation || 'destination'}. Have your Delivery PIN ready upon arrival.` 
                : "Your order is dispatched and on its way."
        };
    }
    if (lower.includes("facility") || lower.includes("sorting") || lower.includes("hub") || lower.includes("station") || lower.includes("customs") || lower.includes("packaging")) {
        return {
            location: "Sorting & Dispatch Hub",
            message: `Package arrived at facility for ${statusName.toLowerCase()}.`
        };
    }
    if (lower.includes("ready") || lower.includes("fitting") || lower.includes("pickup")) {
        return {
            location: "Storefront / Showroom",
            message: "Your order is ready for pickup or fitting."
        };
    }
    if (lower.includes("sewing") || lower.includes("production") || lower.includes("measurement") || lower.includes("wigging") || lower.includes("styling")) {
        return {
            location: "Production Workshop",
            message: `Your order is currently in ${statusName.toLowerCase()} stage.`
        };
    }
    if (lower.includes("delivered") || lower.includes("completed") || lower.includes("done")) {
        return {
            location: isLogistics ? (metadata?.deliveryLocation || "Destination") : "Customer Destination",
            message: isLogistics 
                ? "Package delivered successfully and verified with Delivery PIN." 
                : "Order completed and delivered successfully. Thank you for your business!"
        };
    }
    if (lower.includes("cancel") || lower.includes("hold") || lower.includes("delayed") || lower.includes("returned")) {
        return {
            location: "Operations Desk",
            message: `Shipment status is ${statusName.toLowerCase()}. Please contact support for assistance.`
        };
    }

    return {
        location: isLogistics ? (metadata?.deliveryLocation || "Dispatch Operations") : "Main Office",
        message: isLogistics 
            ? `Shipment status updated to ${statusName}.` 
            : `Order status updated to ${statusName}.`
    };
}

export default function OrderUpdatePage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.id as string

    const [order, setOrder] = useState<OrderWithPerformerAndMetadata | null>(null)
    const [pipelineStages, setPipelineStages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [status, setStatus] = useState("")
    const [location, setLocation] = useState("")
    const [message, setMessage] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)

    // Invoice form state
    const [invoiceItems, setInvoiceItems] = useState<{ name: string; quantity: number; price: number; isLinked?: boolean }[]>([])
    const [tax, setTax] = useState(0)
    const [isTaxEdited, setIsTaxEdited] = useState(false)
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [dueDate, setDueDate] = useState("")
    const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online")
    const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false)
    
    // Momo Prompt modal state
    const [isMomoModalOpen, setIsMomoModalOpen] = useState(false)
    const [momoPhone, setMomoPhone] = useState("")
    const [momoProvider, setMomoProvider] = useState<'mtn' | 'vod' | 'atl'>("mtn")
    const [isMomoCharging, setIsMomoCharging] = useState(false)

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)
    const isLogistics = businessType === "logistics"
    const quickStatuses = useMemo(() => {
        if (pipelineStages && pipelineStages.length > 0) {
            return pipelineStages;
        }
        const bConfig = getBusinessConfig(businessType);
        return bConfig.statuses;
    }, [pipelineStages, businessType]);

    useEffect(() => {
        const orgBusinessType = organization?.publicMetadata?.businessType as string
        if (orgBusinessType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        } else {
            const storedType = localStorage.getItem("businessType")
            if (storedType) {
                setBusinessType(storedType)
            }
        }
    }, [organization])

    // Initialize defaults from organization settings
    useEffect(() => {
        if (!organization) return
        const metadata = (organization.publicMetadata as any) || {}
        const defaultDelivery = parseFloat(metadata.defaultDeliveryFee || "0")
        const defaultDisc = parseFloat(metadata.defaultDiscount || "0")
        
        setDeliveryFee(defaultDelivery)
        setDiscount(defaultDisc)
    }, [organization])

    // Auto-calculate tax based on defaultTaxRate percent and subtotal
    useEffect(() => {
        if (isTaxEdited || !organization) return
        const metadata = (organization.publicMetadata as any) || {}
        const defaultTaxRatePercent = parseFloat(metadata.defaultTaxRate || "0")
        if (defaultTaxRatePercent > 0) {
            const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            const computedTax = (subtotal * defaultTaxRatePercent) / 100
            setTax(Number(computedTax.toFixed(2)))
        } else {
            setTax(0)
        }
    }, [invoiceItems, organization, isTaxEdited])

    // Auto-detect Momo network provider from phone number
    useEffect(() => {
        if (momoPhone) {
            const detected = detectGhanaNetworkProvider(momoPhone);
            if (detected) {
                setMomoProvider(detected);
            }
        }
    }, [momoPhone]);

    useEffect(() => {
        if (orderId) {
            setLoading(true)
            Promise.all([
                getOrderWithHistory(orderId),
                getWorkflowStages()
            ]).then(([foundOrder, stagesData]) => {
                if (stagesData && stagesData.length > 0) {
                    setPipelineStages(stagesData.map((s: any) => s.name));
                } else {
                    setPipelineStages([]);
                }

                if (foundOrder) {
                    const mappedOrder: OrderWithPerformerAndMetadata = {
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
                        metadata: foundOrder.metadata as any,
                        statusHistory: (foundOrder.statusHistory as Record<string, any>[]).map((h) => ({
                            id: h.id as string,
                            status: h.status as string,
                            location: h.location as string | null,
                            message: h.message as string | null,
                            timestamp: new Date(h.timestamp as string | number | Date),
                            performer: h.performer ? {
                                id: h.performer.id as string,
                                name: h.performer.name as string,
                                role: h.performer.role as string | null,
                            } : null
                        })),
                        inventoryItems: (foundOrder.inventoryLinks as any[])?.map((link: any) => ({
                            id: link.inventoryItem?.id,
                            name: link.inventoryItem?.name,
                            quantity: link.quantity,
                            sku: link.inventoryItem?.sku,
                            unit: link.inventoryItem?.unit,
                            category: link.inventoryItem?.category
                        })) || []
                    }
                    setOrder(mappedOrder)

                    // Pre-fill invoice items
                    if (foundOrder.inventoryLinks && foundOrder.inventoryLinks.length > 0) {
                        const items = foundOrder.inventoryLinks.map((link: any) => {
                            const inv = link.inventoryItem;
                            let displayName = inv?.name || "Product";
                            if (inv) {
                                const parts = [];
                                if (inv.sku) parts.push(inv.sku);
                                if (inv.unit) parts.push(inv.unit);
                                if (parts.length > 0) {
                                    displayName = `${inv.name} (${parts.join(" | ")})`;
                                }
                            }
                            return {
                                name: displayName,
                                quantity: Number(link.quantity) || 1,
                                price: (() => {
                                        const selling = parseFloat(inv?.sellingPrice || "0");
                                        const cost = parseFloat(inv?.unitCost || "0");
                                        return selling > 0 ? selling : cost;
                                    })(),
                                isLinked: true
                            };
                        })
                        setInvoiceItems(items)
                    } else {
                        setInvoiceItems([{ name: foundOrder.itemType || "Service / Package", quantity: 1, price: 0, isLinked: false }])
                    }
                }
                setLoading(false)
            }).catch(err => {
                console.error("Error fetching order:", err)
                setLoading(false)
            })
        }
    }, [orderId, businessType])

    const handleQuickStatus = (statusText: string) => {
        setStatus(statusText)
        const defaults = getStatusDefaults(statusText, isLogistics, order?.metadata)
        setLocation(defaults.location)
        setMessage(defaults.message)
    }

    const handleClear = () => {
        setStatus("")
        setLocation("")
        setMessage("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!status) {
            toast.error("Please enter or select a status")
            return
        }

        setIsUpdating(true)
        try {
            await updateOrderStatus(
                orderId, 
                status, 
                location || (isLogistics ? "Dispatch Hub" : "Main Office"), 
                message || `Status updated to ${status}`
            )
            toast.success(`Status updated to "${status}" & customer notified!`)
            router.push("/backoffice")
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update status"
            toast.error(errorMessage)
        } finally {
            setIsUpdating(false)
        }
    }

    const copyTrackingLink = () => {
        const link = `${window.location.origin}/track/${orderId}`
        navigator.clipboard.writeText(link)
        toast.success("Tracking link copied to clipboard!")
    }

    const getWhatsAppUrl = () => {
        if (!order?.customerPhone) return null
        let cleanPhone = order.customerPhone.replace(/\D/g, "")
        if (cleanPhone.startsWith("0")) {
            cleanPhone = "233" + cleanPhone.substring(1)
        }
        const text = encodeURIComponent(`Hello ${order.customerName}, this is regarding your ${isLogistics ? 'shipment' : 'order'} #${order.orderNumber}. You can track real-time updates here: ${typeof window !== 'undefined' ? window.location.origin : ''}/track/${order.id}`)
        return `https://wa.me/${cleanPhone}?text=${text}`
    }

    const handleResendDispatchSMS = async () => {
        toast.loading("Sending dispatch SMS to rider...", { id: `resend-${orderId}` })
        try {
            const res = await resendRiderSMS(orderId)
            if (res.success) {
                toast.success("Dispatch SMS sent to rider!", { id: `resend-${orderId}` })
            } else {
                toast.error(`SMS failed: ${res.error || "Check SMS balance"}`, { id: `resend-${orderId}` })
            }
        } catch (err: any) {
            toast.error(`SMS failed: ${err?.message || "Network error"}`, { id: `resend-${orderId}` })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
                <SignatureLoader message="Loading order details..." />
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white border-slate-200/80 shadow-xl rounded-3xl p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                        <Package className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
                    <p className="text-xs text-slate-500">The order you requested could not be found or has been removed.</p>
                    <Button asChild className="w-full bg-[#191A43] hover:bg-slate-800 text-white rounded-xl h-11 font-bold text-xs">
                        <Link href="/backoffice">Back to Dashboard</Link>
                    </Button>
                </Card>
            </div>
        )
    }

    const currentTheme = getStatusTheme(order.currentStatus)
    const selectedTheme = getStatusTheme(status)
    const meta = order.metadata || {}
    const pickupLoc = meta.pickupLocation || null
    const deliveryLoc = meta.deliveryLocation || null
    const recipientName = meta.recipientName || null
    const recipientPhone = meta.recipientPhone || null
    const deliveryPin = meta.deliveryPin || null

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 flex flex-col">
            {/* Sticky Mobile-First Header */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
                    {/* Top Row: Back Button + Order # + Status Badge */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Link href="/backoffice">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs shrink-0"
                                    title="Back to Dashboard"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#191A43] truncate">
                                        {order.orderNumber}
                                    </h1>
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shrink-0 flex items-center gap-1",
                                        currentTheme.badge
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentTheme.dot)} />
                                        <span>{order.currentStatus}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Header Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {order.customerPhone && (
                                <a 
                                    href={`tel:${order.customerPhone}`}
                                    className="h-8.5 w-8.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs"
                                    title="Call Customer"
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {getWhatsAppUrl() && (
                                <a 
                                    href={getWhatsAppUrl()!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8.5 w-8.5 rounded-xl border border-emerald-200 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                                    title="Message on WhatsApp"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyTrackingLink}
                                className="h-8.5 w-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
                                title="Copy Tracking Link"
                            >
                                <Link2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                
                {/* 1. ORDER SUMMARY & ROUTE CARD (Mobile-First) */}
                <Card className={cn(
                    "bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden border-l-4",
                    currentTheme.leftBorder
                )}>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                        {/* Route Strip for Logistics */}
                        {isLogistics && (pickupLoc || deliveryLoc) && (
                            <div className="p-3 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2.5">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Navigation className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Delivery Route</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-400">PICKUP / ORIGIN</p>
                                        <p className="text-xs sm:text-sm font-bold text-slate-800 break-words">{pickupLoc || "Origin Station"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-400">DROPOFF / DESTINATION</p>
                                        <p className="text-xs sm:text-sm font-bold text-slate-800 break-words">{deliveryLoc || "Customer Destination"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer & Recipient Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                            {/* Sender / Customer Info */}
                            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-200/50">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span>{isLogistics ? "Sender / Customer" : "Customer Details"}</span>
                                </p>
                                <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
                                {order.customerPhone && (
                                    <div className="flex items-center gap-2 pt-0.5">
                                        <a 
                                            href={`tel:${order.customerPhone}`}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                                        >
                                            <Phone className="w-3 h-3 text-emerald-600" />
                                            <span>{order.customerPhone}</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(order.customerPhone)
                                                toast.success("Phone copied!")
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600"
                                            title="Copy Phone"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                {order.customerEmail && (
                                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{order.customerEmail}</span>
                                    </p>
                                )}
                                {isLogistics && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const link = `${window.location.origin}/track/${order.id}?for=pickup`
                                            navigator.clipboard.writeText(link)
                                            toast.success("Pickup customer tracking link copied!")
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 pt-1"
                                    >
                                        <Link2 className="w-3 h-3" />
                                        <span>Copy Pickup Link</span>
                                    </button>
                                )}
                            </div>

                            {/* Recipient / Delivery Details (Logistics) or Item Details */}
                            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-200/50">
                                {isLogistics && (recipientName || recipientPhone) ? (
                                    <>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            <span>Recipient Details</span>
                                        </p>
                                        <p className="text-sm font-bold text-slate-900">{recipientName || "Same as Customer"}</p>
                                        {recipientPhone && (
                                            <div className="flex items-center gap-2 pt-0.5">
                                                <a 
                                                    href={`tel:${recipientPhone}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                                                >
                                                    <Phone className="w-3 h-3 text-emerald-600" />
                                                    <span>{recipientPhone}</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(recipientPhone)
                                                        toast.success("Recipient phone copied!")
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-slate-600"
                                                    title="Copy Phone"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const link = `${window.location.origin}/track/${order.id}?for=dropoff`
                                                navigator.clipboard.writeText(link)
                                                toast.success("Dropoff recipient tracking link copied!")
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 pt-1"
                                        >
                                            <Link2 className="w-3 h-3" />
                                            <span>Copy Dropoff Link</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                            <Shirt className="w-3 h-3" />
                                            <span>{config.itemLabel}</span>
                                        </p>
                                        <p className="text-sm font-bold text-slate-900 capitalize">{order.garmentType}</p>
                                        {order.measurements && (
                                            <p className="text-xs text-slate-600 italic">{order.measurements}</p>
                                        )}
                                    </>
                                )}

                                {/* Delivery PIN Badge (Logistics) */}
                                {isLogistics && deliveryPin && (
                                    <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 mt-2">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                            <span className="font-medium text-[11px]">Delivery PIN:</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-mono font-black text-xs border border-amber-200">
                                                {deliveryPin}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(deliveryPin)
                                                    toast.success("Delivery PIN copied!")
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-600"
                                                title="Copy PIN"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stock items sold (if linked) */}
                        {order.inventoryItems && order.inventoryItems.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stock Items Deducted</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {order.inventoryItems.map((item, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs font-bold bg-emerald-50/50 border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-xl">
                                            <span className="font-black">{item.quantity}</span>&nbsp;x&nbsp;<span>{item.name}</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. CORE ACTION: ADD STATUS UPDATE (Mobile-First) */}
                <Card className="bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden">
                    <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base sm:text-lg font-black text-[#191A43] flex items-center gap-2">
                                    <span>Update Order Status</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 font-medium">
                                    Tap a quick status below to auto-fill location and customer message.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 space-y-5">
                        {/* Quick Status Selection Pills */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Quick Status Options
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {quickStatuses.map((qs: string, idx: number) => {
                                    const isSelected = status === qs

                                    return (
                                        <button
                                            key={qs}
                                            type="button"
                                            onClick={() => handleQuickStatus(qs)}
                                            className={cn(
                                                "p-2.5 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between gap-2 active:scale-95 shadow-2xs cursor-pointer",
                                                isSelected 
                                                    ? "bg-[#191A43] text-white border-[#191A43] shadow-sm shadow-[#191A43]/10"
                                                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={cn(
                                                    "w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-mono font-black shrink-0",
                                                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {idx + 1}
                                                </span>
                                                <span className="truncate">{qs}</span>
                                            </div>
                                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Status Edit Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                            {/* Status Input */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">
                                    Status Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    placeholder="e.g. In Transit, Out for Delivery, Completed"
                                    className="h-10 sm:h-11 rounded-2xl bg-slate-50/70 border-slate-200/90 text-xs sm:text-sm font-semibold focus:bg-white transition-all"
                                />
                            </div>

                            {/* Location Input */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Current Location / Hub</span>
                                </Label>
                                <Input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Accra Central Hub, On Route to Customer"
                                    className="h-10 sm:h-11 rounded-2xl bg-slate-50/70 border-slate-200/90 text-xs sm:text-sm font-medium focus:bg-white transition-all"
                                />
                            </div>

                            {/* Customer Message Textarea */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <SendHorizonal className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Customer Notification Message</span>
                                </Label>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Detailed update message sent via SMS & visible on tracking link..."
                                    className="min-h-[85px] rounded-2xl bg-slate-50/70 border-slate-200/90 text-xs sm:text-sm font-normal focus:bg-white transition-all resize-none"
                                />
                                <p className="text-[11px] text-slate-400">
                                    * This message will be sent via SMS and updated on the customer's live tracking page.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                                <Button
                                    type="submit"
                                    disabled={!status || isUpdating}
                                    className="flex-1 h-11 sm:h-12 rounded-2xl bg-gradient-to-r from-[#191A43] to-slate-800 hover:from-slate-900 hover:to-[#191A43] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#191A43]/15 transition-all flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Updating Status & Notifying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Update Status & Notify Customer</span>
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleClear} 
                                    variant="outline" 
                                    className="h-11 sm:h-12 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                                >
                                    Clear Form
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* 3. INVOICE & BILLING SECTION (Mobile-First) */}
                {(order.metadata as any)?.invoice ? (
                    <Card className="bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden">
                        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    <span>Invoice #{(order.metadata as any).invoice.invoiceNumber}</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 font-medium">
                                    Created on {new Date((order.metadata as any).invoice.createdAt).toLocaleDateString()}
                                </CardDescription>
                            </div>
                            <Badge className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider",
                                (order.metadata as any).invoice.invoiceStatus === "paid" 
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                                    : "bg-amber-50 border border-amber-200 text-amber-700"
                            )}>
                                {(order.metadata as any).invoice.invoiceStatus}
                            </Badge>
                        </CardHeader>
                        
                        <CardContent className="p-4 sm:p-6 space-y-4">
                            {/* Line items table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="text-slate-400 font-bold border-b border-slate-100 text-left">
                                            <th className="pb-2.5">Item / Service</th>
                                            <th className="pb-2.5 text-center">Qty</th>
                                            <th className="pb-2.5 text-right">Price</th>
                                            <th className="pb-2.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(order.metadata as any).invoice.items?.map((item: any, idx: number) => (
                                            <tr key={idx} className="text-slate-700 font-medium">
                                                <td className="py-2.5">{item.name}</td>
                                                <td className="py-2.5 text-center">{item.quantity}</td>
                                                <td className="py-2.5 text-right">GH₵ {Number(item.price || 0).toFixed(2)}</td>
                                                <td className="py-2.5 text-right font-bold text-slate-900">GH₵ {(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="flex justify-end pt-3 border-t border-slate-100">
                                <div className="w-full sm:w-64 space-y-2 text-xs sm:text-sm">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Subtotal</span>
                                        <span className="font-semibold text-slate-800">GH₵ {Number((order.metadata as any).invoice.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    {(order.metadata as any).invoice.tax > 0 && (
                                        <div className="flex justify-between text-slate-500">
                                            <span>Tax</span>
                                            <span className="font-semibold text-slate-800">GH₵ {Number((order.metadata as any).invoice.tax).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(order.metadata as any).invoice.deliveryFee > 0 && (
                                        <div className="flex justify-between text-slate-500">
                                            <span>Delivery</span>
                                            <span className="font-semibold text-slate-800">GH₵ {Number((order.metadata as any).invoice.deliveryFee).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(order.metadata as any).invoice.discount > 0 && (
                                        <div className="flex justify-between text-red-500">
                                            <span>Discount</span>
                                            <span className="font-semibold">- GH₵ {Number((order.metadata as any).invoice.discount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200/80 pt-2.5">
                                        <span>Amount Due</span>
                                        <span>GH₵ {Number((order.metadata as any).invoice.amountDue || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Invoice Action Buttons (Mobile-First) */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                                {(order.metadata as any).invoice.invoiceStatus === "unpaid" && (
                                    <>
                                        <Button 
                                            onClick={async () => {
                                                try {
                                                    const { markInvoiceAsPaid } = await import("@/app/actions/invoice")
                                                    await markInvoiceAsPaid(order.id)
                                                    toast.success("Invoice marked as paid")
                                                    window.location.reload()
                                                } catch (e) {
                                                    toast.error("Failed to mark as paid")
                                                }
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>Mark as Paid</span>
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setMomoPhone(order.customerPhone || "")
                                                setIsMomoModalOpen(true)
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                        >
                                            <Banknote className="w-3.5 h-3.5" />
                                            <span>Trigger Momo Prompt</span>
                                        </Button>
                                    </>
                                )}
                                <Button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/track/${order.id}`
                                        navigator.clipboard.writeText(url)
                                        toast.success("Payment / tracking link copied!")
                                    }}
                                    variant="outline"
                                    className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5"
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>Copy Payment Link</span>
                                </Button>
                                <Button 
                                    onClick={async () => {
                                        const invoice = (order.metadata as any)?.invoice
                                        if (!invoice) return
                                        const { printInvoice } = await import("@/lib/pdf-generator")
                                        printInvoice(invoice, order.customerName, order.customerPhone, order.customerEmail || "", organization?.name || "Business")
                                    }}
                                    variant="outline"
                                    className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Print / PDF Invoice</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden">
                        <CardHeader className="p-4 sm:p-6 pb-2">
                            <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                <span>Generate Invoice</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 font-medium">
                                Create an invoice to accept Mobile Money and Card payments from the customer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 space-y-4">
                            <form onSubmit={async (e) => {
                                e.preventDefault()
                                setIsInvoiceGenerating(true)
                                try {
                                    const { generateInvoice } = await import("@/app/actions/invoice")
                                    await generateInvoice(order.id, {
                                        items: invoiceItems,
                                        tax,
                                        deliveryFee,
                                        discount,
                                        dueDate: dueDate || undefined,
                                        paymentMethod
                                    })
                                    toast.success("Invoice generated successfully!")
                                    window.location.reload()
                                } catch (err) {
                                    toast.error("Failed to generate invoice")
                                } finally {
                                    setIsInvoiceGenerating(false)
                                }
                            }} className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-bold text-xs text-slate-700 uppercase tracking-wider">Invoice Items</Label>
                                        <Button 
                                            type="button" 
                                            onClick={() => setInvoiceItems(prev => [...prev, { name: "", quantity: 1, price: 0 }])}
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-slate-50"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Row
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {invoiceItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it))
                                                    }}
                                                    placeholder="Item / Service description"
                                                    required
                                                    readOnly={(item as any).isLinked}
                                                    className="flex-1 h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-medium"
                                                />
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value) || 0
                                                        setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it))
                                                    }}
                                                    placeholder="Qty"
                                                    required
                                                    min="1"
                                                    className="w-16 bg-slate-50/70 border-slate-200 h-10 rounded-xl text-center text-xs font-bold"
                                                />
                                                <Input
                                                    type="number"
                                                    value={item.price || ""}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value) || 0
                                                        setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, price: val } : it))
                                                    }}
                                                    placeholder="Price"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    className="w-24 bg-slate-50/70 border-slate-200 h-10 rounded-xl text-right text-xs font-bold"
                                                />
                                                {invoiceItems.length > 1 && !(item as any).isLinked && (
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}
                                                        className="h-9 w-9 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                                                    >
                                                        <Trash className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    <div>
                                        <Label className="text-xs text-slate-600 mb-1 block">Delivery (GH₵)</Label>
                                        <Input 
                                            type="number" 
                                            value={deliveryFee || ""} 
                                            onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)} 
                                            placeholder="0"
                                            className="bg-slate-50/70 border-slate-200 h-10 rounded-xl text-right text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-600 mb-1 block">Tax (GH₵)</Label>
                                        <Input 
                                            type="number" 
                                            value={tax || ""} 
                                            onChange={(e) => {
                                                setIsTaxEdited(true)
                                                setTax(Number(e.target.value) || 0)
                                            }} 
                                            placeholder="0"
                                            className="bg-slate-50/70 border-slate-200 h-10 rounded-xl text-right text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-600 mb-1 block">Discount (GH₵)</Label>
                                        <Input 
                                            type="number" 
                                            value={discount || ""} 
                                            onChange={(e) => setDiscount(Number(e.target.value) || 0)} 
                                            placeholder="0"
                                            className="bg-slate-50/70 border-slate-200 h-10 rounded-xl text-right text-xs font-bold text-red-500"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-600 mb-1 block">Due Date</Label>
                                        <Input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={(e) => setDueDate(e.target.value)} 
                                            className="bg-slate-50/70 border-slate-200 h-10 rounded-xl text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-3 border-t border-slate-100">
                                    <Button 
                                        type="submit"
                                        disabled={isInvoiceGenerating}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 text-xs font-bold flex items-center gap-2"
                                    >
                                        {isInvoiceGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <span>Generate & Save Invoice</span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* 4. ACTIVITY TIMELINES (Mobile-First) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Customer-Facing Timeline */}
                    <Card className="bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden">
                        <CardHeader className="p-4 sm:p-5 pb-2">
                            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Customer-Facing Timeline</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 font-medium">
                                Updates visible to customer on live tracking link.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-5 pt-2">
                            <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                {order.statusHistory.map((historyItem, index) => {
                                    const theme = getStatusTheme(historyItem.status)

                                    return (
                                        <div key={index} className="relative flex gap-3.5">
                                            <div
                                                className={cn(
                                                    "w-3 h-3 mt-1 rounded-full border-2 bg-white shrink-0 z-10",
                                                    index === 0 ? "ring-4 ring-blue-100 border-blue-600" : "border-slate-300"
                                                )}
                                            />
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                                    <span>{historyItem.status}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        {new Date(historyItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(historyItem.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {historyItem.location && (
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span>{historyItem.location}</span>
                                                    </p>
                                                )}
                                                {historyItem.message && (
                                                    <p className="text-xs text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-200/50 mt-1">
                                                        {historyItem.message}
                                                    </p>
                                                )}
                                                {historyItem.performer && (
                                                    <p className="text-[10px] font-bold text-slate-400 pt-0.5 uppercase tracking-wider flex items-center gap-1">
                                                        <User className="w-2.5 h-2.5 text-slate-300" />
                                                        <span>By: {historyItem.performer.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Internal Production Logs */}
                    {order.metadata?.internalHistory && order.metadata.internalHistory.length > 0 && (
                        <Card className="bg-white border border-slate-200/80 shadow-2xs rounded-3xl overflow-hidden">
                            <CardHeader className="p-4 sm:p-5 pb-2">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                    <span>Internal Production Logs</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 font-medium">
                                    Private stage movements recorded by staff.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-5 pt-2">
                                <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                    {order.metadata.internalHistory.map((logItem, index) => (
                                        <div key={index} className="relative flex gap-3.5">
                                            <div
                                                className={cn(
                                                    "w-3 h-3 mt-1 rounded-full border-2 bg-white shrink-0 z-10",
                                                    index === 0 ? "ring-4 ring-purple-100 border-purple-600" : "border-slate-300"
                                                )}
                                            />
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                                    <span>Moved to {logItem.stage}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        {new Date(logItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(logItem.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {logItem.performer && (
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                        <User className="w-3 h-3 text-purple-500 shrink-0" />
                                                        <span>By {logItem.performer.name} {logItem.performer.role ? `(${logItem.performer.role})` : ""}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Momo Direct Payment Prompt Modal */}
            <Dialog open={isMomoModalOpen} onOpenChange={setIsMomoModalOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-white shadow-2xl rounded-3xl p-5 sm:p-6 overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Initiate Mobile Money Payment
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    Direct PIN prompt to customer phone
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="orderMomoPhone" className="text-xs font-bold text-slate-700">Momo Phone Number</Label>
                            <Input 
                                id="orderMomoPhone"
                                value={momoPhone} 
                                onChange={(e) => setMomoPhone(e.target.value)} 
                                placeholder="e.g. 0244000000" 
                                className="h-11 rounded-2xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-semibold text-slate-900"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="orderMomoProvider" className="text-xs font-bold text-slate-700">Network Provider</Label>
                            <Select 
                                value={momoProvider} 
                                onValueChange={(val: 'mtn' | 'vod' | 'atl') => setMomoProvider(val)}
                                disabled={!!detectGhanaNetworkProvider(momoPhone)}
                            >
                                <SelectTrigger id="orderMomoProvider" className="h-11 rounded-2xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-bold text-slate-900">
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
                                        toast.success("Mobile Money Prompt sent successfully to customer!")
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
                            className="w-full text-white rounded-2xl h-11 sm:h-12 font-bold text-xs sm:text-sm shadow-md bg-blue-600 hover:bg-blue-700 border-0"
                        >
                            {isMomoCharging ? "Sending Prompt to Phone..." : "Send Momo Prompt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
