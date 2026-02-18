"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOrderById, type Order } from "@/lib/storage"
import Link from "next/link"
import { getBusinessConfig } from "@/lib/business-configs"
import { Footer } from "@/components/footer"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TrackingDetailsPage() {
  const params = useParams()
  const trackingId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageSubject, setMessageSubject] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (trackingId) {
      const foundOrder = getOrderById(trackingId)
      setOrder(foundOrder)
      setLoading(false)
    }
  }, [trackingId])

  const handleSendMessage = async () => {
    if (!messageBody) {
      toast.error("Please enter a message")
      return
    }

    setIsSending(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    toast.success("Message sent successfully! We'll get back to you soon.")
    setIsSending(false)
    setIsDialogOpen(false)
    setMessageSubject("")
    setMessageBody("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#191A43] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading status...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="py-12 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Order Not Found</h2>
              <p className="text-slate-500 mt-2">
                We couldn't find an order with ID <span className="font-mono font-bold text-slate-900">{trackingId}</span>
              </p>
            </div>
            <Link href="/track">
              <Button size="lg" className="rounded-xl bg-[#191A43] text-white hover:bg-[#191A43]/90 w-full h-12 text-base">
                Try Another ID
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("completed")) {
      return "bg-green-100 text-green-700 border-green-200"
    }
    if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked") || status.toLowerCase().includes("dispatched")) {
      return "bg-blue-100 text-blue-700 border-blue-200"
    }
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  const config = getBusinessConfig(order?.businessType || "tailoring")

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Mobile-First Sticky Header */}
      <div
        className="sticky top-0 z-50 text-white shadow-lg"
        style={{ backgroundColor: config.theme.primary }}
      >
        <div className="px-8 h-20 flex items-center justify-end">
          <div className="flex items-center text-2xl font-bold tracking-tight">
            <span style={{ color: config.theme.secondary }} className="font-black">O</span>
            <span className="text-white font-bold">Tracker</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl pt-14 space-y-6">

        {/* Page Title */}
        <h2 className="text-lg font-bold text-[#191A43]">Tracking Details</h2>

        {/* Order Status Card */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{config.orderLabel}</p>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: config.theme.primary }}>{order.orderNumber}</h1>
              </div>
              <Package className="w-6 h-6" style={{ color: config.theme.primary }} />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Badge className={`rounded-lg px-3 py-1.5 text-sm font-semibold border ${getStatusColor(order.currentStatus)}`}>
                {order.currentStatus}
              </Badge>
              <span className="text-sm text-slate-400 font-medium">
                {order.garmentType}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-xs text-slate-400 font-medium">Placed on</div>
            <div className="text-sm font-semibold text-slate-700">
              {order.createdAt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-6" style={{ color: config.theme.primary }}>Tracking History</h3>
            <div className="space-y-6">
              {order.statusHistory.map((statusItem, index) => {
                const isFirst = index === 0;
                const isLast = index === order.statusHistory.length - 1;
                return (
                  <div key={index} className="flex items-start gap-4">
                    {/* Date & Time Column */}
                    <div className="w-20 text-left shrink-0">
                      <div className="text-xs text-slate-400 font-medium">
                        {statusItem.timestamp.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-base font-bold" style={{ color: config.theme.primary }}>
                        {statusItem.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>

                    {/* Timeline Column with Dot and Line */}
                    <div className="relative flex flex-col items-center">
                      {/* Dot */}
                      {isFirst ? (
                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(206,0,3,0.6)] shrink-0" style={{ backgroundColor: config.theme.accent }} />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                      )}
                      {/* Dashed Line */}
                      {!isLast && (
                        <div className="w-px h-16 border-l-2 border-dashed border-slate-200 mt-1" />
                      )}
                    </div>

                    {/* Content Column */}
                    <div className={`flex-1 pb-2 ${isFirst ? "" : "opacity-60"}`}>
                      <h4 className="text-base font-semibold leading-tight" style={{ color: config.theme.primary }}>
                        {statusItem.status}
                      </h4>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        {statusItem.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Customer Details Card */}
        <Card className="border-none shadow-sm rounded-2xl max-w-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-[#191A43] text-base mb-2">Customer Details</h3>

            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Name</div>
                <div className="font-semibold text-[#191A43] text-sm">{order.customerName}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Email</div>
                <div className="font-semibold text-[#191A43] text-sm break-all">{order.customerEmail}</div>
              </div>

              {order.customerPhone && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Phone</div>
                  <div className="font-semibold text-[#191A43] text-sm">{order.customerPhone}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        {/* Help Section */}
        <div className="pt-6 pb-8 text-center">
          <p className="text-sm text-slate-400 mb-3">Questions about your order?</p>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full bg-white border border-slate-200 transition-all duration-300 shadow-sm h-12 rounded-xl font-semibold gap-2 border-0"
                style={{ color: config.theme.primary }}
              >
                <MessageSquare className="w-4 h-4" />
                Send a Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#191A43]">Send a Message</DialogTitle>
                <DialogDescription>
                  We'll respond to your email {order?.customerEmail ? `(${order.customerEmail})` : ""} within 2min.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-[#191A43]">Subject</Label>
                  <Input
                    id="subject"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="e.g. Change pickup time"
                    className="rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[#191A43]">Message</Label>
                  <Textarea
                    id="message"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="How can we help you?"
                    className="min-h-[120px] rounded-lg border-slate-200 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="w-full text-white rounded-xl h-11 font-semibold gap-2 shadow-sm border-0"
                  style={{ backgroundColor: config.theme.primary }}
                  onClick={handleSendMessage}
                  disabled={isSending}
                >
                  {isSending ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Footer />
    </div>
  )
}
