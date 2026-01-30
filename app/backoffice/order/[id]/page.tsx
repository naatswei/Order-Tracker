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
import { ArrowLeft, MapPin, Clock, CheckCircle2, Truck, Scissors, Package, Send, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

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
    { status: "Measurements Taken", location: "Factory", message: "Measurements have been recorded", icon: Scissors },
    { status: "Quality Check", location: "Quality Control", message: "Garment is undergoing quality inspection", icon: CheckCircle2 },
    { status: "Ready for Pickup", location: "Ready Counter", message: "Your order is ready to be picked up", icon: Package },
    { status: "Out for Delivery", location: "In Transit", message: "Order is on the way to you", icon: Truck },
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
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/40 border-white/50 backdrop-blur-md shadow-xl">
          <CardContent className="py-12 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-red-500 opacity-60" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Order Not Found</h2>
            <p className="text-muted-foreground">The order you requested could not be found.</p>
            <Link href="/backoffice">
              <Button size="lg" className="rounded-full shadow-lg shadow-primary/20">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (statusText: string) => {
    if (statusText.toLowerCase().includes("delivered") || statusText.toLowerCase().includes("completed")) {
      return "bg-green-100 text-green-700 border-green-200"
    }
    if (statusText.toLowerCase().includes("ready") || statusText.toLowerCase().includes("picked")) {
      return "bg-blue-100 text-blue-700 border-blue-200"
    }
    return "bg-zinc-100 text-zinc-700 border-zinc-200"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 font-sans selection:bg-primary/20 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/backoffice">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Update Order</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Manage status and details</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Order ID</div>
              <div className="font-mono text-sm font-medium">{order.id}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Current Order Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="bg-white/60 border-white/50 backdrop-blur-md shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-6">
                <CardTitle className="flex justify-between items-start">
                  <span>Order Information</span>
                  <Badge className={`rounded-full px-3 font-medium border ${getStatusColor(order.currentStatus)} bg-opacity-50`}>
                    {order.currentStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h3>
                  <p className="text-muted-foreground">{order.garmentType}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer</div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                    <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                  </div>
                  <div className="space-y-1 order-last sm:order-none">
                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Created</div>
                    <div className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>

                {order.measurements && (
                  <div className="bg-white/50 rounded-xl p-4 border border-white/60 text-sm">
                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Notes & Measurements</div>
                    <p className="whitespace-pre-wrap text-muted-foreground/80 leading-relaxed">{order.measurements}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/40 border-white/50 backdrop-blur-sm shadow-md rounded-3xl">
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>Order timeline updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 pl-2 relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-zinc-200 z-0" />

                  {order.statusHistory.map((historyItem, index) => (
                    <div key={historyItem.id} className="relative z-10 flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${index === 0 ? "bg-primary text-white" : "bg-zinc-100 text-zinc-400"}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1">
                          <span className={`font-semibold ${index === 0 ? "text-foreground" : "text-muted-foreground"}`}>{historyItem.message}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{new Date(historyItem.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {historyItem.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Update Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card className="bg-white/60 border-white/50 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden sticky top-24">
              <CardHeader className="bg-primary/5">
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Push a new update to the customer</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status Title</Label>
                    <Input
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="e.g. Cutting Started"
                      required
                      className="h-11 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Location / Department</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Design Studio"
                      required
                      className="h-11 rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="ml-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Detailed update for the customer..."
                      rows={3}
                      required
                      className="rounded-xl bg-white/50 border-zinc-200 focus-visible:ring-primary/20 resize-none"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 font-semibold group">
                    Send Update <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>

                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-4">Quick Updates</p>
                  <div className="grid grid-cols-2 gap-3">
                    {quickStatuses.map((quickStatus, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-3 px-4 justify-start text-left bg-white/40 hover:bg-white/80 border-white/60 hover:border-primary/30 transition-all rounded-xl shadow-sm"
                        onClick={() => handleQuickStatus(quickStatus)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary">
                            <quickStatus.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{quickStatus.status}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{quickStatus.location}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
