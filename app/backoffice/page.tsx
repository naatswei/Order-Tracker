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

export default function BackofficePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
      return "bg-primary text-primary-foreground"
    }
    if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked")) {
      return "bg-accent text-accent-foreground"
    }
    return "bg-secondary text-secondary-foreground"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Backoffice</h1>
                <p className="text-muted-foreground mt-1">Manage tailoring orders and tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <OrganizationSwitcher afterCreateOrganizationUrl="/backoffice" />
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button onClick={() => setShowForm(!showForm)} size="lg">
            {showForm ? "Cancel" : "+ Create New Order"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>New Order Entry</CardTitle>
              <CardDescription>Enter all order details to generate a tracking link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Order Number *</Label>
                    <Input
                      id="orderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g., #1893-1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="garmentType">Garment Type *</Label>
                    <Input
                      id="garmentType"
                      value={garmentType}
                      onChange={(e) => setGarmentType(e.target.value)}
                      placeholder="e.g., Suit, Dress, Shirt"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="measurements">Measurements & Notes</Label>
                  <Textarea
                    id="measurements"
                    value={measurements}
                    onChange={(e) => setMeasurements(e.target.value)}
                    placeholder="Enter measurements, fabric details, special instructions..."
                    rows={4}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full md:w-auto">
                  Create Order & Generate Link
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">All Orders ({orders.length})</h2>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No orders yet. Create your first order above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-3 flex-wrap">
                          <h3 className="text-xl font-semibold">{order.orderNumber}</h3>
                          <Badge className={getStatusColor(order.currentStatus)}>{order.currentStatus}</Badge>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{" "}
                            <span className="font-medium">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Garment:</span>{" "}
                            <span className="font-medium">{order.garmentType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>{" "}
                            <span className="font-medium">{order.customerEmail}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tracking ID:</span>{" "}
                            <span className="font-mono font-medium">{order.id}</span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Created: {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                        <Link href={`/backoffice/order/${order.id}`} className="w-full">
                          <Button variant="default" className="w-full">
                            Update Status
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={() => copyTrackingLink(order.id)} className="w-full">
                          {copiedId === order.id ? "Copied!" : "Copy Link"}
                        </Button>
                        <Link href={`/track/${order.id}`} className="w-full">
                          <Button variant="outline" className="w-full bg-transparent">
                            View Tracking
                          </Button>
                        </Link>
                        <Button variant="destructive" onClick={() => handleDelete(order.id)} className="w-full">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
