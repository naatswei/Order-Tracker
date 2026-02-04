"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getAllOrders, type Order } from "@/lib/storage"
import Link from "next/link"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"
import { Package, Plus, Search, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

export default function BackofficePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Load orders on mount
  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = () => {
    const allOrders = getAllOrders()
    setOrders(allOrders)
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
              <Link href="/backoffice/create" className="flex-1 md:flex-none">
                <Button className="w-full h-11 rounded-lg shadow-sm gap-2 px-6 font-medium transition-all bg-slate-900 hover:bg-slate-800 text-white">
                  <Plus className="w-4 h-4" /> Create New Order
                </Button>
              </Link>
            </div>
          </div>
        </div>


        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[16px] font-semibold tracking-tight text-foreground/80">Active Orders</h2>
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
                    <div className="flex justify-center w-full">
                      <Card className="group overflow-hidden border-white/50 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all shadow-sm hover:shadow-md rounded-xl w-full max-w-[1370px] h-auto md:min-h-[300px] flex flex-col justify-center">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            {/* Main Info */}
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-4">
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">{order.orderNumber}</h3>
                                <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-normal text-sm border ${getStatusColor(order.currentStatus)} bg-opacity-50`}>
                                  {order.currentStatus}
                                </Badge>
                              </div>

                              <div className="space-y-2 text-[15px]">
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-24 shrink-0">Customer:</span>
                                  <span className="font-medium text-slate-700">{order.customerName}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-24 shrink-0">Contact:</span>
                                  <span className="font-medium text-slate-700">{order.customerPhone}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-24 shrink-0">Item Ordered:</span>
                                  <span className="font-medium text-slate-700 capitalize">{order.garmentType}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-24 shrink-0">Pick Up Date:</span>
                                  <span className="font-medium text-red-400">{order.pickupDate}</span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <div className="text-sm text-muted-foreground/60">Created: {new Date(order.createdAt).toLocaleString()}</div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-48 shrink-0">
                              <Link href={`/backoffice/order/${order.id}`}>
                                <Button className="w-full bg-[#CE0003] hover:bg-[#CE0003]/90 text-white rounded-lg h-9 shadow-sm font-medium">
                                  Update Status
                                </Button>
                              </Link>

                              <Button
                                variant="outline"
                                onClick={() => copyTrackingLink(order.id)}
                                className={`w-full bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg h-9 font-medium ${copiedId === order.id ? "text-green-600 border-green-200 bg-green-50" : ""}`}
                              >
                                {copiedId === order.id ? "Copied!" : "Copy Link"}
                              </Button>

                              <Link href={`/track/${order.id}`} target="_blank">
                                <Button variant="outline" className="w-full bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-9 font-medium">
                                  View Tracking
                                </Button>
                              </Link>

                              <Link href={`/backoffice/create?edit=${order.id}`}>
                                <Button
                                  className="w-full bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-lg h-9 shadow-sm font-medium mt-1"
                                >
                                  Edit Order
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
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

