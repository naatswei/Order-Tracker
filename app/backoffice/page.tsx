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
import { Package, Plus, Trash2, ExternalLink, Copy, Search, ArrowRight, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function BackofficePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Form state
  const [orderNumber, setOrderNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [garmentType, setGarmentType] = useState("")
  const [measurements, setMeasurements] = useState("")

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = () => {
    const allOrders = getAllOrders()
    setOrders(allOrders)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trackingId = generateTrackingId()
    const now = new Date()

    const newOrder: Order = {
      id: trackingId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      garmentType,
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
    loadOrders()
    resetForm()
    setShowForm(false)
  }

  const resetForm = () => {
    setOrderNumber("")
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setGarmentType("")
    setMeasurements("")
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteOrder(id)
      loadOrders()
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 font-sans selection:bg-primary/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
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

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex w-full sm:w-auto flex-1 max-w-lg items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-9 h-11 rounded-full bg-white/50 border-white/50 focus-visible:ring-primary/20 transition-all font-medium placeholder:font-normal w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="rounded-full h-11 px-6 shadow-sm shadow-primary/20 shrink-0">
              Search
            </Button>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="lg"
            className={`rounded-full h-11 shadow-lg shadow-primary/20 transition-all w-full sm:w-auto sm:w-auto ${showForm ? "bg-muted text-foreground hover:bg-muted/80" : ""}`}
          >
            {showForm ? <><X className="w-4 h-4 mr-2" /> Cancel</> : <><Plus className="w-4 h-4 mr-2" /> New Order</>}
          </Button>
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
                  <CardTitle className="text-xl">New Order Entry</CardTitle>
                  <CardDescription>Enter order details to verify and generate a tracking link.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="orderNumber" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Order Number</Label>
                        <Input
                          id="orderNumber"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          placeholder="#1001"
                          required
                          className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customerName" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer Name</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Jane Doe"
                          required
                          className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customerEmail" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="jane@example.com"
                          required
                          className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Phone</Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="h-12 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="garmentType" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Garment Type</Label>
                        <Input
                          id="garmentType"
                          value={garmentType}
                          onChange={(e) => setGarmentType(e.target.value)}
                          placeholder="e.g., Wedding Suit, Evening Gown"
                          required
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
                        placeholder="Detailed measurements or special instructions..."
                        rows={4}
                        className="rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20 resize-none p-4"
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 font-semibold">
                        Create Order
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground/80">Active Orders</h2>
            <Badge variant="outline" className="rounded-full px-3 bg-white/50">{filteredOrders.length}</Badge>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
              >
                <Card className="bg-white/40 border-dashed border-2 border-white/60 shadow-none">
                  <CardContent className="py-20 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No orders found</p>
                    {searchQuery && <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">Clear search</Button>}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group overflow-hidden border-white/50 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all shadow-sm hover:shadow-md rounded-2xl">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row lg:items-stretch">
                          {/* Main Info */}
                          <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-bold tracking-tight">{order.orderNumber}</h3>
                                  <Badge variant="outline" className={`rounded-full px-2.5 font-medium border ${getStatusColor(order.currentStatus)} bg-opacity-50`}>
                                    {order.currentStatus}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">{order.garmentType}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono text-muted-foreground/60 mb-1">{order.id}</div>
                                <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="bg-white/30 border-t lg:border-t-0 lg:border-l border-white/40 p-3 lg:w-48 flex flex-row lg:flex-col gap-2 justify-center">
                            <Link href={`/backoffice/order/${order.id}`} className="flex-1">
                              <Button className="w-full h-9 rounded-lg bg-white hover:bg-white/80 text-foreground border border-zinc-200 shadow-sm" variant="ghost">
                                Manage
                                <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                              </Button>
                            </Link>

                            <div className="flex gap-2 flex-1">
                              <Button
                                variant="outline"
                                onClick={() => copyTrackingLink(order.id)}
                                className="flex-1 h-9 bg-transparent border-zinc-200 rounded-lg hover:bg-white/50"
                                title="Copy Link"
                              >
                                {copiedId === order.id ? <span className="text-green-600 font-bold">✓</span> : <Copy className="w-4 h-4 text-muted-foreground" />}
                              </Button>
                              <Link href={`/track/${order.id}`} target="_blank" className="flex-1">
                                <Button variant="outline" className="w-full h-9 bg-transparent border-zinc-200 rounded-lg hover:bg-white/50" title="Orbit View">
                                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                onClick={() => handleDelete(order.id)}
                                className="flex-1 h-9 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground px-0"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
