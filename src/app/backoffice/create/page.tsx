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
import Link from "next/link"
import { UserButton, OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { Package, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { getBusinessConfig } from "@/lib/business-configs"

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
    const [pickupDate, setPickupDate] = useState("")
    const [measurements, setMeasurements] = useState("")
    const [metadata, setMetadata] = useState<Record<string, unknown>>({})
    const [isSaving, setIsSaving] = useState(false)

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
                    setPickupDate(orderToEdit.pickupDate || "")
                    setMeasurements(orderToEdit.measurements || "")
                    setMetadata(orderToEdit.metadata as Record<string, unknown> || {})
                }
            })
        }
    }, [searchParams, organization])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            if (editingId) {
                await updateOrder(editingId, {
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    itemType,
                    pickupDate,
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
                    pickupDate,
                    measurements,
                    metadata,
                    businessType: localStorage.getItem("businessType") || "tailoring",
                    currentStatus: config.defaultStatus,
                })
                toast.success("New order created")
            }
            router.push("/backoffice")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save order"
            toast.error(message)
        } finally {
            setIsSaving(false)
        }
    }

    const hasRequiredFields =
        customerName.trim() !== "" &&
        customerPhone.trim() !== "" &&
        itemType.trim() !== "" &&
        orderNumber.trim() !== "" &&
        pickupDate.trim() !== ""

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <div
                className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm"

            >
                <div className="w-full px-4 sm:px-[30px] py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-6 h-6" style={{ color: config.theme.primary }} />
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold tracking-tight">
                                    <span className="text-[#CE0003]">O</span>
                                    <span className="text-[#191A43]">Tracker</span>
                                </h1>
                                <p className="text-xs text-muted-foreground">Backoffice Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <OrganizationSwitcher
                                afterCreateOrganizationUrl="/backoffice"
                                appearance={{
                                    elements: {
                                        rootBox: "flex items-center",
                                        organizationSwitcherTrigger: "h-9 px-3 rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
                                    }
                                }}
                            />
                            <UserButton
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-9 h-9"
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-[1400px] space-y-6">
                <div>
                    <Link href="/backoffice">
                        <Button
                            variant="outline"
                            className="gap-2 mb-4 border-[#191A43]/15 text-[#191A43] hover:bg-[#191A43] hover:text-white transition-all shadow-sm duration-200 rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
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
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
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
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
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
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-orderNumber`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.orderLabel} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id={`${businessType}-orderNumber`}
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder={config.orderPlaceholder}
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${businessType}-pickupDate`} className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">{config.orderLabel === "Tracking Number" ? "Date" : "Pick Up Date"} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id={`${businessType}-pickupDate`}
                                        value={pickupDate}
                                        onChange={(e) => setPickupDate(e.target.value)}
                                        placeholder="7/20/2025"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
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
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
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
                                            className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="measurements" className="ml-1 text-xs font-semibold text-muted-foreground tracking-wider">Notes / Measurements</Label>
                                <Textarea
                                    id="measurements"
                                    value={measurements}
                                    onChange={(e) => setMeasurements(e.target.value)}
                                    placeholder="Details, measurements or special instructions..."
                                    rows={4}
                                    className="rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20 resize-none p-4"
                                />
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={(!editingId && !hasRequiredFields) || isSaving}
                                    className={`w-full md:w-auto min-w-[200px] h-12 rounded-xl text-base font-semibold transition-all duration-200 border-0 text-white hover:brightness-95 shadow-md`}
                                    style={{
                                        backgroundColor: isSaving
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
                                        editingId ? "Update Order" : "Create Order"
                                    )}
                                </Button>
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
