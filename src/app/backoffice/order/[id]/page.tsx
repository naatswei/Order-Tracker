"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/storage"
import { getOrderWithHistory, updateOrderStatus } from "@/app/actions/orders"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, MapPin, Clock, User, Phone, Mail, Shirt, Package, Loader2, DollarSign, FileText, Plus, Trash, Download, Link2, CheckCircle } from "lucide-react"
import { UserButton, OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { getBusinessConfig } from "@/lib/business-configs"
import { BackofficeHeader } from "@/components/backoffice-header"
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
        internalStage?: string;
        internalHistory?: {
            stage: string;
            performer: StaffPerformer | null;
            timestamp: string;
        }[];
    } | null;
}

export default function OrderUpdatePage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.id as string

    const [order, setOrder] = useState<OrderWithPerformerAndMetadata | null>(null)
    const [loading, setLoading] = useState(true)

    // Form state
    const [status, setStatus] = useState("")
    const [location, setLocation] = useState("")
    const [message, setMessage] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)

    // Invoice form state
    const [invoiceItems, setInvoiceItems] = useState<{ name: string; quantity: number; price: number }[]>([])
    const [tax, setTax] = useState(0)
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [dueDate, setDueDate] = useState("")
    const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false)

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)
    const quickStatuses = config.statuses

    useEffect(() => {
        // Prioritize organization metadata
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

    useEffect(() => {
        if (orderId) {
            setLoading(true)
            getOrderWithHistory(orderId).then(foundOrder => {
                if (foundOrder) {
                    // Map DB fields to Order type
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
                            category: link.inventoryItem?.category
                        })) || []
                    }
                    setOrder(mappedOrder)

                    // Pre-fill invoice items
                    if (foundOrder.inventoryLinks && foundOrder.inventoryLinks.length > 0) {
                        const items = foundOrder.inventoryLinks.map((link: any) => ({
                            name: link.inventoryItem?.name || "Product",
                            quantity: Number(link.quantity) || 1,
                            price: Number(link.inventoryItem?.sellingPrice) || Number(link.inventoryItem?.unitCost) || 0,
                            isLinked: true
                        }))
                        setInvoiceItems(items)
                    } else {
                        setInvoiceItems([{ name: foundOrder.itemType || "Garment/Service", quantity: 1, price: 0, isLinked: false }])
                    }
                }
                setLoading(false)
            }).catch(err => {
                console.error("Error fetching order:", err)
                setLoading(false)
            })
        }
    }, [orderId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!status) {
            toast.error("Please enter a status")
            return
        }

        setIsUpdating(true)
        try {
            await updateOrderStatus(orderId, status, location || "Main Office", message || "Status updated")
            toast.success("Status updated successfully!")
            router.push("/backoffice")
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update status"
            toast.error(errorMessage)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleQuickStatus = (statusText: string) => {
        setStatus(statusText)
    }

    const handleClear = () => {
        setStatus("")
        setLocation("")
        setMessage("")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9FCFF] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground animate-pulse">Loading order...</p>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F9FCFF] flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white/40 border-white/50 backdrop-blur-md shadow-xl">
                    <CardContent className="py-12 text-center space-y-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-red-500 opacity-60" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Order Not Found</h2>
                        <p className="text-muted-foreground">The order you requested could not be found.</p>
                        <Button asChild size="lg" className="rounded-full shadow-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" variant="outline">
                            <Link href="/backoffice">Back to Dashboard</Link>
                        </Button>

                    </CardContent>
                </Card>
            </div>
        )
    }

    const getStatusColor = (statusText: string) => {
        if (statusText.toLowerCase().includes("delivered") || statusText.toLowerCase().includes("completed")) {
            return "text-green-600 bg-green-50 border-green-200"
        }
        if (statusText.toLowerCase().includes("ready") || statusText.toLowerCase().includes("picked") || statusText.toLowerCase().includes("transit") || statusText.toLowerCase().includes("dispatched")) {
            return "text-blue-600 bg-blue-50 border-blue-200"
        }
        return "text-slate-600 bg-slate-50 border-slate-200"
    }

    return (
        <div className="min-h-screen bg-[#F9FCFF] font-sans selection:bg-blue-100 pb-20">
            {/* Header */}
            <BackofficeHeader config={config} />


            <div className="container mx-auto px-4 pt-16 sm:pt-20 pb-8 sm:pb-12 max-w-6xl space-y-6">


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                    {/* Back Button */}
                    <div className="flex items-center justify-between col-span-1 lg:col-span-12">
                        <Button
                            asChild
                            variant="outline"
                            className="gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <Link href="/backoffice">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </Link>
                        </Button>

                    </div>
                    {/* Left Column - Order Info */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Order Summary Card */}
                        <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                            <div className="p-6 border-l-4" style={{ borderLeftColor: config.theme.accent }}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Package className="w-5 h-5" style={{ color: config.theme.primary }} />
                                        <div>
                                            <div className="text-xs text-slate-500 font-medium">Order Number</div>
                                            <div className="text-base sm:text-lg font-bold text-slate-900">{order.orderNumber}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <div className="text-xs text-slate-500 mb-2">Current Status</div>
                                    <Badge variant="outline" className={`rounded-full px-3 sm:px-4 py-1 sm:py-1.5 font-medium border text-[11px] sm:text-xs ${getStatusColor(order.currentStatus)}`}>
                                        {order.currentStatus}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="text-[13px] sm:text-sm text-slate-600 font-medium">{order.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shirt className="w-4 h-4 text-slate-400" />
                                        <span className="text-[13px] sm:text-sm text-slate-600 font-medium capitalize">{order.garmentType}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-[13px] sm:text-sm text-slate-600 font-medium">{order.customerPhone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-[13px] sm:text-sm text-slate-600 font-medium truncate" title={order.customerEmail}>{order.customerEmail}</span>
                                    </div>
                                    {order.inventoryItems && order.inventoryItems.length > 0 && (
                                        <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Items Sold</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {order.inventoryItems.map((item, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs font-bold bg-emerald-50/50 border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                        <span className="font-black">{item.quantity}</span> x <span>{item.name}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Status History Card */}
                        <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    Customer-Facing Timeline
                                </CardTitle>
                                <CardDescription>Timeline visible to the customer on the tracking page</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative pl-4 space-y-8 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                    {order.statusHistory.map((historyItem, index) => (
                                        <div key={index} className="relative flex gap-4">
                                            <div
                                                className={`w-3.5 h-3.5 mt-1.5 rounded-full border-2 bg-white shrink-0 z-10 ${index === 0 ? "ring-4" : "border-slate-300"}`}
                                                style={{
                                                    borderColor: index === 0 ? config.theme.primary : undefined,
                                                    backgroundColor: index === 0 ? '#fff' : undefined,
                                                    boxShadow: index === 0 ? `0 0 0 4px ${config.theme.primary}1A` : undefined
                                                }}
                                            />
                                            <div className="space-y-1">
                                                <div className="text-[13px] sm:text-sm font-bold text-slate-900">{historyItem.status}</div>
                                                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500">
                                                    <MapPin className="w-3 h-3" /> {historyItem.location || "Main Office"}
                                                </div>
                                                {historyItem.message && (
                                                    <div className="text-xs text-slate-600 leading-relaxed max-w-[200px]">{historyItem.message}</div>
                                                )}
                                                {historyItem.performer && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                                        <User className="w-2.5 h-2.5 text-slate-300" /> Action by: {historyItem.performer.name} {historyItem.performer.role ? `(${historyItem.performer.role})` : ""}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-400 pt-1">{new Date(historyItem.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Internal Production Logs Card */}
                        {order.metadata?.internalHistory && order.metadata.internalHistory.length > 0 && (
                            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-violet-500" />
                                        Internal Production Logs
                                    </CardTitle>
                                    <CardDescription>Private timeline for business owner & staff members only</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative pl-4 space-y-8 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                        {order.metadata.internalHistory.map((logItem, index) => (
                                            <div key={index} className="relative flex gap-4">
                                                <div
                                                    className={`w-3.5 h-3.5 mt-1.5 rounded-full border-2 bg-white shrink-0 z-10 ${index === 0 ? "ring-4 border-violet-500 ring-violet-100" : "border-slate-300"}`}
                                                    style={{
                                                        borderColor: index === 0 ? '#8b5cf6' : undefined,
                                                        backgroundColor: index === 0 ? '#fff' : undefined,
                                                        boxShadow: index === 0 ? '0 0 0 4px #8b5cf61A' : undefined
                                                    }}
                                                />
                                                <div className="space-y-1">
                                                    <div className="text-[13px] sm:text-sm font-bold text-slate-900">Moved to {logItem.stage}</div>
                                                    {logItem.performer && (
                                                        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500">
                                                            <User className="w-3 h-3 text-violet-400" /> By {logItem.performer.name} {logItem.performer.role ? `(${logItem.performer.role})` : ""}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 pt-1">{new Date(logItem.timestamp).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Invoices & Status Update */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Invoice & Billing Section */}
                        {order.metadata?.invoice ? (
                            /* Display Existing Invoice */
                            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-indigo-500" />
                                            Invoice: {order.metadata.invoice.invoiceNumber}
                                        </CardTitle>
                                        <CardDescription>Created on {new Date(order.metadata.invoice.createdAt).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <Badge className={cn(
                                        "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                                        order.metadata.invoice.invoiceStatus === "paid" 
                                            ? "bg-emerald-50 border border-emerald-200 text-emerald-600 animate-pulse" 
                                            : "bg-amber-50 border border-amber-200 text-amber-600"
                                    )}>
                                        {order.metadata.invoice.invoiceStatus}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-400 font-bold border-b border-slate-100">
                                                    <th className="pb-3 text-left">Item Description</th>
                                                    <th className="pb-3 text-center">Qty</th>
                                                    <th className="pb-3 text-right">Price</th>
                                                    <th className="pb-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {order.metadata.invoice.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="text-slate-700">
                                                        <td className="py-3 font-medium">{item.name}</td>
                                                        <td className="py-3 text-center">{item.quantity}</td>
                                                        <td className="py-3 text-right">GH₵ {item.price.toFixed(2)}</td>
                                                        <td className="py-3 text-right font-semibold">GH₵ {(item.price * item.quantity).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <div className="w-64 space-y-2.5 text-sm">
                                            <div className="flex justify-between text-slate-500">
                                                <span>Subtotal</span>
                                                <span className="font-semibold">GH₵ {order.metadata.invoice.subtotal.toFixed(2)}</span>
                                            </div>
                                            {order.metadata.invoice.tax > 0 && (
                                                <div className="flex justify-between text-slate-500">
                                                    <span>Tax</span>
                                                    <span className="font-semibold">GH₵ {order.metadata.invoice.tax.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {order.metadata.invoice.deliveryFee > 0 && (
                                                <div className="flex justify-between text-slate-500">
                                                    <span>Delivery</span>
                                                    <span className="font-semibold">GH₵ {order.metadata.invoice.deliveryFee.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {order.metadata.invoice.discount > 0 && (
                                                <div className="flex justify-between text-red-500">
                                                    <span>Discount</span>
                                                    <span className="font-semibold">- GH₵ {order.metadata.invoice.discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-100 pt-3">
                                                <span>Total Amount Due</span>
                                                <span>GH₵ {order.metadata.invoice.amountDue.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                                        {order.metadata.invoice.invoiceStatus === "unpaid" && (
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
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Mark as Paid
                                            </Button>
                                        )}
                                        <Button 
                                            onClick={() => {
                                                const url = `${window.location.origin}/track/${order.id}`
                                                navigator.clipboard.writeText(url)
                                                toast.success("Payment/Tracking link copied to clipboard!")
                                            }}
                                            variant="outline"
                                            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-6 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                                        >
                                            <Link2 className="w-4 h-4" />
                                            Copy Payment Link
                                        </Button>
                                        <Button 
                                            onClick={async () => {
                                                const invoice = order.metadata?.invoice
                                                if (!invoice) return
                                                const { printInvoice } = await import("@/lib/pdf-generator")
                                                printInvoice(invoice, order.customerName, order.customerPhone, order.customerEmail || "")
                                            }}
                                            variant="outline"
                                            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-6 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                                        >
                                            <Download className="w-4 h-4" />
                                            Print / PDF Invoice
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            /* Invoice Generation Form */
                            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
                                <CardHeader className="p-6">
                                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                        Generate Invoice
                                    </CardTitle>
                                    <CardDescription>Create a digital payment request for this order.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
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
                                                dueDate: dueDate || undefined
                                            })
                                            toast.success("Invoice generated successfully!")
                                            window.location.reload()
                                        } catch (err) {
                                            toast.error("Failed to generate invoice")
                                        } finally {
                                            setIsInvoiceGenerating(false)
                                        }
                                    }} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <Label className="font-bold text-slate-700">Invoice Items</Label>
                                                <Button 
                                                    type="button" 
                                                    onClick={() => setInvoiceItems(prev => [...prev, { name: "", quantity: 1, price: 0 }])}
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
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
                                                            placeholder="Item/Service name"
                                                            required
                                                            readOnly={(item as any).isLinked}
                                                            className={`flex-1 h-10 rounded-xl ${(item as any).isLinked ? "bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-50 border-slate-200"}`}
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
                                                            className="w-16 bg-slate-50 border-slate-200 h-10 rounded-xl text-center focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value) || 0
                                                                setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, price: val } : it))
                                                            }}
                                                            placeholder="Price"
                                                            required
                                                            min="0"
                                                            className="w-24 h-10 rounded-xl text-right bg-slate-50 border-slate-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                                        />
                                                        {invoiceItems.length > 1 && (
                                                            <Button 
                                                                type="button"
                                                                onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full w-9 h-9 cursor-pointer"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700" htmlFor="tax">Tax (GH₵)</Label>
                                                <Input 
                                                    type="number" 
                                                    id="tax" 
                                                    value={tax || ""}
                                                    onChange={(e) => setTax(Number(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="bg-slate-50 border-slate-200 h-10 rounded-xl text-right"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700" htmlFor="deliveryFee">Delivery (GH₵)</Label>
                                                <Input 
                                                    type="number" 
                                                    id="deliveryFee" 
                                                    value={deliveryFee || ""}
                                                    onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="bg-slate-50 border-slate-200 h-10 rounded-xl text-right"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700" htmlFor="discount">Discount (GH₵)</Label>
                                                <Input 
                                                    type="number" 
                                                    id="discount" 
                                                    value={discount || ""}
                                                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="bg-slate-50 border-slate-200 h-10 rounded-xl text-right text-red-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700" htmlFor="dueDate">Due Date</Label>
                                                <Input 
                                                    type="date" 
                                                    id="dueDate" 
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="bg-slate-50 border-slate-200 h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <Button 
                                                type="submit"
                                                disabled={isInvoiceGenerating}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-8 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {isInvoiceGenerating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    "Generate & Save Invoice"
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Status Update Form */}
                        <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold text-slate-900">Add New Status Update</CardTitle>
                                <CardDescription>Enter custom status details or use quick options below</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Quick Options */}
                                <div>
                                    <div className="text-sm font-medium text-slate-500 mb-4">Quick Status Options</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {quickStatuses.map((qs: string) => (
                                            <button
                                                key={qs}
                                                type="button"
                                                onClick={() => handleQuickStatus(qs)}
                                                className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm border text-center ${status === qs ? "text-white border-0" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                                                style={{ backgroundColor: status === qs ? config.theme.accent : undefined }}
                                            >
                                                {qs}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Status <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            placeholder="Enter custom status"
                                            className="h-12 bg-slate-50 border-slate-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Location</Label>
                                        <Input
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="e.g., Main Office, Factory"
                                            className="h-12 bg-slate-50 border-slate-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Status message</Label>
                                        <Textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Detailed message for customer"
                                            className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 resize-none"
                                        />
                                        <p className="text-xs text-slate-400">This message will be visible to the customers.</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={!status || isUpdating}
                                            className={`order-1 sm:order-2 flex-1 h-12 text-base font-semibold rounded-lg transition-all text-white border-0`}
                                            style={{ backgroundColor: status ? config.theme.accent : '#f1f5f9' }}
                                        >
                                            {isUpdating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                "Add Status Update"
                                            )}
                                        </Button>
                                        <Button type="button" onClick={handleClear} variant="outline" size="lg" className="order-2 sm:order-1 w-full sm:w-auto px-8 h-12 text-base font-medium rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700">
                                            Clear
                                        </Button>
                                    </div>
                                </form>

                                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 border border-blue-100">
                                    <span className="font-bold shrink-0">Note:</span>
                                    <span>Status update will be visible to customer on their tracking page.</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
