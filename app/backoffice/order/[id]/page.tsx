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
import { ArrowLeft, MapPin, Clock, User, Phone, Mail, Shirt, Info, Package } from "lucide-react"
import { motion } from "framer-motion"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"

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

  // Quick status options (Pills)
  const quickStatuses = [
    "Order Received", "Measurement Taken", "Production", "Quality Checks",
    "First Fitting", "Second Fitting", "Third Fitting", "Completed",
    "Out for Delivery", "Delivered", "Pending", "Refunded",
    "Order Cancelled", "Apologies: Order Delayed"
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

    if (!status) {
      alert("Please enter a status")
      return
    }

    const updated = addStatusUpdate(orderId, status, location || "Main Office", message || "Status updated")
    if (updated) {
      alert("Status updated successfully!")
      router.push("/backoffice")
    } else {
      alert("Failed to update status")
    }
  }

  const handleQuickStatus = (statusText: string) => {
    setStatus(statusText)
  }

  const handleClear = () => {
    setStatus("")
    setLocation("")
    setMessage("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FCFF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F9FCFF] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/40 border-white/50 backdrop-blur-md shadow-xl">
          <CardContent className="py-12 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-red-500 opacity-60" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Order Not Found</h2>
            <p className="text-muted-foreground">The order you requested could not be found.</p>
            <Link href="/backoffice">
              <Button size="lg" className="rounded-full shadow-lg shadow-blue-600/20">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (statusText: string) => {
    if (statusText.toLowerCase().includes("delivered") || statusText.toLowerCase().includes("completed")) {
      return "text-green-600 bg-green-50 border-green-200"
    }
    if (statusText.toLowerCase().includes("production") || statusText.toLowerCase().includes("manufacturing")) {
      return "text-blue-600 bg-blue-50 border-blue-200"
    }
    return "text-blue-600 bg-blue-50 border-blue-200"
  }

  return (
    <div className="min-h-screen bg-[#F9FCFF] font-sans selection:bg-blue-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Update Order Status</h1>
              <p className="text-sm text-slate-500">Add a new status update to this order</p>
            </div>
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">KT</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/backoffice">
            <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-lg px-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Order Summary Card */}
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-l-4 border-blue-500">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Order Number</div>
                      <div className="text-lg font-bold text-slate-900">{order.orderNumber}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="text-xs text-slate-500 mb-2">Current Status</div>
                  <Badge variant="outline" className={`rounded-full px-4 py-1.5 font-medium border text-xs ${getStatusColor(order.currentStatus)}`}>
                    {order.currentStatus}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shirt className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium capitalize">{order.garmentType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">{order.customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium truncate" title={order.customerEmail}>{order.customerEmail}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Status History Card */}
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-4 space-y-8 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {order.statusHistory.map((historyItem, index) => (
                    <div key={index} className="relative flex gap-4">
                      <div className={`w-3.5 h-3.5 mt-1.5 rounded-full border-2 bg-white shrink-0 z-10 ${index === 0 ? "border-blue-500 ring-4 ring-blue-50" : "border-slate-300"}`} />
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">{historyItem.status}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" /> {historyItem.location || "Main Office"}
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed max-w-[200px]">{historyItem.message}</div>
                        <div className="text-[10px] text-slate-400 pt-1">{new Date(historyItem.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Update Form */}
          <div className="lg:col-span-8">
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl h-full">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Add New Status Update</CardTitle>
                <CardDescription>Enter custom status details or use quick options below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Quick Options */}
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-4">Quick Status Options</div>
                  <div className="flex flex-wrap gap-3">
                    {quickStatuses.map((qs) => (
                      <button
                        key={qs}
                        type="button"
                        onClick={() => handleQuickStatus(qs)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border ${status === qs ? "bg-blue-500 text-white border-blue-500 shadow-blue-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                      >
                        {qs}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Status <span className="text-red-500">*</span></Label>
                    <Input
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="Enter custom status"
                      className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Location</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Main Office, Factory"
                      className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Status message</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Detailed message for customer"
                      className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 resize-none"
                    />
                    <p className="text-xs text-slate-400">This message will be visible to the customers.</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" size="lg" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold shadow-lg shadow-blue-600/20 rounded-lg">
                      Add Status Update
                    </Button>
                    <Button type="button" onClick={handleClear} variant="outline" size="lg" className="px-8 h-12 text-base font-medium rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700">
                      Clear
                    </Button>
                  </div>
                </form>

                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 border border-blue-100">
                  <span className="font-bold shrink-0">Note:</span>
                  <span>Status update will be automatically sent to customer via Email or SMS notification.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
