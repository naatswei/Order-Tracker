"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllOrders, saveOrder, generateTrackingId, type Order } from "@/lib/storage"
import Link from "next/link"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"
import { Package, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"

export default function CreateOrderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [orderNumber, setOrderNumber] = useState("")
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [garmentType, setGarmentType] = useState("")
    const [pickupDate, setPickupDate] = useState("")
    const [measurements, setMeasurements] = useState("")

    useEffect(() => {
        const editId = searchParams.get("edit")
        if (editId) {
            const allOrders = getAllOrders()
            const orderToEdit = allOrders.find(o => o.id === editId)
            if (orderToEdit) {
                setEditingId(orderToEdit.id)
                setOrderNumber(orderToEdit.orderNumber)
                setCustomerName(orderToEdit.customerName)
                setCustomerEmail(orderToEdit.customerEmail)
                setCustomerPhone(orderToEdit.customerPhone)
                setGarmentType(orderToEdit.garmentType)
                setPickupDate(orderToEdit.pickupDate || "")
                setMeasurements(orderToEdit.measurements)
            }
        }
    }, [searchParams])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const now = new Date()

        if (editingId) {
            // Update existing order
            const allOrders = getAllOrders()
            const existingOrder = allOrders.find(o => o.id === editingId)
            if (existingOrder) {
                const updatedOrder: Order = {
                    ...existingOrder,
                    orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    garmentType,
                    pickupDate,
                    measurements,
                    updatedAt: now,
                }
                saveOrder(updatedOrder)
                toast.success("Order details updated")
            }
        } else {
            // Create new order
            const trackingId = generateTrackingId()
            const newOrder: Order = {
                id: trackingId,
                orderNumber,
                customerName,
                customerEmail,
                customerPhone,
                garmentType,
                pickupDate,
                measurements,
                currentStatus: "Order Received",
                createdAt: now,
                updatedAt: now,
                statusHistory: [
                    {
                        id: generateTrackingId(),
                        timestamp: now,
                        status: "Order Received",
                        location: "Factory",
                        message: "Your order has been received and is being processed",
                    },
                ],
            }
            saveOrder(newOrder)
            toast.success("New order created")
        }

        router.push("/backoffice")
    }

    const hasRequiredFields =
        customerName.trim() !== "" &&
        customerPhone.trim() !== "" &&
        garmentType.trim() !== "" &&
        orderNumber.trim() !== "" &&
        pickupDate.trim() !== ""

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
                <div className="w-full px-[30px] py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                <Package className="text-[#191A43] w-5 h-5" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold tracking-tight">OTracker</h1>
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
                        <Button variant="outline" className="gap-2 mb-4 border-slate-300 hover:border-[#191A43] hover:bg-[#191A43] hover:text-white transition-all shadow-sm bg-white/50">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
                                    <Label htmlFor="customerName" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="customerName"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Naa"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customerPhone" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer Contact <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="customerPhone"
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="0577064301"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="garmentType" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Order Item <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="garmentType"
                                        value={garmentType}
                                        onChange={(e) => setGarmentType(e.target.value)}
                                        placeholder="Dress"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="orderNumber" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Order Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="orderNumber"
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="eg., KT350001"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pickupDate" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Pick Up Date <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="pickupDate"
                                        value={pickupDate}
                                        onChange={(e) => setPickupDate(e.target.value)}
                                        placeholder="7/20/2025"
                                        required
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customerEmail" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer Email</Label>
                                    <Input
                                        id="customerEmail"
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="naa@gmail.com"
                                        className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="measurements" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Notes / Measurements</Label>
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
                                    disabled={!editingId && !hasRequiredFields}
                                    className={`w-full md:w-auto min-w-[200px] h-12 rounded-xl text-base font-semibold transition-all ${!editingId
                                        ? hasRequiredFields
                                            ? "bg-[#CE0003] hover:bg-[#CE0003]/90 text-white shadow-lg shadow-primary/20"
                                            : "bg-white/50 border-2 border-slate-200 text-[#191A43] shadow-md hover:shadow-lg"
                                        : "bg-[#191A43] hover:bg-[#191A43]/90 text-white shadow-lg shadow-primary/20"
                                        }`}
                                >
                                    {editingId ? "Update Order" : "Create Order"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
