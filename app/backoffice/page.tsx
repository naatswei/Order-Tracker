"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllOrders, saveOrder, deleteOrder, generateTrackingId, type Order } from "@/lib/storage"
import Link from "next/link"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"
import { Package, Plus, Trash2, ExternalLink, Copy, Search, ArrowRight, X, Filter, Pencil } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation" // For linking from bulk page

export default function BackofficePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Form state
  const [orderNumber, setOrderNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [garmentType, setGarmentType] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [measurements, setMeasurements] = useState("")

  // Load orders on mount
  useEffect(() => {
    loadOrders()
  }, [])

  // Handle edit param
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (editId) {
      // Small optimization: if orders are already loaded, we can use them. 
      // But to be safe and ensure we have latest, we check storage directly or wait.
      // Since storage is sync, this is fine.
      const allOrders = getAllOrders()
      const orderToEdit = allOrders.find(o => o.id === editId)
      if (orderToEdit) {
        handleEdit(orderToEdit)
      }
      // Use replace to remove the query param without adding to history stack
      // This should be done carefully to not trigger loop if dependency is just [searchParams]
      // Because we remove the param, searchParams WILL change, firing this effect again.
      // But next time editId will be null, so it won't recurse. This is safe.
      router.replace("/backoffice")
    }
  }, [searchParams])

  const loadOrders = () => {
    const allOrders = getAllOrders()
    setOrders(allOrders)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const now = new Date()

    if (editingId) {
      // Update existing order
      const existingOrder = orders.find(o => o.id === editingId)
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

    loadOrders()
    resetForm()
    setShowForm(false)
  }

  const resetForm = () => {
    setEditingId(null)
    setOrderNumber("")
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setGarmentType("")
    setPickupDate("")
    setMeasurements("")
  }

  const handleEdit = (order: Order) => {
    setEditingId(order.id)
    setOrderNumber(order.orderNumber)
    setCustomerName(order.customerName)
    setCustomerEmail(order.customerEmail)
    setCustomerPhone(order.customerPhone)
    setGarmentType(order.garmentType)
    setPickupDate(order.pickupDate || "")
    setMeasurements(order.measurements)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }



  const copyTrackingLink = (id: string) => {
    const link = `${window.location.origin}/track/${id}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("completed")) {
      return "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200"
    }
    if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked")) {
      return "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200"
    }
    return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100/80 border-zinc-200"
  }

  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="w-full px-[30px] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Package className="text-primary w-5 h-5" />
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

      <div className="container mx-auto px-4 py-8 max-w-[1400px] space-y-[70px]">
        {/* Actions Bar */}
        {/* Track Order Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Track order</h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:flex-1 md:max-w-xl">
              {/* Search icon hidden or inside? Image shows just input text. Standard is usually an icon but strict adherence to image might generally mean clean input. I'll keep the icon for UX but make it subtle, matching the previous style but with new placeholder. */}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, name"
                className="pl-9 h-11 rounded-lg bg-white/50 border-slate-200 focus-visible:ring-primary/20 transition-all font-medium placeholder:font-normal w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Button variant="outline" className="h-11 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 px-4 shadow-sm flex-1 md:flex-none">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Link href="/backoffice/bulk" className="flex-1 md:flex-none">
                <Button className="w-full h-11 rounded-lg bg-blue-500 hover:bg-blue-600 text-white gap-2 px-4 shadow-sm font-medium">
                  Bulk Update
                </Button>
              </Link>
              <Button
                onClick={() => {
                  if (showForm) {
                    resetForm()
                    setShowForm(false)
                  } else {
                    setShowForm(true)
                  }
                }}
                className={`h-11 rounded-lg shadow-sm gap-2 px-6 flex-1 md:flex-none font-medium transition-all ${showForm ? "bg-muted text-foreground hover:bg-muted/80" : "bg-slate-900 hover:bg-slate-800 text-white"}`}
              >
                {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> {editingId ? "Edit Order" : "Create New Order"}</>}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="overflow-hidden"
            >
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

                    <div className="pt-2">
                      <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 font-semibold bg-[#191A43] hover:bg-[#191A43]/90 text-white">
                        {editingId ? "Update Order" : "Create Order"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>


      </div >
    </div >
  )
}
