"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { getInboxMessages, markMessageAsRead } from "@/app/actions/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, MailOpen, AlertCircle, Package, ArrowLeft } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

type Message = {
    id: string
    orderId: string | null
    customerName: string
    customerEmail: string | null
    customerPhone: string | null
    subject: string
    message: string
    isRead: string
    createdAt: Date
    order?: any
}

export default function InboxPage() {
    const { organization, isLoaded } = useOrganization()
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [businessType, setBusinessType] = useState<string | null>(null)

    const config = getBusinessConfig(businessType)

    useEffect(() => {
        if (!isLoaded) return

        if (organization) {
            const orgBusinessType = organization.publicMetadata?.businessType as string
            setBusinessType(orgBusinessType || localStorage.getItem("businessType"))
            loadMessages()
        } else {
            setLoading(false)
        }
    }, [isLoaded, organization])

    const loadMessages = async () => {
        if (!organization?.id) return
        setLoading(true)
        try {
            const result = await getInboxMessages(organization.id)
            if (result.messages) {
                setMessages(result.messages as Message[])
            } else {
                toast.error(result.error || "Failed to load messages")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to load messages")
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (messageId: string) => {
        try {
            setMessages(messages.map(m => m.id === messageId ? { ...m, isRead: "true" } : m))
            const result = await markMessageAsRead(messageId)
            if (result.error) {
                toast.error("Failed to mark as read")
                // Revert
                loadMessages()
            }
        } catch (error) {
            toast.error("Failed to mark as read")
        }
    }

    if (!isLoaded || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-muted-foreground">Loading inbox...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1000px] space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/backoffice">
                    <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-slate-900 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Inbox</h1>
                    <p className="text-sm text-slate-500 font-medium">Read inquiries sent from your tracking portal</p>
                </div>
            </div>

            <AnimatePresence mode="popLayout">
                {messages.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                        <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
                            <CardContent className="py-20 text-center text-slate-400">
                                <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-slate-500">Your inbox is empty</p>
                                <p className="text-sm mt-1">When customers send messages from the tracking page, they will appear here.</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className={`overflow-hidden transition-all duration-200 border-l-[3px] shadow-sm hover:shadow-md ${msg.isRead === "false" ? "bg-white border-l-[#191A43]" : "bg-slate-50/50 border-l-slate-200 border-t-slate-100 border-r-slate-100 border-b-slate-100"}`}>
                                    <div className="p-5">
                                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                            {/* Header / Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`text-base font-semibold truncate ${msg.isRead === "false" ? "text-slate-900" : "text-slate-700"}`}>
                                                        {msg.customerName}
                                                    </h3>
                                                    {msg.isRead === "false" && (
                                                        <Badge className="bg-red-50 text-red-600 border-red-100 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-none">
                                                            New Message
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 mb-3 font-medium">
                                                    {msg.customerEmail && <span>{msg.customerEmail}</span>}
                                                    {msg.customerEmail && msg.customerPhone && <span className="hidden sm:inline text-slate-300">•</span>}
                                                    {msg.customerPhone && <span>{msg.customerPhone}</span>}
                                                    <span className="hidden sm:inline text-slate-300">•</span>
                                                    <span>{new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                </div>

                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <h4 className="font-semibold text-slate-800 text-sm mb-1">Subject: {msg.subject}</h4>
                                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                </div>
                                            </div>

                                            {/* Actions & Context */}
                                            <div className="w-full md:w-48 shrink-0 flex flex-col items-start md:items-end gap-3 pt-1">
                                                {msg.order && (
                                                    <Link href={`/backoffice/order/${msg.order.id}`} className="w-full">
                                                        <Button variant="outline" className="w-full text-xs h-9 justify-start md:justify-center gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors">
                                                            <Package className="w-3.5 h-3.5" />
                                                            Order #{msg.order.orderNumber}
                                                        </Button>
                                                    </Link>
                                                )}

                                                {msg.isRead === "false" ? (
                                                    <Button
                                                        onClick={() => handleMarkAsRead(msg.id)}
                                                        className="w-full text-white text-xs h-9 justify-start md:justify-center rounded-lg shadow-sm border-0 font-medium transition-transform active:scale-[0.98]"
                                                        style={{ backgroundColor: config.theme.primary }}
                                                    >
                                                        Mark as Read
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium px-2 py-1 w-full justify-start md:justify-center">
                                                        <MailOpen className="w-3.5 h-3.5" />
                                                        Read
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
