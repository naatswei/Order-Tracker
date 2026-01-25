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
import { getOrderById, addStatusUpdate, type Order } from "@/lib/storage"
import Link from "next/link"

export default function OrderUpdatePage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [status, setStatus] = useState("")
  const [location, setLocation] = useState("")
  const [message, setMessage] = useState("")

  // Quick status options
  const quickStatuses = [
    { status: "Measurements Taken", location: "Factory", message: "Measurements have been recorded" },
    { status: "Cutting in Progress", location: "Cutting Department", message: "Fabric is being cut" },
    { status: "Stitching Started", location: "Stitching Department", message: "Tailoring work has begun" },
    {
      status: "Quality Check",
      location: "Quality Control",
      message: "Garment is undergoing quality inspection",
    },
    { status: "Ready for Pickup", location: "Ready Counter", message: "Your order is ready to be picked up" },
    { status: "Out for Delivery", location: "In Transit", message: "Order is on the way to you" },
    {
      status: "Delivered",
      location: "Customer Location",
      message: "Order has been successfully delivered to customer",
    },
  ]

  useEffect(() => {
    if (orderId) {
      const foundOrder = getOrderById(orderId)
      setOrder(foundOrder)
      setLoading(false)
    }
  }, [orderId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!status || !location || !message) {
      alert("Please fill in all fields")
      return
    }

    const updated = addStatusUpdate(orderId, status, location, message)
    if (updated) {
      alert("Status updated successfully!")
      router.push("/backoffice")
    } else {
      alert("Failed to update status")
    }
  }

  const handleQuickStatus = (quickStatus: { status: string; location: string; message: string }) => {
    setStatus(quickStatus.status)
    setLocation(quickStatus.location)
    setMessage(quickStatus.message)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto mt-20">
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-2xl font-bold">Order Not Found</h2>
              <Link href="/backoffice">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getStatusColor = (statusText: string) => {
    if (statusText.toLowerCase().includes("delivered") || statusText.toLowerCase().includes("completed")) {
      return "bg-primary text-primary-foreground"
    }
    if (statusText.toLowerCase().includes("ready") || statusText.toLowerCase().includes("picked")) {
      return "bg-accent text-accent-foreground"
    }
    return "bg-secondary text-secondary-foreground"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Update Order Status</h1>
              <p className="text-muted-foreground mt-1">Add a new status update for this order</p>
            </div>
            <Link href="/backoffice">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Current Order Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Order Number</div>
                  <div className="text-xl font-semibold">{order.orderNumber}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Status</div>
                  <Badge className={getStatusColor(order.currentStatus)}>{order.currentStatus}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Customer</div>
                    <div className="font-medium">{order.customerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Garment</div>
                    <div className="font-medium">{order.garmentType}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Contact</div>
                  <div className="text-sm">{order.customerEmail}</div>
                  {order.customerPhone && <div className="text-sm">{order.customerPhone}</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status History</CardTitle>
                <CardDescription>Most recent updates first</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {order.statusHistory.map((historyItem, index) => (
                    <div key={historyItem.id} className="border-l-2 border-primary/20 pl-4 pb-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {historyItem.timestamp.toLocaleDateString()} at {historyItem.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="font-semibold">{historyItem.message}</div>
                      <div className="text-sm text-muted-foreground">{historyItem.location}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Update Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Status Update</CardTitle>
                <CardDescription>Enter custom status details or use quick options below</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Input
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="e.g., Cutting in Progress"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Factory, Workshop"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Status Message *</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Detailed message for customer..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Add Status Update
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Status Options</CardTitle>
                <CardDescription>Click to auto-fill the form above</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {quickStatuses.map((quickStatus, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 bg-transparent"
                      onClick={() => handleQuickStatus(quickStatus)}
                    >
                      <div>
                        <div className="font-semibold">{quickStatus.status}</div>
                        <div className="text-xs text-muted-foreground">{quickStatus.location}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
