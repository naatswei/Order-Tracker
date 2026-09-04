"use client"

import { useState, useEffect, useRef } from "react"
import { useOrganization, useUser, OrganizationProfile } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { updateOrgProfile, updateOrgSubscriptionStatus, updateOrgInvoiceSettings } from "@/app/actions/org-metadata"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Camera, Settings, Building2, CreditCard, Check, Clock, Users } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import { validateLocation } from "@/lib/location-validator"
import Link from "next/link"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { PRICING_PLANS, FREE_TRIAL_PLAN } from "@/constants/pricing"

const PlanButton = dynamic(() => import("@/components/paystack-button"), {
    ssr: false,
    loading: () => <Button disabled className="w-full h-11 bg-slate-100 text-slate-400">Loading...</Button>
})

const plans = PRICING_PLANS;

export default function ProfilePage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const { user } = useUser()

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
    const [invoiceSettings, setInvoiceSettings] = useState({
        defaultTaxRate: "0",
        defaultDeliveryFee: "0",
        defaultDiscount: "0"
    })

    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    // Subscription State
    const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive")
    const [subscriptionExpiry, setSubscriptionExpiry] = useState<string>("")
    const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ""

    // Paystack Payout split settings state
    const [payoutSettings, setPayoutSettings] = useState({
        bankCode: "",
        bankName: "",
        accountNumber: "",
        accountName: ""
    })
    const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
    const [banksLoading, setBanksLoading] = useState(false)
    const [resolvingAccount, setResolvingAccount] = useState(false)
    const [payoutLoading, setPayoutLoading] = useState(false)

    // BulkClix Instant Payout settings state
    const [bulkclixPayoutType, setBulkclixPayoutType] = useState<"momo" | "bank">("momo")
    const [bulkclixAccountNumber, setBulkclixAccountNumber] = useState("")
    const [bulkclixAccountName, setBulkclixAccountName] = useState("")
    const [bulkclixChannelOrBankId, setBulkclixChannelOrBankId] = useState("MTN")
    const [bulkclixBankName, setBulkclixBankName] = useState("")
    const [bulkclixBanks, setBulkclixBanks] = useState<{ id: string; name: string }[]>([])
    const [bulkclixBanksLoading, setBulkclixBanksLoading] = useState(false)
    const [resolvingBulkclixAccount, setResolvingBulkclixAccount] = useState(false)
    const [bulkclixSaving, setBulkclixSaving] = useState(false)

    useEffect(() => {
        const fetchBanks = async () => {
            setBanksLoading(true)
            try {
                const { getGHSBanks } = await import("@/app/actions/paystack")
                const res = await getGHSBanks()
                if (res.success && res.banks) {
                    setBanks(res.banks.map((b: any) => ({ name: b.name, code: b.code })))
                }
            } catch (err) {
                console.error("Failed to load GHS banks:", err)
            } finally {
                setBanksLoading(false)
            }
        }
        fetchBanks()

        const fetchBulkClixBanks = async () => {
            setBulkclixBanksLoading(true)
            try {
                const { getBulkClixBankList } = await import("@/app/actions/bulkclix-payment")
                const res = await getBulkClixBankList()
                if (res.success && res.banks) {
                    setBulkclixBanks(res.banks.map((b: any) => ({ id: String(b.id || b.code || b.bank_id), name: b.name || b.bank_name })))
                }
            } catch (err) {
                console.error("Failed to load BulkClix banks:", err)
            } finally {
                setBulkclixBanksLoading(false)
            }
        }
        fetchBulkClixBanks()
    }, [])

    const handleResolveAccount = async () => {
        if (!payoutSettings.accountNumber || !payoutSettings.bankCode) {
            toast.error("Please select a bank and enter account number")
            return
        }
        setResolvingAccount(true)
        try {
            const { resolveBankAccount } = await import("@/app/actions/paystack")
            const res = await resolveBankAccount(payoutSettings.accountNumber, payoutSettings.bankCode)
            if (res.success && res.accountName) {
                setPayoutSettings(prev => ({ ...prev, accountName: res.accountName }))
                toast.success("Account name verified successfully!")
            } else {
                toast.error(res.error || "Failed to verify account details")
            }
        } catch (error) {
            toast.error("Account verification failed")
        } finally {
            setResolvingAccount(false)
        }
    }

    const handleResolveBulkClixAccount = async () => {
        if (!bulkclixAccountNumber) {
            toast.error("Please enter account or phone number")
            return
        }
        setResolvingBulkclixAccount(true)
        try {
            const { queryMoMoAccountName, queryBankAccountName } = await import("@/app/actions/bulkclix-payment")
            let res
            if (bulkclixPayoutType === "momo") {
                res = await queryMoMoAccountName(bulkclixAccountNumber)
            } else {
                if (!bulkclixChannelOrBankId) {
                    toast.error("Please select a bank first")
                    setResolvingBulkclixAccount(false)
                    return
                }
                res = await queryBankAccountName(bulkclixAccountNumber, bulkclixChannelOrBankId)
            }
            if (res.success && res.accountName) {
                setBulkclixAccountName(res.accountName)
                toast.success("Account name verified successfully!")
            } else {
                toast.error(res.error || "Failed to verify account details")
            }
        } catch (error) {
            toast.error("Account verification failed")
        } finally {
            setResolvingBulkclixAccount(false)
        }
    }

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

            // Subscription data
            const metadata = organization.publicMetadata as any
            setSubscriptionStatus(metadata?.subscriptionStatus || "inactive")
            setSubscriptionExpiry(metadata?.subscriptionExpiry || "")
            setSubscriptionPlan(metadata?.subscriptionPlan || null)

            // Initialize Paystack payout subaccount settings
            setPayoutSettings({
                bankCode: (metadata?.payoutBankCode as string) || "",
                bankName: (metadata?.payoutBankName as string) || "",
                accountNumber: (metadata?.payoutAccountNumber as string) || "",
                accountName: (metadata?.payoutAccountName as string) || ""
            })

            // Initialize BulkClix payout settings
            setBulkclixPayoutType((metadata?.bulkclixPayoutType as "momo" | "bank") || "momo")
            setBulkclixAccountNumber((metadata?.bulkclixAccountNumber as string) || "")
            setBulkclixAccountName((metadata?.bulkclixAccountName as string) || "")
            setBulkclixChannelOrBankId((metadata?.bulkclixChannelOrBankId as string) || "MTN")
            setBulkclixBankName((metadata?.bulkclixBankName as string) || "")

            // Initialize invoice defaults settings
            setInvoiceSettings({
                defaultTaxRate: (metadata?.defaultTaxRate as string) || "0",
                defaultDeliveryFee: (metadata?.defaultDeliveryFee as string) || "0",
                defaultDiscount: (metadata?.defaultDiscount as string) || "0"
            })
        }
    }, [isLoaded, organization])

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

        const locValidation = validateLocation(formData.location, formData.companyName)
        if (!locValidation.isValid) {
            toast.error(locValidation.reason || "Please enter a valid business location.")
            return
        }

        setProfileLoading(true)
        try {
            await updateOrgProfile(organization.id, formData)
            await updateOrgInvoiceSettings(organization.id, invoiceSettings)
            toast.success("Profile and settings updated successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to update profile")
        } finally {
            setProfileLoading(false)
        }
    }

    const handleActivateSubscription = async (planName: string) => {
        try {
            if (!organization) return
            const now = new Date()
            let expiryDays = 30
            
            const selectedPlan = [...plans, FREE_TRIAL_PLAN].find(p => p.name === planName)
            if (selectedPlan) {
                expiryDays = selectedPlan.durationDays
            }

            const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
            const isTrial = planName === "Free Trial"

            await updateOrgSubscriptionStatus(
                organization.id,
                'active',
                expiryDate,
                isTrial ? true : undefined,
                planName
            )

            setSubscriptionStatus("active")
            setSubscriptionExpiry(expiryDate)
            setSubscriptionPlan(planName)
            toast.success(`Successfully upgraded to ${planName} plan!`)
            router.refresh()
        } catch (error) {
            console.error("Failed to update subscription status:", error)
            toast.error("Failed to update subscription. Please contact support.")
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-muted-foreground">Loading settings...</p>
            </div>
        )
    }

    const expiryDateObj = subscriptionExpiry ? new Date(subscriptionExpiry) : null
    const isExpired = expiryDateObj ? new Date() > expiryDateObj : false

    const getPlanPriceLabel = (plan: any) => {
        return `GH₵ ${plan.price}`;
    }

    const getPlanPeriodLabel = (plan: any) => {
        if (plan.id === '1-month') return "mo";
        if (plan.id === '3-months') return "3mo";
        return "yr";
    }

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans">
            <BackofficeHeader config={config} />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12 max-w-[1000px] space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-slate-900 rounded-full hover:bg-white shadow-sm transition-all border border-transparent hover:border-slate-200">
                        <Link href="/backoffice">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Manage your business profile and subscription</p>
                    </div>
                </div>

                <Tabs defaultValue="profile" className="space-y-6 sm:space-y-8">
                    <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar">
                        <TabsList className="bg-white border border-slate-200 p-1.5 h-12 sm:h-14 rounded-2xl shadow-sm inline-flex min-w-max w-full sm:w-auto">
                            <TabsTrigger value="profile" className="rounded-xl px-4 sm:px-6 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Business Profile
                            </TabsTrigger>
                            <TabsTrigger value="team" className="rounded-xl px-4 sm:px-6 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Team Management
                            </TabsTrigger>
                            <TabsTrigger value="subscription" className="rounded-xl px-4 sm:px-6 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Subscription & Billing
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="profile">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
                                <CardContent className="p-5 sm:p-8">
                                    <form onSubmit={handleProfileSubmit} className="space-y-8">
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
                                                <p className="text-sm text-slate-500 mb-3">This logo will appear in customer tracking pages.</p>
                                                <Button type="button" variant="outline" size="sm" className="rounded-xl font-semibold border-slate-200 text-slate-700" onClick={triggerFileInput}>
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
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 font-semibold" htmlFor="contact">Contact Number</Label>
                                                <Input
                                                    id="contact"
                                                    name="contact"
                                                    value={formData.contact}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 font-semibold" htmlFor="email">Public Email</Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-slate-700 font-semibold" htmlFor="location">Business Address</Label>
                                                <Input
                                                    id="location"
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-slate-700 font-semibold" htmlFor="website">Website URL (Optional)</Label>
                                                <Input
                                                    id="website"
                                                    name="website"
                                                    value={formData.website}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Default Invoice Settings */}
                                        <div className="pt-6 border-t border-slate-100 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">Default Invoice Settings</h4>
                                                <p className="text-xs text-slate-500">Configure default values to automatically pre-fill when generating invoices.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-700 font-semibold" htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                                                    <Input
                                                        id="defaultTaxRate"
                                                        name="defaultTaxRate"
                                                        type="number"
                                                        step="0.01"
                                                        value={invoiceSettings.defaultTaxRate}
                                                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, defaultTaxRate: e.target.value }))}
                                                        className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-700 font-semibold" htmlFor="defaultDeliveryFee">Default Delivery Fee (GH₵)</Label>
                                                    <Input
                                                        id="defaultDeliveryFee"
                                                        name="defaultDeliveryFee"
                                                        type="number"
                                                        step="0.01"
                                                        value={invoiceSettings.defaultDeliveryFee}
                                                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, defaultDeliveryFee: e.target.value }))}
                                                        className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-700 font-semibold" htmlFor="defaultDiscount">Default Discount (GH₵)</Label>
                                                    <Input
                                                        id="defaultDiscount"
                                                        name="defaultDiscount"
                                                        type="number"
                                                        step="0.01"
                                                        value={invoiceSettings.defaultDiscount}
                                                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, defaultDiscount: e.target.value }))}
                                                        className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <Button
                                                type="submit"
                                                disabled={profileLoading}
                                                className="min-w-[140px] h-11 rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold shadow-[0_4px_20px_rgb(0,0,0,0.1)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                                            >
                                                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Dual Gateway Payout & Settlement Settings */}
                            <div className="mt-8 space-y-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        Payout & Settlement Settings
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                            Instant Payout Active
                                        </span>
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                                        Set up your Mobile Money wallet or Bank Account to receive customer payouts automatically.
                                    </p>
                                </div>

                                {/* 1. Primary Gateway: Instant Payouts */}
                                <Card className="border-emerald-200/80 shadow-md overflow-hidden bg-gradient-to-br from-white to-emerald-50/20 rounded-3xl relative">
                                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-2xl shadow-sm">
                                        Primary Instant Gateway
                                    </div>
                                    <CardHeader className="p-5 sm:p-8 pb-4">
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            Instant Mobile Money & Bank Settlement
                                        </h3>
                                        <p className="text-xs text-slate-600">
                                            Automatic settlements directly into your Mobile Money or Bank Account the moment a customer completes a payment.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-5 sm:p-8 pt-0">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault()
                                            if (!organization) return
                                            if (!bulkclixAccountName) {
                                                toast.error("Please verify your account details first")
                                                return
                                            }
                                            setBulkclixSaving(true)
                                            try {
                                                const { saveMerchantBulkClixPayoutSettings } = await import("@/app/actions/bulkclix-payment")
                                                const res = await saveMerchantBulkClixPayoutSettings(organization.id, {
                                                    payoutType: bulkclixPayoutType,
                                                    accountNumber: bulkclixAccountNumber,
                                                    accountName: bulkclixAccountName,
                                                    channelOrBankId: bulkclixChannelOrBankId,
                                                    bankName: bulkclixBankName
                                                })
                                                if (res.success) {
                                                    toast.success("Instant settlement details saved successfully!")
                                                } else {
                                                    toast.error(res.error || "Failed to save payout details")
                                                }
                                            } catch (error: any) {
                                                console.error(error)
                                                toast.error("Failed to update payout settings")
                                            } finally {
                                                setBulkclixSaving(false)
                                            }
                                        }} className="space-y-6">
                                            {/* Payout Type Switcher */}
                                            <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl w-fit">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkclixPayoutType("momo")
                                                        setBulkclixChannelOrBankId("MTN")
                                                        setBulkclixAccountName("")
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                                        bulkclixPayoutType === "momo"
                                                            ? "bg-white text-emerald-800 shadow-sm"
                                                            : "text-slate-500 hover:text-slate-800"
                                                    )}
                                                >
                                                    Mobile Money Account
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkclixPayoutType("bank")
                                                        setBulkclixChannelOrBankId(bulkclixBanks[0]?.id || "")
                                                        setBulkclixAccountName("")
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                                        bulkclixPayoutType === "bank"
                                                            ? "bg-white text-emerald-800 shadow-sm"
                                                            : "text-slate-500 hover:text-slate-800"
                                                    )}
                                                >
                                                    Bank Account Transfer
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {bulkclixPayoutType === "momo" ? (
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-700 font-semibold" htmlFor="bulkclixNetwork">Mobile Money Network</Label>
                                                        <select
                                                            id="bulkclixNetwork"
                                                            value={bulkclixChannelOrBankId}
                                                            onChange={(e) => {
                                                                setBulkclixChannelOrBankId(e.target.value)
                                                                setBulkclixAccountName("")
                                                            }}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="MTN">MTN Mobile Money</option>
                                                            <option value="TELECEL">Telecel Cash (Vodafone)</option>
                                                            <option value="AIRTELTIGO">ATMoney (AirtelTigo)</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-700 font-semibold" htmlFor="bulkclixBank">Select Bank</Label>
                                                        <select
                                                            id="bulkclixBank"
                                                            disabled={bulkclixBanksLoading}
                                                            value={bulkclixChannelOrBankId}
                                                            onChange={(e) => {
                                                                const selected = bulkclixBanks.find(b => b.id === e.target.value)
                                                                setBulkclixChannelOrBankId(e.target.value)
                                                                setBulkclixBankName(selected ? selected.name : "")
                                                                setBulkclixAccountName("")
                                                            }}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="">Select Target Bank</option>
                                                            {bulkclixBanks.map((b) => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700 font-semibold" htmlFor="bulkclixAccountNumber">
                                                        {bulkclixPayoutType === "momo" ? "Mobile Money Phone Number" : "Bank Account Number"}
                                                    </Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="bulkclixAccountNumber"
                                                            value={bulkclixAccountNumber}
                                                            onChange={(e) => {
                                                                setBulkclixAccountNumber(e.target.value)
                                                                setBulkclixAccountName("")
                                                            }}
                                                            placeholder={bulkclixPayoutType === "momo" ? "e.g. 0548706430" : "e.g. 1441001234567"}
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={handleResolveBulkClixAccount}
                                                            disabled={resolvingBulkclixAccount || !bulkclixAccountNumber}
                                                            className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-4 shadow-sm"
                                                        >
                                                            {resolvingBulkclixAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {bulkclixAccountName && (
                                                    <div className="md:col-span-2 p-3.5 bg-emerald-100/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-black">Verified Account Name</p>
                                                            <p className="text-sm text-emerald-950 font-bold">{bulkclixAccountName}</p>
                                                        </div>
                                                        <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                                                            Ready for Instant Payouts
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                                <Button
                                                    type="submit"
                                                    disabled={bulkclixSaving || !bulkclixAccountName}
                                                    className="min-w-[160px] h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                                                >
                                                    {bulkclixSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Save Settlement Details
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* 2. Secondary Gateway: Card & International Fallback */}
                                <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
                                    <CardHeader className="p-5 sm:p-8 pb-4">
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            Card & International Payment Backup
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Secondary settlement account used for Visa / Mastercard credit card payments or network failover.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-5 sm:p-8 pt-0">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault()
                                            if (!organization) return
                                            if (!payoutSettings.accountName) {
                                                toast.error("Please verify your account details first")
                                                return
                                            }
                                            setPayoutLoading(true)
                                            try {
                                                const { saveMerchantPayoutSettings } = await import("@/app/actions/paystack")
                                                const res = await saveMerchantPayoutSettings(organization.id, {
                                                    bankCode: payoutSettings.bankCode,
                                                    bankName: payoutSettings.bankName,
                                                    accountNumber: payoutSettings.accountNumber,
                                                    businessName: organization.name
                                                })
                                                if (res.success) {
                                                    toast.success("Paystack fallback settlement account configured successfully!")
                                                } else {
                                                    toast.error(res.error || "Failed to configure Paystack subaccount")
                                                }
                                            } catch (error: any) {
                                                console.error(error)
                                                toast.error("Failed to update payout settings")
                                            } finally {
                                                setPayoutLoading(false)
                                            }
                                        }} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-700 font-semibold" htmlFor="payoutBank">Paystack Settlement Bank</Label>
                                                    <select
                                                        id="payoutBank"
                                                        disabled={banksLoading}
                                                        value={payoutSettings.bankCode}
                                                        onChange={(e) => {
                                                            const selected = banks.find(b => b.code === e.target.value)
                                                            setPayoutSettings(prev => ({
                                                                ...prev,
                                                                bankCode: e.target.value,
                                                                bankName: selected ? selected.name : "",
                                                                accountName: ""
                                                            }))
                                                        }}
                                                        className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none"
                                                    >
                                                        <option value="">Select Settlement Bank</option>
                                                        {banks.map((b) => (
                                                            <option key={b.code} value={b.code}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700 font-semibold" htmlFor="accountNumber">Account / Mobile Number</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="accountNumber"
                                                            value={payoutSettings.accountNumber}
                                                            onChange={(e) => setPayoutSettings(prev => ({
                                                                ...prev,
                                                                accountNumber: e.target.value,
                                                                accountName: ""
                                                            }))}
                                                            placeholder="Enter bank account / phone number"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={handleResolveAccount}
                                                            disabled={resolvingAccount || !payoutSettings.bankCode || !payoutSettings.accountNumber}
                                                            className="h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold px-4"
                                                        >
                                                            {resolvingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {payoutSettings.accountName && (
                                                    <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                        <p className="text-xs text-slate-500 font-bold">Verified Account Name</p>
                                                        <p className="text-sm text-slate-900 font-medium">{payoutSettings.accountName}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                                <Button
                                                    type="submit"
                                                    disabled={payoutLoading || !payoutSettings.accountName}
                                                    className="min-w-[140px] h-11 rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold shadow-[0_4px_20px_rgb(0,0,0,0.1)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                                                >
                                                    {payoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Save Paystack Details
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                        </motion.div>
                    </TabsContent>

                    <TabsContent value="team">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
                                <CardContent className="p-0 sm:p-2">
                                    <div className="w-full">
                                        <OrganizationProfile
                                            appearance={{
                                                elements: {
                                                    rootBox: "w-full flex justify-center",
                                                    card: "shadow-none border-none w-full max-w-none p-0",
                                                    navbar: "hidden", // Hide sidebar to save space
                                                    scrollBox: "p-4 sm:p-8",
                                                    headerTitle: "text-2xl font-bold text-slate-900",
                                                    organizationProfilePage: "w-full"
                                                }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="subscription">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8">
                            {/* Current Plan Overview */}
                            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl w-full sm:w-fit sm:min-w-[350px] pr-0 sm:pr-8">
                                <CardContent className="p-5 sm:p-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-12">
                                        <div className="space-y-2">
                                            <h2 className="text-lg sm:text-xl font-bold flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                                                {subscriptionPlan ? `Current Plan (${subscriptionPlan})` : "Current Plan"}
                                                <div className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                    subscriptionStatus === 'active' && !isExpired ? "bg-emerald-100 text-emerald-700" :
                                                        subscriptionStatus === 'trialing' ? "bg-slate-100 text-slate-400" : "bg-red-100 text-red-700"
                                                )}>
                                                    {isExpired ? "Expired" : subscriptionStatus === 'trialing' ? "Free Trial" : subscriptionStatus}
                                                </div>
                                            </h2>
                                            {subscriptionExpiry ? (
                                                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 font-medium">
                                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    {isExpired ? "Expired on " : "Renews on "}
                                                    <span className={cn("font-bold", isExpired ? "text-red-500" : "text-slate-800")}>
                                                        {expiryDateObj?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 font-medium">No active subscription found.</p>
                                            )}
                                        </div>
                                        {isExpired && (
                                            <Button className="h-11 px-8 rounded-full font-bold bg-[#CE0003] hover:bg-[#CE0003]/90 text-white shadow-[0_4px_20px_rgb(206,0,3,0.2)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                                                Renew Now
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Upgrade Plans Grid */}
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Extend your access</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {plans.map((plan) => (
                                        <Card
                                            key={plan.name}
                                            className={cn(
                                                "border-slate-100 flex flex-col relative rounded-3xl shadow-sm",
                                                plan.popular && "ring-2 ring-[#191A43] shadow-lg"
                                            )}
                                        >
                                            {plan.popular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#191A43] text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                                                    Recommended
                                                </div>
                                            )}
                                            <CardHeader className="p-4 sm:p-6 pb-0">
                                                <div className="text-base sm:text-lg font-bold text-slate-900">{plan.name}</div>
                                                <div className="text-xs text-slate-500">{plan.description}</div>
                                            </CardHeader>
                                            <CardContent className="p-0 pt-4 sm:pt-6 flex-1 flex flex-col">
                                                <div className="mb-4 sm:mb-6 px-4 sm:px-6">
                                                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{getPlanPriceLabel(plan)}</span>
                                                    <span className="text-xs text-slate-500 font-medium ml-1">/{getPlanPeriodLabel(plan)}</span>
                                                </div>
                                                <ul className="space-y-3 mb-8 flex-1 px-4 sm:px-6">
                                                    {plan.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-[12px] font-medium text-slate-600">
                                                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="p-4 sm:p-6 pt-0">
                                                    <PlanButton
                                                        plan={plan}
                                                        publicKey={publicKey}
                                                        organization={organization}
                                                        user={user}
                                                        onSuccess={() => handleActivateSubscription(plan.name)}
                                                        isLoaded={isLoaded}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
