"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateTrackingId, type Order } from "@/lib/storage"
import { createOrder, getOrderById, updateOrder } from "@/app/actions/orders"
import { getInventory } from "@/app/actions/operations"
import Link from "next/link"
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { BackofficeHeader } from "@/components/backoffice-header"
import { Package, ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Search, Boxes } from "lucide-react"
import { RenewalBanner } from "@/components/renewal-banner"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { getBusinessConfig } from "@/lib/business-configs"
import { DatePicker } from "@/components/ui/date-picker"
import { format, parse } from "date-fns"

function CreateOrderContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [orderNumber, setOrderNumber] = useState("")
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [itemType, setItemType] = useState("")
    const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined)
    const [measurements, setMeasurements] = useState("")
    const [metadata, setMetadata] = useState<Record<string, unknown>>({})
    const [isSaving, setIsSaving] = useState(false)
    
    // Inventory state
    const [allInventory, setAllInventory] = useState<any[]>([])
    const [selectedInventory, setSelectedInventory] = useState<{ id: string, name: string, quantity: string, max: number }[]>([])
    const [inventorySearch, setInventorySearch] = useState("")

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

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

        const editId = searchParams.get("edit")
        if (editId) {
            getOrderById(editId).then(orderToEdit => {
                if (orderToEdit) {
                    setEditingId(orderToEdit.id)
                    setOrderNumber(orderToEdit.orderNumber)
                    setCustomerName(orderToEdit.customerName)
                    setCustomerEmail(orderToEdit.customerEmail || "")
                    setCustomerPhone(orderToEdit.customerPhone)
                    setItemType(orderToEdit.itemType)
                    if (orderToEdit.pickupDate) {
                        try {
                            // Try parsing standard format or ISO
                            const parsedDate = new Date(orderToEdit.pickupDate)
                            if (!isNaN(parsedDate.getTime())) {
                                setPickupDate(parsedDate)
                            }
                        } catch (e) {
                            console.error("Failed to parse date", e)
                        }
                    }
                    setMeasurements(orderToEdit.measurements || "")
                    setMetadata(orderToEdit.metadata as Record<string, unknown> || {})
                }
            })
        }

        // Fetch inventory
        getInventory().then(items => setAllInventory(items))
    }, [searchParams, organization])

    // Auto-match inventory logic
    useEffect(() => {
        if (!itemType || editingId || allInventory.length === 0) return;
        
        const trimmedType = itemType.trim().toLowerCase();
        const match = allInventory.find(inv => 
            inv.name.toLowerCase() === trimmedType || 
            inv.sku?.toLowerCase() === trimmedType
        );

        if (match) {
            const alreadySelected = selectedInventory.find(s => s.id === match.id);
            if (!alreadySelected) {
                setSelectedInventory(prev => [...prev, { 
                    id: match.id, 
                    name: match.name, 
                    quantity: "1",
                    max: parseFloat(match.quantity) - parseFloat(match.reserved || "0")
                }]);
                toast.success(`Matched "${match.name}"`, {
                    description: "Automatically reserved 1 unit from inventory.",
                    duration: 3000,
                });
            }
        }
    }, [itemType, allInventory, editingId]);

    const isSubscriptionActive = 
        organization?.publicMetadata?.subscriptionStatus === "active" || 
        organization?.publicMetadata?.subscriptionStatus === "trialing"
    
    const subscriptionExpiry = organization?.publicMetadata?.subscriptionExpiry as string
    const expiryDate = subscriptionExpiry ? new Date(subscriptionExpiry) : null
    const isExpired = expiryDate ? new Date() > expiryDate : false
    const canCreateOrder = isSubscriptionActive && !isExpired

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!canCreateOrder) {
            toast.error("Your subscription has expired. Please renew to continue.")
            router.push("/onboarding/subscription")
            return
        }

        // Prevent extremely rapid double-clicks
        if (isSaving) return

        // Validate pickup date is not in the past
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (pickupDate && pickupDate < today) {
            toast.error("Delivery date cannot be in the past.")
            setIsSaving(false)
            return
        }

        setIsSaving(true)

        try {
            if (editingId) {
                await updateOrder(editingId, {
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    itemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements,
                    metadata,
                })
                toast.success("Order details updated")
            } else {
                await createOrder({
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    itemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements,
                    metadata,
                    businessType: localStorage.getItem("businessType") || "tailoring",
                    currentStatus: config.defaultStatus,
                    inventoryItems: selectedInventory.map(item => ({ id: item.id, quantity: item.quantity })),
                })
                toast.success("New order created")
            }
            // Do NOT setIsSaving(false) on success to prevent double-clicks during route transition
            router.push("/backoffice")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save order"
            toast.error(message)
            setIsSaving(false)
        }
    }

    const hasRequiredFields =
        customerName.trim() !== "" &&
        customerPhone.trim() !== "" &&
        itemType.trim() !== "" &&
        pickupDate !== undefined

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <BackofficeHeader config={config} />

            {/* Renewal Banner */}
            {!canCreateOrder && (
                <RenewalBanner 
                    status={isExpired ? 'expired' : (organization?.publicMetadata?.subscriptionStatus === 'trialing' ? 'trial_ended' : 'inactive')} 
                />
            )}

            <div className="container mx-auto px-4 py-8 max-w-[1400px] space-y-6">
                <div>
                    <Button
                        asChild
                        variant="outline"
                        className="gap-2 mb-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-300 rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:-translate-y-0.5"
                    >
                        <Link href="/backoffice">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </Button>


                </div>

                <Card className="border-white/50 bg-white/60 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden mb-4">
                    <CardHeader className="bg-primary/5 pb-8 pt-6">
                        <CardTitle className="text-xl">{editingId ? "Edit Order Details" : "New Order Entry"}</CardTitle>
                        <CardDescription>Enter order details to verify and generate a tracking link.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-customerName`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Customer Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id={`${businessType}-customerName`}
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Naa"
                                        required
                                        disabled={!canCreateOrder}
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-customerPhone`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Customer Contact <span className="text-red-500">*</span></Label>
                                    <Input
                                        id={`${businessType}-customerPhone`}
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="0577064301"
                                        required
                                        disabled={!canCreateOrder}
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-itemType`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.itemLabel} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id={`${businessType}-itemType`}
                                        value={itemType}
                                        onChange={(e) => setItemType(e.target.value)}
                                        placeholder={config.itemPlaceholder}
                                        required
                                        autoComplete="off"
                                        disabled={!canCreateOrder}
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-orderNumber`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.orderLabel}</Label>
                                    <Input
                                        id={`${businessType}-orderNumber`}
                                        value={editingId ? orderNumber : ""}
                                        disabled
                                        placeholder={editingId ? "" : "Auto-generated on save"}
                                        className="h-12 rounded-xl bg-slate-50 border-zinc-200 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-pickupDate`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.orderLabel === "Tracking Number" ? "Date" : "Delivery Date"} <span className="text-red-500">*</span></Label>
                                    <DatePicker
                                        date={pickupDate}
                                        setDate={setPickupDate}
                                        placeholder="Select a date"
                                        disabled={!canCreateOrder}
                                        fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-customerEmail`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Customer Email</Label>
                                    <Input
                                        id={`${businessType}-customerEmail`}
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="naa@gmail.com"
                                        disabled={!canCreateOrder}
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                    />
                                </div>

                                {config.extraFields?.map((field) => (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={`${businessType}-${field.id}`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{field.label}</Label>
                                        <Input
                                            id={`${businessType}-${field.id}`}
                                            type={field.type === "number" ? "number" : "text"}
                                            value={(metadata[field.id] as string) || ""}
                                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                                            placeholder={field.placeholder}
                                            disabled={!canCreateOrder}
                                            className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="measurements" className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.id === "tailoring" ? "Notes / Measurements" : "Notes"}</Label>
                                <Textarea
                                    id="measurements"
                                    value={measurements}
                                    onChange={(e) => setMeasurements(e.target.value)}
                                    placeholder={config.id === "tailoring" ? "Details, measurements or special instructions..." : "Additional notes or special instructions..."}
                                    rows={4}
                                    disabled={!canCreateOrder}
                                    className="rounded-xl bg-white/50 border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 resize-none p-4"
                                />
                            </div>

                            {/* Inventory Selection */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <Label className="ml-1 text-sm font-black text-[#191A43] uppercase tracking-widest flex items-center gap-2">
                                        <Boxes className="w-4 h-4" />
                                        Stock Usage
                                    </Label>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Items from Inventory</span>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search inventory to add items..."
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        className="pl-10 rounded-xl bg-slate-50 border-slate-100 h-11 text-sm"
                                    />
                                    {inventorySearch && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-auto">
                                            {allInventory
                                                .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()))
                                                .map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!selectedInventory.find(s => s.id === item.id)) {
                                                                setSelectedInventory([...selectedInventory, { 
                                                                    id: item.id, 
                                                                    name: item.name, 
                                                                    quantity: "1",
                                                                    max: parseFloat(item.quantity) - parseFloat(item.reserved || "0")
                                                                }]);
                                                            }
                                                            setInventorySearch("");
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.sku || "No SKU"}</p>
                                                        </div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase">{parseFloat(item.quantity) - parseFloat(item.reserved || "0")} Available</p>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                {selectedInventory.length > 0 && (
                                    <div className="space-y-2">
                                        {selectedInventory.map((item, index) => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-slate-700">{item.name}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</Label>
                                                    <Input 
                                                        type="number"
                                                        value={item.quantity}
                                                        max={item.max}
                                                        onChange={(e) => {
                                                            const newItems = [...selectedInventory];
                                                            newItems[index].quantity = e.target.value;
                                                            setSelectedInventory(newItems);
                                                        }}
                                                        className="w-20 h-8 rounded-lg bg-white border-slate-100 text-xs font-bold text-center"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedInventory(selectedInventory.filter((_, i) => i !== index))}
                                                    className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex flex-col items-end gap-3">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={(!editingId && !hasRequiredFields) || isSaving || !canCreateOrder}
                                    className={`w-full md:w-auto min-w-[200px] h-12 rounded-xl text-base font-semibold transition-all duration-200 border-0 text-white hover:brightness-95 shadow-md`}
                                    style={{
                                        backgroundColor: !canCreateOrder || isSaving
                                            ? '#94a3b8'
                                            : (!editingId
                                                ? (hasRequiredFields ? config.theme.secondary : '#cbd5e1')
                                                : config.theme.primary)
                                    }}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        !canCreateOrder ? "Subscription Expired" : (editingId ? "Update Order" : "Create Order")
                                    )}
                                </Button>
                                
                                {!canCreateOrder && (
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                        Upgrade your plan to continue creating orders. 
                                        <Link href="/onboarding/subscription" className="text-[#CE0003] hover:underline font-bold">Renew Now</Link>
                                    </p>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function CreateOrderPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading form...</p>
            </div>
        }>
            <CreateOrderContent />
        </Suspense>
    )
}
