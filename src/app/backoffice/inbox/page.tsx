"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { getInboxMessages, markMessageAsRead } from "@/app/actions/messages"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, MailOpen, ArrowLeft } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"

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
    const [messagesLoading, setMessagesLoading] = useState(true)
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    useEffect(() => {
        if (!isLoaded) return

        if (organization) {
            const orgBusinessType = organization.publicMetadata?.businessType as string
            setBusinessType(orgBusinessType || localStorage.getItem("businessType"))
            loadMessages()
        } else {
            setMessagesLoading(false)
        }
    }, [isLoaded, organization])

    const loadMessages = async () => {
        if (!organization?.id) return
        setMessagesLoading(true)
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
            setMessagesLoading(false)
        }
    }

    const handleMarkAsRead = async (messageId: string) => {
        try {
            setMessages(messages.map(m => m.id === messageId ? { ...m, isRead: "true" } : m))
            const result = await markMessageAsRead(messageId)
            if (result.error) {
                toast.error("Failed to mark as read")
                loadMessages()
            }
        } catch (error) {
            toast.error("Failed to mark as read")
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-muted-foreground">Loading inbox...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background font-sans">
            <BackofficeHeader config={config} />

            <div className="container mx-auto px-4 py-8 max-w-[1000px] space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/backoffice">
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-slate-900 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Inbox</h1>
                        <p className="text-sm text-slate-500 font-medium">Respond to inquiries and messages from your customers</p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {messagesLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                            <p className="text-muted-foreground">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <Card className="bg-transparent border-dashed border-2 border-slate-200 shadow-none rounded-3xl">
                            <CardContent className="py-24 text-center">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                    <Mail className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Your inbox is empty</h3>
                                <p className="text-slate-500 font-medium">When customers send messages from the tracking page, they will appear here.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Card className={`overflow-hidden transition-all duration-500 rounded-2xl border ${msg.isRead === "false" ? "bg-white border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5" : "bg-slate-50/50 border-slate-100 shadow-sm"}`}>
                                        <div className="p-6">
                                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className={`text-lg font-semibold truncate ${msg.isRead === "false" ? "text-slate-900" : "text-slate-700"}`}>
                                                            {msg.customerName}
                                                        </h3>
                                                        {msg.isRead === "false" && (
                                                            <Badge className="bg-red-50 text-red-600 border border-red-100/50 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase shadow-none">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500 mb-3 font-medium">
                                                        {msg.customerEmail && <span>{msg.customerEmail}</span>}
                                                        <span className="hidden sm:inline text-slate-300">•</span>
                                                        <span>{new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                    </div>

                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <h4 className="font-semibold text-slate-800 text-sm mb-1">Subject: {msg.subject}</h4>
                                                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-32 shrink-0 flex flex-col gap-3">
                                                    {msg.isRead === "false" ? (
                                                        <Button
                                                            onClick={() => handleMarkAsRead(msg.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Mark as Read
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium py-1">
                                                            <MailOpen className="w-3.5 h-3.5" />
                                                            Read
                                                        </div>
                                                    )}
                                                    {msg.order && (
                                                        <Link href={`/backoffice/order/${msg.order.id}`}>
                                                            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 rounded-xl hover:bg-slate-100">
                                                                View Order
                                                            </Button>
                                                        </Link>
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
        </div>
    )
}
