"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateTrackingId, type Order } from "@/lib/storage"
import { createOrder, getOrderWithHistory, updateOrder } from "@/app/actions/orders"
import { getInventory, getClientOrganizations } from "@/app/actions/operations"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { BackofficeHeader } from "@/components/backoffice-header"
import { Package, ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Search, Boxes, ShoppingBag, Tag, ChevronRight } from "lucide-react"
import { RenewalBanner } from "@/components/renewal-banner"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { getBusinessConfig } from "@/lib/business-configs"
import { DatePicker } from "@/components/ui/date-picker"
import { format, parse } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

function resolveUnitPrice(quantity: number, inventoryItem: any, clientId?: string): number {
    if (!inventoryItem) return 0;
    
    // 1. Look for client-specific pricing override tiers first
    let tiers = inventoryItem.pricingTiers;
    if (clientId && Array.isArray(inventoryItem.clientOverrides)) {
        const clientOverride = inventoryItem.clientOverrides.find((o: any) => o.clientId === clientId);
        if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
            tiers = clientOverride.pricingTiers;
        }
    }
    
    // 2. If sellingPrice is 0 or unset, fall back to unitCost
    const basePrice = parseFloat(inventoryItem.sellingPrice || "0") || parseFloat(inventoryItem.unitCost || "0");
    
    // 3. If no overrides, fall back to standard tiers
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return basePrice;
    }
    
    const matchedTier = tiers.find((tier: any) => {
        const minMatch = quantity >= tier.minQty;
        const maxMatch = tier.maxQty === null || quantity <= tier.maxQty;
        return minMatch && maxMatch;
    });
    
    return matchedTier ? parseFloat(matchedTier.price) : basePrice;
}

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
    const [quantity, setQuantity] = useState("1")
    const [isSaving, setIsSaving] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online")
    
    // B2B Customer Pricing
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>("none")
    const [orderMode, setOrderMode] = useState<"unit" | "wholesale">("unit")

    // Inventory state
    const [allInventory, setAllInventory] = useState<any[]>([])
    const [selectedInventory, setSelectedInventory] = useState<{ id: string, name: string, quantity: string, max: number }[]>([])
    const [inventorySearch, setInventorySearch] = useState("")
    const [isSearchFocused, setIsSearchFocused] = useState(false)


    // Unit Modal state
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
    const [selectedItemForUnitModal, setSelectedItemForUnitModal] = useState<any>(null)
    const [modalQuantity, setModalQuantity] = useState("1")
    const [selectedTierIndex, setSelectedTierIndex] = useState<number | null>(null)
    
    // Invoice defaults state
    const [tax, setTax] = useState(0)
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [discount, setDiscount] = useState(0)

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    // Initialize defaults from organization settings
    useEffect(() => {
        if (!organization) return
        const metadata = organization.publicMetadata as any || {}
        const defaultDelivery = parseFloat(metadata.defaultDeliveryFee || "0")
        const defaultDisc = parseFloat(metadata.defaultDiscount || "0")
        
        setDeliveryFee(defaultDelivery)
        setDiscount(defaultDisc)
    }, [organization])

    // Calculate subtotal from selected inventory
    const subtotal = selectedInventory.reduce((sum, item) => {
        const invItem = allInventory.find(inv => inv.id === item.id);
        const qty = parseFloat(item.quantity) || 1;
        const clientId = selectedClientId === "none" ? "" : selectedClientId;
        const unitPrice = resolveUnitPrice(qty, invItem, clientId);
        return sum + (qty * unitPrice);
    }, 0);

    // Auto-calculate tax based on defaultTaxRate percent and subtotal
    useEffect(() => {
        if (!organization) return
        const metadata = organization.publicMetadata as any || {}
        const defaultTaxRatePercent = parseFloat(metadata.defaultTaxRate || "0")
        if (defaultTaxRatePercent > 0) {
            const computedTax = (subtotal * defaultTaxRatePercent) / 100
            setTax(Number(computedTax.toFixed(2)))
        } else {
            setTax(0)
        }
    }, [subtotal, organization])

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
            getOrderWithHistory(editId).then(orderToEdit => {
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
                    const editMeta = orderToEdit.metadata as Record<string, unknown> || {}
                    setMetadata(editMeta)
                    setQuantity(String(editMeta.quantity || "1"))

                    // Load inventory links
                    if ((orderToEdit as any).inventoryLinks) {
                        const mappedInventory = (orderToEdit as any).inventoryLinks.map((link: any) => ({
                            id: link.inventoryId,
                            name: link.inventoryItem.name,
                            quantity: link.quantity,
                            max: parseFloat(link.inventoryItem.quantity) + parseFloat(link.quantity) - parseFloat(link.inventoryItem.reserved || "0")
                        }))
                        setSelectedInventory(mappedInventory)
                    }
                }
            })
        }

        // Fetch B2B Clients
        getClientOrganizations().then(clientsList => {
            setClients(clientsList || []);
        });

        // Fetch inventory
        getInventory().then(items => {
            const errorItem = items.find(o => (o as any).__isError);
            if (errorItem) {
                toast.error(`Failed to load inventory: ${(errorItem as any).message}`);
                setAllInventory([]);
            } else {
                setAllInventory(items);
            }
        })
    }, [searchParams, organization])

    // Bidirectional sync for quantity (only if 1 item is linked)
    useEffect(() => {
        const inputQty = String(quantity || "");
        if (selectedInventory.length === 1 && inputQty) {
            const invQty = selectedInventory[0].quantity;
            if (inputQty !== invQty) {
                setSelectedInventory(prev => {
                    const next = [...prev];
                    next[0].quantity = inputQty;
                    return next;
                });
            }
        }
    }, [quantity]);

    useEffect(() => {
        if (selectedInventory.length === 1) {
            const invQty = selectedInventory[0].quantity;
            const inputQty = String(quantity || "");
            if (invQty !== inputQty) {
                setQuantity(invQty);
            }
        }
    }, [selectedInventory]);

    // Auto-match inventory logic (disabled to favor deliberate autocomplete and unit-modal selection)
    useEffect(() => {
        // Deliberate linking is managed via autocomplete and stock usage search
    }, [itemType, allInventory, editingId]);

    const isSubscriptionActive = 
        organization?.publicMetadata?.subscriptionStatus === "active" || 
        organization?.publicMetadata?.subscriptionStatus === "trialing"
    
    const subscriptionExpiry = organization?.publicMetadata?.subscriptionExpiry as string
    const expiryDate = subscriptionExpiry ? new Date(subscriptionExpiry) : null
    const isExpired = expiryDate ? new Date() > expiryDate : false
    const canCreateOrder = isSubscriptionActive && !isExpired
    const isRetailBusiness = businessType ? ["hair-retail", "online-business"].includes(businessType) : false

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

        const finalItemType = (selectedInventory.length > 1)
            ? selectedInventory.map(s => s.name).join(", ")
            : (itemType.trim() !== "" 
            ? itemType 
            : selectedInventory.map(s => s.name).join(", "));

        const totalQty = selectedInventory.length > 0
            ? selectedInventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
            : (parseInt(quantity) || 1);

        try {
            let res;
            if (editingId) {
                res = await updateOrder(editingId, {
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    itemType: finalItemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements,
                    metadata: { ...metadata, quantity: totalQty },
                    inventoryItems: selectedInventory.map(item => ({ id: item.id, quantity: item.quantity })),
                })
                if (res?.error) {
                    toast.error(res.error)
                    setIsSaving(false)
                    return
                }
                toast.success("Order details updated")
            } else {
                const invoiceItems = selectedInventory.map(item => {
                    const inv = allInventory.find(i => i.id === item.id)
                    const qty = parseInt(item.quantity) || 1
                    const price = inv ? resolveUnitPrice(qty, inv, selectedClientId !== "none" ? selectedClientId : undefined) : 0
                    
                    let displayName = item.name;
                    if (inv) {
                        const parts = [];
                        if (inv.sku) parts.push(inv.sku);
                        if (inv.unit) parts.push(inv.unit);
                        if (parts.length > 0) {
                            displayName = `${item.name} (${parts.join(" | ")})`;
                        }
                    }
                    
                    return { name: displayName, quantity: qty, price }
                })

                res = await createOrder({
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    itemType: finalItemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements,
                    metadata: { ...metadata, quantity: totalQty },
                    businessType: localStorage.getItem("businessType") || "tailoring",
                    currentStatus: config.defaultStatus,
                    inventoryItems: selectedInventory.map(item => ({ id: item.id, quantity: item.quantity })),
                    paymentMethod,
                    invoiceItems,
                    tax,
                    deliveryFee,
                    discount,
                })
                if (res?.error) {
                    toast.error(res.error)
                    setIsSaving(false)
                    return
                }

                if (paymentMethod === "cash") {
                    toast.success("Order created & marked as paid (Cash)")
                } else {
                    toast.success("New order created")
                }
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
        (selectedInventory.length > 0 || (!isRetailBusiness && itemType.trim() !== "")) &&
        (selectedInventory.length > 0 || (!isRetailBusiness && quantity.trim() !== "" && parseInt(quantity) > 0))

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

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12 max-w-[1400px] space-y-6">
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
                        {/* sliding tab switcher */}
                        <div className="mb-6 flex justify-start">
                            <div className="bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl flex flex-wrap items-center gap-1 shadow-inner border border-slate-200/50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderMode("unit");
                                        setSelectedClientId("none");
                                        setSelectedInventory([]);
                                    }}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                        orderMode === "unit"
                                            ? "bg-white text-[#191A43] shadow-sm font-black"
                                            : "text-slate-400 hover:text-slate-600 font-bold"
                                    }`}
                                >
                                    Retail Sales Mode (Unit)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderMode("wholesale")}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                        orderMode === "wholesale"
                                            ? "bg-white text-[#191A43] shadow-sm font-black"
                                            : "text-slate-400 hover:text-slate-600 font-bold"
                                    }`}
                                >
                                    Wholesale Sales Mode
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* B2B Client Account Selector */}
                            {orderMode === "wholesale" && (
                                <div className="p-5 bg-slate-50/70 border border-slate-100 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="space-y-1 text-left">
                                        <Label className="text-[10px] font-black text-[#191A43] uppercase tracking-widest ml-0.5">B2B Customer Pricing Account</Label>
                                        <p className="text-[10px] text-slate-400 font-bold leading-normal">Select a registered client organization to apply their custom pricing overrides sheet automatically.</p>
                                    </div>
                                    <div className="w-full lg:w-80">
                                        <Select
                                            value={selectedClientId}
                                            onValueChange={setSelectedClientId}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white font-semibold text-xs text-left">
                                                <SelectValue placeholder="Standard Catalog Prices (Default)" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100 bg-white">
                                                <SelectItem value="none" className="text-xs font-semibold">Standard Catalog Prices (Default)</SelectItem>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id} className="text-xs font-semibold">
                                                        {client.name} (Custom overrides)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Customer Information */}
                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/80 space-y-4">
                                <h3 className="text-xs font-black text-[#191A43] uppercase tracking-wider flex items-center gap-2">
                                    Customer Information
                                </h3>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor={`${businessType}-customerName`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Customer Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id={`${businessType}-customerName`}
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Naa"
                                            required
                                            disabled={!canCreateOrder}
                                            className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor={`${businessType}-customerPhone`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Customer Contact</Label>
                                        <Input
                                            id={`${businessType}-customerPhone`}
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="0577064301"
                                            disabled={!canCreateOrder}
                                            className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
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
                                            className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/80 space-y-4">
                                <h3 className="text-xs font-black text-[#191A43] uppercase tracking-wider flex items-center gap-2">
                                    Expected Payment Method
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div 
                                        onClick={() => setPaymentMethod("online")}
                                        className={`border rounded-2xl p-4 cursor-pointer flex flex-col gap-1.5 transition-all ${paymentMethod === "online" ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <span className={`text-sm font-bold ${paymentMethod === "online" ? "text-blue-700" : "text-slate-700"}`}>Online Payment</span>
                                        <span className="text-xs text-slate-500 leading-tight">Customer will receive a payment link via SMS</span>
                                    </div>
                                    <div 
                                        onClick={() => setPaymentMethod("cash")}
                                        className={`border rounded-2xl p-4 cursor-pointer flex flex-col gap-1.5 transition-all ${paymentMethod === "cash" ? "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <span className={`text-sm font-bold ${paymentMethod === "cash" ? "text-emerald-700" : "text-slate-700"}`}>Cash / Manual Payment</span>
                                        <span className="text-xs text-slate-500 leading-tight">Order marked as paid immediately. No payment link.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Usage & Product Selection */}
                            <div className="bg-slate-50/30 p-6 rounded-3xl border border-slate-100/60 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="ml-1 text-xs font-black text-[#191A43] uppercase tracking-widest flex items-center gap-2">
                                        <Boxes className="w-4 h-4" />
                                        Stock Usage / Product Selection {isRetailBusiness && <span className="text-red-500">*</span>}
                                    </Label>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Items from Inventory</span>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search inventory to add items..."
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        className="pl-10 rounded-xl bg-white border-slate-200 h-12 text-sm"
                                    />
                                    {(inventorySearch || isSearchFocused) && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-auto">
                                            {(() => {
                                                const filtered = allInventory.filter(item => 
                                                    (item.saleType || "unit") === orderMode &&
                                                    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) && 
                                                    !selectedInventory.some(s => s.id === item.id)
                                                );
                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                                                            No available items in inventory
                                                        </div>
                                                    );
                                                }
                                                return filtered.map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault(); // Prevents input blur from closing dropdown before action completes
                                                            if (businessType === "hair-retail") {
                                                                if (!selectedInventory.find(s => s.id === item.id)) {
                                                                    setSelectedInventory([...selectedInventory, { 
                                                                        id: item.id, 
                                                                        name: item.name, 
                                                                        quantity: "1",
                                                                        max: parseFloat(item.quantity) - parseFloat(item.reserved || "0")
                                                                    }]);
                                                                    setItemType(item.name);
                                                                    setMetadata(prev => ({
                                                                        ...prev,
                                                                        length: item.unit || "",
                                                                        color: item.sku || ""
                                                                    }));
                                                                    toast.success(`Linked "${item.name}"`);
                                                                }
                                                            } else if (orderMode === "unit") {
                                                                if (!selectedInventory.find(s => s.id === item.id)) {
                                                                    setSelectedInventory([...selectedInventory, { 
                                                                        id: item.id, 
                                                                        name: item.name, 
                                                                        quantity: "1",
                                                                        max: parseFloat(item.quantity) - parseFloat(item.reserved || "0")
                                                                    }]);
                                                                    setItemType(item.name);
                                                                    toast.success(`Linked "${item.name}"`);
                                                                }
                                                            } else {
                                                                setSelectedItemForUnitModal(item);
                                                                setModalQuantity("1");
                                                                setIsUnitModalOpen(true);
                                                            }
                                                            setInventorySearch("");
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.sku || "No SKU"}</p>
                                                        </div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase">{parseFloat(item.quantity) - parseFloat(item.reserved || "0")} Available</p>
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {selectedInventory.length > 0 && (
                                    <div className="space-y-2">
                                        {selectedInventory.map((item, index) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-700 truncate">{item.name}</p>
                                                    {businessType === "hair-retail" && (metadata.length || metadata.color) && (
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                                                            {metadata.length && <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">Length: {metadata.length}</span>}
                                                            {metadata.color && <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">Color: {metadata.color}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t border-slate-50 pt-3 sm:border-0 sm:pt-0">
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
                                                            className="w-16 h-8 rounded-lg bg-slate-50 border-slate-100 text-xs font-bold text-center"
                                                        />
                                                    </div>
                                                    <div className="text-right flex flex-col justify-center min-w-[110px]">
                                                         {(() => {
                                                             const invItem = allInventory.find(inv => inv.id === item.id);
                                                             const qty = parseFloat(item.quantity) || 1;
                                                             const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                                             const unitPrice = resolveUnitPrice(qty, invItem, clientId);
                                                             const standardCost = parseFloat(invItem?.unitCost || "0");
                                                             
                                                             // Check if this uses client-specific pricing overrides
                                                             let isClientSpecific = false;
                                                             if (clientId && invItem && Array.isArray(invItem.clientOverrides)) {
                                                                 isClientSpecific = invItem.clientOverrides.some((o: any) => o.clientId === clientId);
                                                             }
                                                             const isDiscounted = unitPrice < standardCost;
                                                             
                                                             return (
                                                                 <>
                                                                     <p className="text-xs font-black text-[#191A43]">
                                                                         GH₵ {(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                     </p>
                                                                     <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-end gap-1 mt-0.5">
                                                                         {isClientSpecific && <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/50">Custom</span>}
                                                                         {!isClientSpecific && isDiscounted && <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/50">Wholesale</span>}
                                                                         GH₵ {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ea
                                                                     </p>
                                                                 </>
                                                             );
                                                         })()}
                                                     </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const remaining = selectedInventory.filter((_, i) => i !== index);
                                                            setSelectedInventory(remaining);
                                                            if (remaining.length === 0) {
                                                                setItemType("");
                                                                if (businessType === "hair-retail") {
                                                                    setMetadata(prev => {
                                                                        const copy = { ...prev };
                                                                        delete copy.length;
                                                                        delete copy.color;
                                                                        return copy;
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Order Total Summary */}
                                {selectedInventory.length > 0 && (
                                    <div className="mt-4 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                                            <h4 className="text-[10px] font-black text-[#191A43] uppercase tracking-widest">Order Summary</h4>
                                        </div>
                                        <div className="px-5 py-3 space-y-2 border-b border-slate-100/50">
                                            {selectedInventory.map((item) => {
                                                const invItem = allInventory.find(inv => inv.id === item.id);
                                                const qty = parseFloat(item.quantity) || 1;
                                                const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                                const unitPrice = resolveUnitPrice(qty, invItem, clientId);
                                                const lineTotal = qty * unitPrice;
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600 font-medium truncate mr-4">
                                                            {item.name} <span className="text-slate-400">× {qty}</span>
                                                        </span>
                                                        <span className="font-bold text-slate-700 whitespace-nowrap">
                                                            GH₵ {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="px-5 py-3 space-y-1.5 text-xs border-b border-slate-100/35">
                                            <div className="flex justify-between items-center text-slate-500">
                                                <span>Subtotal</span>
                                                <span className="font-semibold text-slate-700">GH₵ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {tax > 0 && (
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Tax</span>
                                                    <span className="font-semibold text-slate-700">GH₵ {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {deliveryFee > 0 && (
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Delivery Fee</span>
                                                    <span className="font-semibold text-slate-700">GH₵ {deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {discount > 0 && (
                                                <div className="flex justify-between items-center text-red-500">
                                                    <span>Discount</span>
                                                    <span className="font-semibold">-GH₵ {discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-5 py-3.5 bg-[#191A43] flex items-center justify-between rounded-b-2xl">
                                            <span className="text-xs font-black text-white/70 uppercase tracking-wider">Order Total</span>
                                            <span className="text-lg font-black text-white">
                                                GH₵ {(subtotal + tax + deliveryFee - discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Specifications / Details */}
                            <div className="bg-slate-50/10 p-6 rounded-3xl border border-slate-100/50 space-y-4">
                                <h3 className="text-xs font-black text-[#191A43] uppercase tracking-wider">
                                    {selectedInventory.length > 0 ? "Specifications & Delivery" : "Product Specifications & Delivery"}
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {/* Manual fields: only rendered if NO inventory is linked and it is NOT a retail business */}
                                    {selectedInventory.length === 0 && !isRetailBusiness && (
                                        <>
                                            <div className="space-y-2 relative">
                                                <Label htmlFor={`${businessType}-itemType`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.itemLabel} <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <Input
                                                        name="order-item-type-search"
                                                        id={`${businessType}-itemType`}
                                                        value={itemType}
                                                        onChange={(e) => setItemType(e.target.value)}
                                                        placeholder={config.itemPlaceholder}
                                                        required={selectedInventory.length === 0 && !isRetailBusiness}
                                                        autoComplete="off"
                                                        spellCheck="false"
                                                        disabled={!canCreateOrder}
                                                        className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                                    />
                                                </div>
                                            </div>

                                            {!config.extraFields?.some(f => f.id === "quantity") && (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${businessType}-quantity`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Quantity <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id={`${businessType}-quantity`} type="number" min="1"
                                                        value={quantity}
                                                        disabled={!canCreateOrder} onChange={(e) => setQuantity(e.target.value)} required
                                                        placeholder="1"
                                                        className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Pickup/Delivery Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`${businessType}-pickupDate`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.orderLabel === "Tracking Number" ? "Date" : "Delivery Date"}</Label>
                                        <DatePicker
                                            date={pickupDate}
                                            setDate={setPickupDate}
                                            placeholder="Select a date"
                                            disabled={!canCreateOrder}
                                            fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                    </div>

                                    {/* Delivery Fee Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="deliveryFee" className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Delivery Fee (GH₵)</Label>
                                        <Input 
                                            type="number" 
                                            id="deliveryFee" 
                                            step="0.01"
                                            value={deliveryFee || ""}
                                            onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                                            placeholder="0.00"
                                            disabled={!canCreateOrder}
                                            className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm"
                                        />
                                    </div>

                                    {/* Custom metadata fields */}
                                    {config.extraFields
                                        ?.filter(field => {
                                            // Hide 'quantity' and 'sku' when inventory item is linked OR if it's a retail business
                                            if (selectedInventory.length > 0 || isRetailBusiness) {
                                                if (businessType === "hair-retail" && selectedInventory.length > 0) {
                                                    return field.id !== "quantity" && field.id !== "sku" && field.id !== "length" && field.id !== "color";
                                                }
                                                return field.id !== "quantity" && field.id !== "sku";
                                            }
                                            return true;
                                        })
                                        .map((field) => (
                                            <div key={field.id} className="space-y-2">
                                                <Label htmlFor={`${businessType}-${field.id}`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{field.label}</Label>
                                                <Input
                                                    id={`${businessType}-${field.id}`}
                                                    type={field.type === "number" ? "number" : "text"}
                                                    value={field.id === "quantity" ? quantity : ((metadata[field.id] as string) || "")}
                                                    onChange={(e) => {
                                                         if (field.id === "quantity") {
                                                             setQuantity(e.target.value);
                                                         } else {
                                                             setMetadata({ ...metadata, [field.id]: e.target.value });
                                                         }
                                                     }}
                                                    placeholder={field.placeholder}
                                                    disabled={!canCreateOrder}
                                                    className="h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80"
                                                />
                                            </div>
                                        ))}
                                </div>
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
                                    className="rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 resize-none p-4"
                                />
                            </div>

                            <div className="pt-2 flex flex-col items-end gap-3">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={(!editingId && !hasRequiredFields) || isSaving || !canCreateOrder}
                                    className={`w-full sm:w-auto min-w-[200px] h-12 rounded-xl text-base font-semibold transition-all duration-200 border-0 text-white hover:brightness-95 shadow-md`}
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

            {/* Unit Pricing / Wholesale Selection Modal */}
            <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-white shadow-2xl rounded-3xl p-6 overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-slate-50 rounded-xl">
                                <ShoppingBag className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">Select Units Sold</DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    {selectedItemForUnitModal?.name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedItemForUnitModal && (
                        <div className="space-y-5 pt-2">
                            {/* Product Info Mini-Card */}
                            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                                <div>
                                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Available Stock</p>
                                    <p className="font-black text-slate-700 mt-0.5 text-sm">
                                        {parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0")} units left
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">SKU</p>
                                    <p className="font-black text-slate-700 mt-0.5">{selectedItemForUnitModal.sku || "N/A"}</p>
                                </div>
                            </div>

                            {/* Pricing Tiers & Unit Brackets */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                                    Select Package Bracket / Tier
                                </Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                     {/* Standard/Retail Tier option */}
                                     {(() => {
                                         const qty = parseFloat(modalQuantity) || 1;
                                         
                                         let tiers = selectedItemForUnitModal.pricingTiers;
                                         if (selectedClientId && selectedClientId !== "none" && Array.isArray(selectedItemForUnitModal.clientOverrides)) {
                                             const clientOverride = selectedItemForUnitModal.clientOverrides.find((o: any) => o.clientId === selectedClientId);
                                             if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
                                                 tiers = clientOverride.pricingTiers;
                                             }
                                         }

                                         const isTiers = Array.isArray(tiers) && tiers.length > 0;
                                         const retailMax = isTiers ? parseFloat(tiers[0].minQty) - 1 : null;
                                         const isRetailActive = !isTiers || qty <= (retailMax || Infinity);
                                         const retailPrice = parseFloat(selectedItemForUnitModal.unitCost || "0");
                                         
                                         return (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     setModalQuantity("1");
                                                 }}
                                                 style={{ borderColor: isRetailActive ? config.theme.primary : undefined }}
                                                 className={`w-full p-3.5 text-left border rounded-2xl flex justify-between items-center transition-all duration-300 ${isRetailActive ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`}
                                             >
                                                 <div>
                                                     <p className="text-xs font-black text-slate-700">
                                                         Retail Unit {retailMax ? `(1-${retailMax} units)` : '(1+ units)'}
                                                     </p>
                                                     <p className="text-[10px] text-slate-400 font-bold mt-0.5">Standard purchase price</p>
                                                 </div>
                                                 <div className="text-right">
                                                     <p className="text-sm font-black text-[#191A43]">
                                                         GH₵ {retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                     </p>
                                                     <p className="text-[9px] text-slate-400 font-bold mt-0.5">per unit</p>
                                                 </div>
                                             </button>
                                         );
                                     })()}

                                     {/* Wholesale/Volume Tiers */}
                                     {(() => {
                                         let tiers = selectedItemForUnitModal.pricingTiers;
                                         if (selectedClientId && selectedClientId !== "none" && Array.isArray(selectedItemForUnitModal.clientOverrides)) {
                                             const clientOverride = selectedItemForUnitModal.clientOverrides.find((o: any) => o.clientId === selectedClientId);
                                             if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
                                                 tiers = clientOverride.pricingTiers;
                                             }
                                         }
                                         
                                         if (!Array.isArray(tiers)) return null;
                                         
                                         return tiers.map((tier: any, idx: number) => {
                                             const qty = parseFloat(modalQuantity) || 1;
                                             const min = parseFloat(tier.minQty);
                                             const max = tier.maxQty ? parseFloat(tier.maxQty) : Infinity;
                                             const isMatched = qty >= min && qty <= max;
                                             const price = parseFloat(tier.price);
                                             
                                             return (
                                                 <button
                                                     key={idx}
                                                     type="button"
                                                     onClick={() => {
                                                         setModalQuantity(String(min));
                                                     }}
                                                     style={{ borderColor: isMatched ? config.theme.primary : undefined }}
                                                     className={`w-full p-3.5 text-left border rounded-2xl flex justify-between items-center transition-all duration-300 ${isMatched ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`}
                                                 >
                                                     <div>
                                                         <div className="flex items-center gap-1.5">
                                                             <p className="text-xs font-black text-slate-700">
                                                                 Wholesale {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} Units
                                                             </p>
                                                             {isMatched && (
                                                                 <span className="text-[8px] font-black text-[#191A43] bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                     Matched B2B Tier
                                                                 </span>
                                                             )}
                                                         </div>
                                                         <p className="text-[10px] text-slate-400 font-bold mt-0.5">Bulk discount applied</p>
                                                     </div>
                                                     <div className="text-right">
                                                         <p className="text-sm font-black text-[#191A43]">
                                                             GH₵ {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                         </p>
                                                         <p className="text-[9px] text-slate-400 font-bold mt-0.5">per unit</p>
                                                     </div>
                                                 </button>
                                             );
                                         });
                                     })()}
                                </div>
                            </div>

                            {/* Quantity Adjuster */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Units Sold
                                    </Label>
                                    {(() => {
                                        const qty = parseFloat(modalQuantity) || 1;
                                        const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                        const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                        const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                        
                                        if (qty > allowedMax) {
                                            return (
                                                <span className="text-[9px] font-extrabold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100/50 uppercase tracking-wide">
                                                    Exceeds stock left ({allowedMax} units)
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const val = Math.max(1, (parseFloat(modalQuantity) || 1) - 1);
                                            setModalQuantity(String(val));
                                        }}
                                        className="w-12 h-12 rounded-xl bg-slate-50 border-slate-100 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        value={modalQuantity}
                                        onChange={(e) => setModalQuantity(e.target.value)}
                                        className="h-12 rounded-xl bg-white border-zinc-200 text-center font-black text-slate-800 text-lg focus-visible:ring-slate-100/80"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                            const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                            const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                            const current = parseFloat(modalQuantity) || 1;
                                            if (current < allowedMax) {
                                                setModalQuantity(String(current + 1));
                                            } else {
                                                toast.error("Cannot exceed available physical stock.");
                                            }
                                        }}
                                        className="w-12 h-12 rounded-xl bg-slate-50 border-slate-100 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            {/* Subtotal Display */}
                            {(() => {
                                 const qty = parseFloat(modalQuantity) || 1;
                                 const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                 const unitPrice = resolveUnitPrice(qty, selectedItemForUnitModal, clientId);
                                 const retailPrice = parseFloat(selectedItemForUnitModal.unitCost || "0");
                                 const savings = retailPrice > unitPrice ? (retailPrice - unitPrice) * qty : 0;
                                 
                                 return (
                                     <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                         <div>
                                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Pricing Subtotal</p>
                                             <p className="text-2xl font-black text-[#191A43] mt-0.5">
                                                 GH₵ {(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </p>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-[10px] text-slate-500 font-bold">
                                                 GH₵ {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ea
                                             </p>
                                             {savings > 0 && (
                                                 <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                                                     Saved GH₵ {savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                 </p>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })()}
                        </div>
                    )}

                    <DialogFooter className="mt-6 flex flex-col gap-2">
                        <Button
                            type="button"
                            onClick={() => {
                                if (!selectedItemForUnitModal) return;
                                
                                const qty = parseFloat(modalQuantity) || 1;
                                const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                
                                if (qty > allowedMax) {
                                    toast.error(`Insufficient stock! Maximum allowed is ${allowedMax} units.`);
                                    return;
                                }

                                setSelectedInventory(prev => {
                                    const existingIdx = prev.findIndex(s => s.id === selectedItemForUnitModal.id);
                                    let next = [...prev];
                                    if (existingIdx > -1) {
                                        next[existingIdx].quantity = modalQuantity;
                                    } else {
                                        next.push({
                                            id: selectedItemForUnitModal.id,
                                            name: selectedItemForUnitModal.name,
                                            quantity: modalQuantity,
                                            max: allowedMax
                                        });
                                    }
                                    return next;
                                });

                                setItemType("");
                                setIsUnitModalOpen(false);
                                toast.success(`Linked ${modalQuantity} units of "${selectedItemForUnitModal.name}"`);
                            }}
                            className="w-full text-white rounded-xl h-12 font-bold shadow-md hover:brightness-95 border-0"
                            style={{ backgroundColor: config.theme.secondary }}
                        >
                            Confirm & Link to Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
