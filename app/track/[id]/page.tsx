"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOrderById, type Order } from "@/lib/storage"
import Link from "next/link"
import { ArrowLeft, Package, MapPin, Clock, CheckCircle2 } from "lucide-react"

export default function TrackingDetailsPage() {
  const params = useParams()
  const trackingId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (trackingId) {
      const foundOrder = getOrderById(trackingId)
      setOrder(foundOrder)
      setLoading(false)
    }
  }, [trackingId])

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
    if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("picked")) {
      return "bg-blue-100 text-blue-700 border-blue-200"
    }
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Mobile-First Sticky Header */}
      <div className="sticky top-0 z-50 bg-[#191A43] text-white shadow-lg shadow-blue-900/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-2xl">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div className="font-bold text-lg tracking-tight">Tracking Details</div>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl pt-6 space-y-6">

        {/* Order Status Card */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Order Number</p>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{order.orderNumber}</h1>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Package className="w-6 h-6" />
              </div>
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
            <h3 className="text-lg font-bold text-slate-900 mb-6">Tracking History</h3>
            <div className="relative pl-2 space-y-12 before:absolute before:left-[7px] before:top-3 before:bottom-4 before:w-[2px] before:bg-slate-200">
              {order.statusHistory.map((statusItem, index) => {
                const isFirst = index === 0;
                return (
                  <div key={index} className="relative flex gap-6 pl-2">
                    {/* Timeline Dot */}
                    <div className={`
                      absolute left-[-4px] top-4 w-6 h-6 rounded-full border-4 shrink-0 z-10 
                      ${isFirst
                        ? "bg-[#00BFA5] border-[#E0F2F1]"  // Teal dot with light teal border matching "teal" description
                        : "bg-slate-200 border-white"
                      }
                    `} />

                    {/* Content */}
                    <div className={`flex-1 ${isFirst ? "" : "opacity-70"}`}>
                      {/* Date */}
                      <div className="text-sm font-medium text-slate-500 mb-1">
                        {statusItem.timestamp.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Time */}
                      <div className="text-3xl font-bold text-[#191A43] mb-3 tracking-tight">
                        {statusItem.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>

                      {/* Message */}
                      <h4 className="text-lg font-bold text-[#191A43] leading-snug mb-2">
                        {statusItem.message}
                      </h4>

                      {/* Location */}
                      <div className="text-sm text-slate-400 font-normal">
                        {statusItem.location || "Processing Center"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Customer Details Card */}
        <Card className="border-none shadow-sm rounded-2xl max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Customer Details</h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Name</div>
                <div className="font-semibold text-slate-900">{order.customerName}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Email</div>
                <div className="font-semibold text-slate-900 break-all">{order.customerEmail}</div>
              </div>

              {order.customerPhone && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Phone</div>
                  <div className="font-semibold text-slate-900">{order.customerPhone}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-slate-400 pt-8 pb-4">
          Need help? <a href="#" className="text-blue-600 font-semibold underline">Contact Support</a>
        </p>
      </div>
    </div>
  )
}
