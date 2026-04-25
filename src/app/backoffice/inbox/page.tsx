"use client"

import { useState, useEffect, useMemo } from "react"
import { useOrganization } from "@clerk/nextjs"
import { getInboxMessages, markThreadAsRead, submitBusinessReply, updateTypingStatus, getTypingStatus } from "@/app/actions/messages"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mail, MailOpen, ArrowLeft, Send, MessageSquare, MessageSquareMore, User, Building2, Lock } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import { SignatureLoader } from "@/components/signature-loader"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"
import { getPlanLimits } from "@/lib/plan-config"

type Message = {
    id: string
    orderId: string | null
    threadId: string
    sender: string
    customerName: string
    customerEmail: string | null
    customerPhone: string | null
    subject: string
    message: string
    isRead: string
    createdAt: Date
    order?: any
}

// Group messages into threads by orderId
function groupByThread(messages: Message[]) {
    const threads: Record<string, { orderId: string | null; customerName: string; subject: string; messages: Message[]; hasUnread: boolean; latestAt: Date }> = {}

    for (const msg of messages) {
        // Prioritize orderId as the key for consistency with the tracking page
        const key = msg.orderId || msg.threadId || msg.id
        if (!threads[key]) {
            threads[key] = {
                orderId: msg.orderId,
                customerName: msg.customerName,
                subject: msg.subject,
                messages: [],
                hasUnread: false,
                latestAt: new Date(msg.createdAt)
            }
        }
        threads[key].messages.push(msg)
        if (msg.isRead === "false" && msg.sender === "customer") {
            threads[key].hasUnread = true
        }
        const msgDate = new Date(msg.createdAt)
        if (msgDate > threads[key].latestAt) {
            threads[key].latestAt = msgDate
        }
    }

    // Sort each thread's messages chronologically
    for (const key in threads) {
        threads[key].messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    // Return as array sorted by latest message
    return Object.entries(threads)
        .map(([key, thread]) => ({ key, ...thread }))
        .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
}

export default function InboxPage() {
    const { organization, isLoaded } = useOrganization()
    const [messages, setMessages] = useState<Message[]>([])
    const [messagesLoading, setMessagesLoading] = useState(true)
    const [businessType, setBusinessType] = useState<string | null>(null)
    const [expandedThread, setExpandedThread] = useState<string | null>(null)
    const [replyText, setReplyText] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [isCustomerTyping, setIsCustomerTyping] = useState(false)

    const threads = useMemo(() => groupByThread(messages), [messages])
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

    // Plan-based feature check
    const planName = organization?.publicMetadata?.subscriptionPlan as string | undefined
    const planLimits = getPlanLimits(planName)

    if (!planLimits.messaging) {
        return (
            <div className="min-h-screen bg-slate-50/50 font-sans">
                <BackofficeHeader config={config} />
                <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Messaging Unavailable</h2>
                    <p className="text-slate-500 text-sm">Customer messaging is available on the <strong>2 Weeks</strong> plan and above. Upgrade to unlock this feature.</p>
                    <Link href="/backoffice/profile?tab=subscription">
                        <Button className="bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold rounded-xl px-8 h-11">
                            Upgrade Plan
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

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

    const handleExpandThread = async (threadKey: string, thread: ReturnType<typeof groupByThread>[0]) => {
        if (expandedThread === threadKey) {
            setExpandedThread(null)
            setReplyText("")
            return
        }
        setExpandedThread(threadKey)
        setReplyText("")

        // Mark unread customer messages as read
        if (thread.hasUnread) {
            const unreadCustomerMsgs = thread.messages.filter(m => m.isRead === "false" && m.sender === "customer")
            for (const msg of unreadCustomerMsgs) {
                await markThreadAsRead(msg.threadId)
            }
            // Update local state using the same key logic
            setMessages(prev => prev.map(m => {
                const msgKey = m.orderId || m.threadId || m.id
                if (msgKey === threadKey && m.sender === "customer") {
                    return { ...m, isRead: "true" }
                }
                return m
            }))
        }
    }

    // Typing Status Polling
    useEffect(() => {
        if (!expandedThread) {
            setIsCustomerTyping(false)
            return
        }

        const pollTyping = async () => {
            const result = await getTypingStatus(expandedThread)
            if (result.statuses) {
                const customerStatus = result.statuses.find(s => s.userType === "customer")
                setIsCustomerTyping(!!customerStatus)
            }
        }

        pollTyping()
        const interval = setInterval(pollTyping, 4000)
        return () => clearInterval(interval)
    }, [expandedThread])

    const handleSendReply = async (thread: ReturnType<typeof groupByThread>[0]) => {
        if (!replyText.trim()) return
        const currentReplyText = replyText.trim()

        // Optimistic UI update
        const newMessage: Message = {
            id: `temp-${Date.now()}`,
            orderId: thread.orderId,
            threadId: thread.key,
            sender: "business",
            customerName: thread.customerName,
            customerEmail: null,
            customerPhone: null,
            subject: "Reply",
            message: currentReplyText,
            isRead: "true",
            createdAt: new Date()
        }

        setMessages(prev => [newMessage, ...prev])
        setReplyText("")
        setIsSending(true)

        try {
            const result = await submitBusinessReply({
                threadId: thread.key,
                orderId: thread.orderId,
                message: currentReplyText
            })
            if (result.error) {
                toast.error(result.error)
                // Remove the optimistic message on error
                setMessages(prev => prev.filter(m => m.id !== newMessage.id))
            } else {
                toast.success("Reply sent!")
            }
        } catch (error) {
            toast.error("Failed to send reply")
            setMessages(prev => prev.filter(m => m.id !== newMessage.id))
        } finally {
            setIsSending(false)
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <SignatureLoader message="Syncing Inbox" />
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
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Customer Inbox</h1>
                        <p className="text-sm text-slate-500 font-medium">View and reply to customer messages</p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {messagesLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <SignatureLoader message="Syncing Messages" />
                        </div>
                    ) : threads.length === 0 ? (
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
                            {threads.map((thread) => (
                                <motion.div
                                    key={thread.key}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Card className={`overflow-hidden transition-all duration-300 rounded-2xl border ${thread.hasUnread ? "bg-white border-slate-200 shadow-[0_4px_20_rgb(0,0,0,0.04)]" : "bg-slate-50/50 border-slate-100 shadow-sm"}`}>
                                        {/* Thread Header - clickable */}
                                        <div
                                            className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                            onClick={() => handleExpandThread(thread.key, thread)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className={`text-base font-semibold truncate ${thread.hasUnread ? "text-slate-900" : "text-slate-600"}`}>
                                                            {thread.customerName}
                                                        </h3>
                                                        {thread.hasUnread && (
                                                            <Badge className="bg-red-50 text-red-600 border border-red-100/50 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase shadow-none">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 mb-1 truncate">{thread.subject}</p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                                        <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                                                        <span>•</span>
                                                        <span>{new Date(thread.latestAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    {thread.orderId && (
                                                        <Link href={`/backoffice/order/${thread.orderId}`} onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" className="hidden sm:flex text-xs text-slate-500 rounded-xl hover:bg-slate-100 h-8">
                                                                View Order
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[11px] font-bold rounded-xl h-8 px-3 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white shadow-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleExpandThread(thread.key, thread)
                                                        }}
                                                    >
                                                        {expandedThread === thread.key ? "Hide" : "Reply"}
                                                    </Button>
                                                    <MessageSquare className={`w-4 h-4 transition-transform ${expandedThread === thread.key ? "rotate-90 text-slate-700" : "text-slate-300"}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Thread */}
                                        <AnimatePresence>
                                            {expandedThread === thread.key && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-slate-100">
                                                        {/* Messages */}
                                                        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                                            {thread.messages.map((msg) => (
                                                                <div
                                                                    key={msg.id}
                                                                    className={`flex ${msg.sender === "business" ? "justify-end" : "justify-start"}`}
                                                                >
                                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === "business"
                                                                        ? "bg-slate-800 text-white"
                                                                        : "bg-slate-100 text-slate-800"
                                                                        }`}>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            {msg.sender === "customer" ? (
                                                                                <User className="w-3 h-3 opacity-50" />
                                                                            ) : (
                                                                                <Building2 className="w-3 h-3 opacity-50" />
                                                                            )}
                                                                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                                                                                {msg.sender === "customer" ? msg.customerName : "You"}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                                        <p className={`text-[10px] mt-2 ${msg.sender === "business" ? "text-white/40" : "text-slate-400"}`}>
                                                                            {new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {isCustomerTyping && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="px-4 py-2 flex items-center gap-2"
                                                            >
                                                                <div className="flex items-center gap-2 text-slate-400">
                                                                    <motion.div
                                                                        animate={{
                                                                            scale: [1, 1.1, 1],
                                                                        }}
                                                                        transition={{
                                                                            duration: 1.5,
                                                                            repeat: Infinity,
                                                                            ease: "easeInOut"
                                                                        }}
                                                                    >
                                                                        <MessageSquareMore className="w-4 h-4" />
                                                                    </motion.div>
                                                                    <div className="flex gap-1">
                                                                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                                    </div>
                                                                </div>
                                                                <span className="text-[11px] font-medium text-slate-400 font-sans">{thread.customerName} is typing...</span>
                                                            </motion.div>
                                                        )}

                                                        {/* Reply Input */}
                                                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                                            <div className="flex gap-3">
                                                                <Textarea
                                                                    value={replyText}
                                                                    onChange={(e) => {
                                                                        setReplyText(e.target.value)
                                                                        // Update typing status
                                                                        updateTypingStatus(thread.key, "business")
                                                                    }}
                                                                    placeholder="Type your reply..."
                                                                    className="flex-1 min-h-[44px] max-h-[120px] rounded-xl bg-white border-slate-200 text-sm resize-none focus-visible:border-slate-300 focus-visible:ring-[3px] focus-visible:ring-slate-100/80"
                                                                    rows={1}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                                            e.preventDefault()
                                                                            handleSendReply(thread)
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    onClick={() => handleSendReply(thread)}
                                                                    disabled={!replyText.trim() || isSending}
                                                                    className="h-11 px-4 rounded-xl border-0 text-white font-semibold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                                                                    style={{ backgroundColor: config.theme.primary }}
                                                                >
                                                                    {isSending ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <span>Send Reply</span>
                                                                            <Send className="w-4 h-4" />
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
