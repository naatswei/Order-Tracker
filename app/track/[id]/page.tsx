"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOrderById, type Order } from "@/lib/storage"
import Link from "next/link"

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
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
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Order Not Found</h2>
              <p className="text-muted-foreground">
                We couldn't find an order with tracking ID:{" "}
                <span className="font-mono font-semibold">{trackingId}</span>
              </p>
              <Link href="/track">
                <Button>Try Another ID</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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

  const isCompleted = (index: number) => {
    // First item (most recent) is always active/completed
    return index === 0
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
              </Link>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Tracking ID</div>
              <div className="font-mono font-semibold">{order.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-balance">Order {order.orderNumber}</h1>
            <Badge className={`${getStatusColor(order.currentStatus)} text-base px-4 py-1`}>
              {order.currentStatus}
            </Badge>
            <div className="text-muted-foreground">
              <p className="text-lg">{order.garmentType}</p>
              <p className="text-sm mt-2">Order placed on {order.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="space-y-8">
                {order.statusHistory.map((status, index) => (
                  <div key={status.id} className="flex gap-6">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      {/* Circle */}
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 ${isCompleted(index) ? "bg-primary ring-4 ring-primary/20" : "bg-muted ring-4 ring-muted/20"
                          }`}
                      />
                      {/* Vertical Line */}
                      {index < order.statusHistory.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 mt-2 min-h-[60px] ${isCompleted(index) ? "bg-primary/30" : "bg-muted"}`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {status.timestamp.toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-2xl font-bold">
                            {status.timestamp.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-relaxed">{status.message}</h3>
                        <p className="text-muted-foreground text-sm mt-1">{status.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Order Details</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer Name:</span>
                  <p className="font-medium mt-1">{order.customerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Garment Type:</span>
                  <p className="font-medium mt-1">{order.garmentType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium mt-1">{order.customerEmail}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium mt-1">{order.customerPhone}</p>
                  </div>
                )}
                {order.measurements && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="font-medium mt-1 whitespace-pre-wrap">{order.measurements}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need help? Contact us at support@tailoring.com or call (555) 123-4567</p>
          </div>
        </div>
      </div>
    </div>
  )
}
