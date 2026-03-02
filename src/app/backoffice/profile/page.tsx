"use client"

import { useState, useEffect, useRef } from "react"
import { useOrganization } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { getInboxMessages, markMessageAsRead } from "@/app/actions/messages"
import { updateOrgProfile } from "@/app/actions/org-metadata"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, MailOpen, AlertCircle, Package, ArrowLeft, User, MessageSquare, Settings, Camera, Sparkles, ArrowRight } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

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

export default function ProfilePage() {
    const { organization, isLoaded } = useOrganization()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "settings")

    // Inbox State
    const [messages, setMessages] = useState<Message[]>([])
    const [messagesLoading, setMessagesLoading] = useState(true)

    // Profile State
    const [profileLoading, setProfileLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        companyName: "",
        contact: "",
        location: "",
        email: "",
        website: ""
    })

    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    useEffect(() => {
        if (!isLoaded) return

        if (organization) {
            const orgBusinessType = organization.publicMetadata?.businessType as string
            setBusinessType(orgBusinessType || localStorage.getItem("businessType"))

            // Initialize form data
            setFormData({
                companyName: organization.name,
                contact: (organization.publicMetadata?.contact as string) || "",
                location: (organization.publicMetadata?.location as string) || "",
                email: (organization.publicMetadata?.secondaryEmail as string) || "",
                website: (organization.publicMetadata?.website as string) || ""
            })
            setImagePreview(organization.imageUrl)

            if (activeTab === "inbox") {
                loadMessages()
            }
        } else {
            setMessagesLoading(false)
        }
    }, [isLoaded, organization, activeTab])

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization) return
        setProfileLoading(true)
        try {
            await updateOrgProfile(organization.id, formData)
            toast.success("Profile updated successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to update profile")
        } finally {
            setProfileLoading(false)
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-muted-foreground">Loading profile...</p>
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Profile</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage your business settings and customer inquiries</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab("settings")}
                    className={cn(
                        "px-6 py-3 text-sm font-semibold transition-all relative",
                        activeTab === "settings" ? "text-primary" : "text-slate-500 hover:text-slate-800"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </div>
                    {activeTab === "settings" && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("inbox")}
                    className={cn(
                        "px-6 py-3 text-sm font-semibold transition-all relative",
                        activeTab === "inbox" ? "text-primary" : "text-slate-500 hover:text-slate-800"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Inbox
                        {messages.filter(m => m.isRead === "false").length > 0 && (
                            <Badge className="ml-1 bg-red-500 text-white border-0 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                                {messages.filter(m => m.isRead === "false").length}
                            </Badge>
                        )}
                    </div>
                    {activeTab === "inbox" && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "settings" ? (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        <Card className="border-none shadow-sm overflow-hidden">
                            <CardContent className="p-8">
                                <form onSubmit={handleProfileSubmit} className="space-y-8">
                                    {/* Logo Section */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
                                        <div
                                            onClick={triggerFileInput}
                                            className="relative h-24 w-24 rounded-2xl overflow-hidden cursor-pointer group shadow-sm ring-1 ring-slate-200"
                                        >
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Logo" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full bg-slate-50 flex items-center justify-center">
                                                    <Camera className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                accept="image/*"
                                            />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h3 className="font-bold text-slate-900">Business Logo</h3>
                                            <p className="text-sm text-slate-500 mb-2">This logo will appear in customer tracking pages.</p>
                                            <Button type="button" variant="outline" size="sm" onClick={triggerFileInput}>
                                                Change Logo
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="companyName">Company Name</Label>
                                            <Input
                                                id="companyName"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                className="bg-slate-50/50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="contact">Contact Number</Label>
                                            <Input
                                                id="contact"
                                                name="contact"
                                                value={formData.contact}
                                                onChange={handleInputChange}
                                                className="bg-slate-50/50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="email">Public Email</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="bg-slate-50/50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="location">Business Address</Label>
                                            <Input
                                                id="location"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                className="bg-slate-50/50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="website">Website URL (Optional)</Label>
                                            <Input
                                                id="website"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleInputChange}
                                                className="bg-slate-50/50 border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            disabled={profileLoading}
                                            style={{ backgroundColor: config.theme.primary }}
                                            className="min-w-[140px] shadow-sm"
                                        >
                                            {profileLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : null}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="inbox"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                    >
                        {messagesLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                                <p className="text-muted-foreground">Loading messages...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
                                <CardContent className="py-20 text-center text-slate-400">
                                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium text-slate-500">Your inbox is empty</p>
                                    <p className="text-sm mt-1">When customers send messages from the tracking page, they will appear here.</p>
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
                                        <Card className={`overflow-hidden transition-all duration-200 border-l-[3px] shadow-sm hover:shadow-md ${msg.isRead === "false" ? "bg-white border-l-[#191A43]" : "bg-slate-50/50 border-l-slate-200 border-t-slate-100 border-r-slate-100 border-b-slate-100"}`}>
                                            <div className="p-5">
                                                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className={`text-base font-semibold truncate ${msg.isRead === "false" ? "text-slate-900" : "text-slate-700"}`}>
                                                                {msg.customerName}
                                                            </h3>
                                                            {msg.isRead === "false" && (
                                                                <Badge className="bg-red-50 text-red-600 border-red-100 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-none">
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
                                                                className="w-full text-xs"
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
                                                                <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
