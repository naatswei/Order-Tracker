"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type Order } from "@/lib/storage"
import { getOrders, bulkUpdateOrderStatus } from "@/app/actions/orders"
import Link from "next/link"
import { ArrowLeft, Package, Check, X, Loader2, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs"
import { getBusinessConfig } from "@/lib/business-configs"
import { BackofficeHeader } from "@/components/backoffice-header"
import { getPlanLimits } from "@/lib/plan-config"
import { RenewalBanner } from "@/components/renewal-banner"


export default function BulkUpdatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            </div>
        }>
            <BulkUpdateContent />
        </Suspense>
    )
}

function BulkUpdateContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Get filters from search params
    const statusFilter = searchParams.get("status")
    const searchQuery = searchParams.get("search")

    // Business Config
    const { organization, isLoaded } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)
    const QUICK_STATUSES = config.statuses

    const [orders, setOrders] = useState<Order[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // View State
    const [isUpdating, setIsUpdating] = useState(false)

    // Form State
    const [selectedStatus, setSelectedStatus] = useState("")
    const [customStatus, setCustomStatus] = useState("")
    const [location, setLocation] = useState("")
    const [message, setMessage] = useState("")

    useEffect(() => {
        // 1. Initial load from localStorage for immediate UI consistency
        const storedType = localStorage.getItem("businessType")
        if (storedType) {
            setBusinessType(storedType)
        }

        // 2. Sync from organization metadata IF AND ONLY IF we don't have a local selection
        const orgBusinessType = organization?.publicMetadata?.businessType as string
        if (orgBusinessType && !storedType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        }

        if (isLoaded) {
            loadOrders()
        }
    }, [organization, isLoaded])

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            </div>
        )
    }

    // Plan-based feature check
    const planName = organization?.publicMetadata?.subscriptionPlan as string | undefined
    const planLimits = getPlanLimits(planName)

    // Subscription status
    const subscriptionStatus = organization?.publicMetadata?.subscriptionStatus as string
    const subscriptionExpiry = organization?.publicMetadata?.subscriptionExpiry as string
    const isSubscriptionActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
    const isExpired = subscriptionExpiry ? new Date() > new Date(subscriptionExpiry) : false

    if (!planLimits.bulkUpdates) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-primary/20">
                <BackofficeHeader config={config} />
                <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-center space-y-8 relative overflow-hidden">
                        {/* Decorative background blur */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-blue-50/50 flex items-center justify-center mx-auto border border-blue-100/50 mb-6">
                                <Package className="w-10 h-10 text-blue-500" strokeWidth={1.5} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-slate-400" strokeWidth={2} />
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Updates</h2>
                            <p className="text-slate-500 text-[15px] leading-relaxed">
                                Save hours of manual work. Update dozens of order statuses and notify all your customers with a single click.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-3 relative z-10">
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Premium Feature</p>
                            <p className="text-sm text-slate-600">
                                Bulk order updates are available on the <strong className="text-slate-900">2 Weeks</strong> plan and above. Upgrade your workspace to unlock this feature.
                            </p>
                        </div>

                        <Link href="/backoffice/profile?tab=subscription" className="block relative z-10">
                            <Button className="w-full bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold rounded-xl h-12 shadow-lg shadow-[#191A43]/10 transition-all hover:-translate-y-0.5">
                                View Upgrade Plans
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const loadOrders = async () => {
        setIsLoading(true)
        try {
            const allOrders = await getOrders()
            
            const errorItem = allOrders.find(o => (o as any).__isError);
            if (errorItem) {
                toast.error(`Failed to load orders: ${(errorItem as any).message}`);
                setIsLoading(false);
                return;
            }

            const mappedOrders: Order[] = (allOrders as Record<string, unknown>[]).map(o => ({
                id: o.id as string,
                orderNumber: o.orderNumber as string,
                customerName: o.customerName as string,
                customerEmail: (o.customerEmail as string) || "",
                customerPhone: o.customerPhone as string,
                garmentType: o.itemType as string,
                measurements: (o.measurements as string) || "",
                currentStatus: o.currentStatus as string,
                createdAt: o.createdAt as Date,
                updatedAt: o.updatedAt as Date,
                businessType: o.businessType as string,
                pickupDate: o.pickupDate as string,
                statusHistory: [],
            }))

            let filteredOrders: Order[] = mappedOrders

            // Apply filters if they exist
            if (statusFilter) {
                filteredOrders = filteredOrders.filter(o => o.currentStatus === statusFilter)
            } else if (searchQuery) {
                const query = searchQuery.toLowerCase()
                filteredOrders = filteredOrders.filter(o =>
                    o.customerName.toLowerCase().includes(query) ||
                    o.orderNumber.toLowerCase().includes(query) ||
                    o.id.toLowerCase().includes(query)
                )
            }

            setOrders(filteredOrders)

            // Pre-select all if a filter is active
            if (statusFilter || searchQuery) {
                setSelectedIds(filteredOrders.map(o => o.id))
            }
        } catch (error) {
            console.error("Failed to load orders:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(orders.map(o => o.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const copyTrackingLink = (id: string) => {
        const link = `${window.location.origin}/track/${id}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        toast.success("Link copied to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }


    const handleBulkUpdateClick = () => {
        setIsUpdating(true)
    }

    const handleClearSelection = () => {
        setSelectedIds([])
        setIsUpdating(false)
    }

    const handleQuickStatusClick = (status: string) => {
        setSelectedStatus(status)
        setCustomStatus(status) // Auto-fill custom input
    }

    const handleSubmitUpdate = async () => {
        if (!customStatus) {
            toast.error("Please select or enter a status")
            return
        }

        setIsSubmitting(true)
        try {
            await bulkUpdateOrderStatus(
                selectedIds,
                customStatus,
                location || config.defaultLocation,
                message || `Order status updated to ${customStatus}`
            )
            toast.success(`Successfully updated ${selectedIds.length} orders`)
            router.push("/backoffice")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update orders"
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClearForm = () => {
        setSelectedStatus("")
        setCustomStatus("")
        setLocation("")
        setMessage("")
    }

    const getStatusColor = (status: string) => {
        if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("completed")) {
            return "bg-green-100 text-green-700 border-green-200"
        }
        if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked") || status.toLowerCase().includes("dispatched")) {
            return "bg-blue-100 text-blue-700 border-blue-200"
        }
        return "bg-zinc-100 text-zinc-700 border-zinc-200"
    }

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <BackofficeHeader config={config} />

            {/* Renewal Banner */}
            {(!isSubscriptionActive || isExpired) && (
                <RenewalBanner 
                    status={isExpired ? 'expired' : (organization?.publicMetadata?.subscriptionStatus === 'trialing' ? 'trial_ended' : 'inactive')} 
                />
            )}

            <div className="container mx-auto px-4 pt-10 sm:pt-12 pb-6 sm:pb-8 max-w-[1400px] space-y-6">

                {/* Header - Only show back button in List View */}
                {!isUpdating && (
                    <div className="flex items-center justify-between">
                        <Button
                            asChild
                            variant="outline"
                            className="gap-2 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-300 rounded-xl h-10 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:-translate-y-0.5"
                        >
                            <Link href="/backoffice">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </Link>
                        </Button>

                    </div>
                )}

                {!isUpdating ? (
                    <>
                        <div className="flex justify-end">
                            <Button
                                className="text-white rounded-xl h-11 px-6 shadow-sm font-medium border-0 hover:brightness-95 transition-all duration-200"
                                style={{ backgroundColor: config.theme.primary }}
                                onClick={handleBulkUpdateClick}
                                disabled={selectedIds.length === 0}
                            >
                                Bulk Update ({selectedIds.length})
                            </Button>
                        </div>

                        {/* Select All Bar */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-slate-500 ml-1">Click to select all</h3>
                            <div
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl h-16 flex items-center px-6 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={toggleSelectAll}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.length === orders.length && orders.length > 0 ? 'border-transparent' : 'border-slate-300 bg-white'}`}
                                        style={{ backgroundColor: selectedIds.length === orders.length && orders.length > 0 ? config.theme.primary : undefined }}
                                    >
                                        {selectedIds.length === orders.length && orders.length > 0 && <span className="text-white text-lg leading-none pb-1">✓</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Orders List */}
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-20 bg-white border border-dashed rounded-xl">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                                    <p className="text-slate-400">Loading orders...</p>
                                </div>
                            ) : (
                                <>
                                    {orders.map((order) => (
                                        <div
                                            key={order.id}
                                            className={`w-full bg-white border rounded-xl p-4 md:p-6 transition-all shadow-sm hover:shadow-md ${selectedIds.includes(order.id) ? 'border-primary/40 bg-primary/5' : 'border-slate-100'}`}
                                        >
                                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

                                                {/* Checkbox */}
                                                <div
                                                    className="mt-1 md:mt-0 cursor-pointer p-2 -ml-2 hover:bg-slate-100 rounded-full"
                                                    onClick={() => toggleSelectOne(order.id)}
                                                >
                                                    <div
                                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(order.id) ? 'border-transparent' : 'border-slate-300 bg-white'}`}
                                                        style={{ backgroundColor: selectedIds.includes(order.id) ? config.theme.primary : undefined, borderColor: selectedIds.includes(order.id) ? config.theme.primary : undefined }}
                                                    >
                                                        {selectedIds.includes(order.id) && <span className="text-white text-lg leading-none pb-1">✓</span>}
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="font-bold text-slate-900 text-lg">{order.orderNumber}</span>
                                                        <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-normal text-xs border ${getStatusColor(order.currentStatus)}`}>
                                                            {order.currentStatus}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-8 text-[15px] text-slate-600">
                                                        <div className="flex gap-2">
                                                            <span className="text-slate-400 w-36 shrink-0 whitespace-nowrap">Customer:</span>
                                                            <span className="font-medium text-slate-900">{order.customerName}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-slate-400 w-36 shrink-0 whitespace-nowrap">Contact:</span>
                                                            <span className="font-medium text-slate-900">{order.customerPhone}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-slate-400 w-36 shrink-0 whitespace-nowrap">{config.itemLabel}:</span>
                                                            <span className="font-medium text-slate-900 whitespace-nowrap">{order.itemType}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-slate-400 w-36 shrink-0 whitespace-nowrap">Delivery Date:</span>
                                                            <span className="font-medium text-red-400">{order.pickupDate ? new Date(order.pickupDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs text-slate-300 pt-1">
                                                        Created: {new Date(order.createdAt).toLocaleString()}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 border-slate-100">
                                                    {!isSubscriptionActive || isExpired ? (
                                                        <Button
                                                            disabled
                                                            className="w-full text-white text-xs h-8 rounded-xl border-0 opacity-50 cursor-not-allowed"
                                                            style={{ backgroundColor: "#94a3b8" }}
                                                        >
                                                            Update Status
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            asChild
                                                            className="w-full text-white text-xs h-8 rounded-xl border-0"
                                                            style={{ backgroundColor: config.theme.secondary }}
                                                        >
                                                            <Link href={`/backoffice/order/${order.id}`}>
                                                                Update Status
                                                            </Link>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="outline"
                                                        className="w-full text-xs h-8 rounded-lg bg-white border-slate-200 text-slate-700"
                                                        onClick={() => copyTrackingLink(order.id)}
                                                    >
                                                        Copy Link
                                                    </Button>

                                                    {!isSubscriptionActive || isExpired ? (
                                                        <Button
                                                            disabled
                                                            className="w-full text-xs h-8 rounded-xl text-white mt-1 border-0 opacity-50 cursor-not-allowed"
                                                            style={{ backgroundColor: "#94a3b8" }}
                                                        >
                                                            Edit Order
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            asChild
                                                            className="w-full text-xs h-8 rounded-xl text-white mt-1 border-0"
                                                            style={{ backgroundColor: config.theme.primary }}
                                                        >
                                                            <Link href={`/backoffice/create?edit=${order.id}`}>
                                                                Edit Order
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    ))}

                                    {orders.length === 0 && (
                                        <div className="text-center py-20 text-slate-400">
                                            No orders found.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* Update View matching the image */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Selected Header */}
                        <div className="rounded-xl p-4 flex items-center justify-between border" style={{ backgroundColor: `${config.theme.primary}0D`, borderColor: `${config.theme.primary}1A` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.theme.primary }}>
                                    <Check className="text-white w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-lg">{selectedIds.length} orders selected</h2>
                                    <p className="text-xs text-slate-500">Ready for bulk update</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-9"
                                onClick={handleClearSelection}
                            >
                                <X className="w-4 h-4" />
                                Clear selection
                            </Button>
                        </div>

                        {/* Main Form Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">

                            {/* Quick Status Options */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-700">Quick Status Options</h3>
                                <div className="flex flex-wrap gap-3">
                                    {QUICK_STATUSES.map((status) => (
                                        <Button
                                            key={status}
                                            variant="outline"
                                            onClick={() => handleQuickStatusClick(status)}
                                            className={`h-11 px-6 rounded-lg border text-sm font-medium transition-all duration-200 ${selectedStatus === status
                                                ? "text-white shadow-md border-0 hover:brightness-95"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                                }`}
                                            style={selectedStatus === status ? { backgroundColor: config.theme.accent } : undefined}
                                        >
                                            {status}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-6">

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">Status <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={customStatus}
                                        onChange={(e) => setCustomStatus(e.target.value)}
                                        placeholder="Enter custom status"
                                        className="h-12 bg-slate-50 border-slate-200 rounded-lg focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">Location</Label>
                                    <Input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Main Office, Factory"
                                        className="h-12 bg-slate-50 border-slate-200 rounded-lg focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">Status message</Label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Detailed message for customer"
                                        className="min-h-[100px] bg-slate-50 border-slate-200 rounded-lg focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 resize-none p-4"
                                    />
                                    <p className="text-[11px] text-slate-400">This message will be visible to the customers.</p>
                                </div>

                            </div>

                            {/* Actions */}
                            <div className="flex flex-col md:flex-row gap-4 pt-4">
                                <Button
                                    className={`flex-1 h-12 rounded-lg font-semibold text-base transition-all duration-200 border-0 text-white shadow-md ${customStatus ? 'hover:brightness-95' : 'bg-slate-200 cursor-not-allowed'}`}
                                    style={{ backgroundColor: customStatus && !isSubmitting ? config.theme.accent : undefined }}
                                    onClick={handleSubmitUpdate}
                                    disabled={!customStatus || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Add Status Update"
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full md:w-32 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-12 rounded-lg font-medium"
                                    onClick={handleClearForm}
                                    disabled={isSubmitting}
                                >
                                    Clear
                                </Button>
                            </div>

                            {/* Footer Note */}
                            <div className="rounded-lg p-4 text-center border" style={{ backgroundColor: `${config.theme.primary}0D`, borderColor: `${config.theme.primary}1A` }}>
                                <p className="text-xs font-medium" style={{ color: config.theme.primary }}>
                                    <span className="font-bold">Note:</span> Status update will be visible to customer on their tracking page.
                                </p>
                            </div>

                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
