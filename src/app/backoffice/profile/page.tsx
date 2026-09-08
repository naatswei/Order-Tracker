"use client"

import { useState, useEffect, useRef } from "react"
import { useOrganization, useUser, OrganizationProfile } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { updateOrgProfile, updateOrgSubscriptionStatus, updateOrgInvoiceSettings, updateOrgOrderDefaults, type MenuPresetItem, type LogisticsSubType } from "@/app/actions/org-metadata"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Camera, Settings, Building2, CreditCard, Check, Clock, Users, Sparkles, UtensilsCrossed, Plus, Trash2, MapPin, Phone, Wallet, DollarSign, Store, Tag, Truck, Ship, Package, Box, Layers, Navigation, Globe } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import { validateLocation } from "@/lib/location-validator"
import Link from "next/link"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { PRICING_PLANS, FREE_TRIAL_PLAN } from "@/constants/pricing"
import { GHANA_BANKS } from "@/constants/banks"

const PlanButton = dynamic(() => import("@/components/paystack-button"), {
    ssr: false,
    loading: () => <Button disabled className="w-full h-10 bg-slate-100 text-slate-400 rounded-xl">Loading...</Button>
})

const plans = PRICING_PLANS;

interface PlanTheme {
    badgeText: string
    badgeStyle: string
    cardBorder: string
    cardShadow: string
    headerBg?: string
    isDarkHeader?: boolean
    priceColor: string
    periodColor: string
    savingsBadge?: string
    savingsStyle?: string
    buttonClass: string
    checkBg: string
    checkColor: string
    checkBorder: string
}

const PLAN_THEMES: Record<string, PlanTheme> = {
    "1-month": {
        badgeText: "Flexible",
        badgeStyle: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
        cardBorder: "border-slate-200 hover:border-indigo-300",
        cardShadow: "shadow-sm hover:shadow-xl",
        priceColor: "text-slate-900",
        periodColor: "text-slate-400",
        buttonClass: "bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm",
        checkBg: "bg-indigo-50",
        checkColor: "text-indigo-600",
        checkBorder: "border-indigo-200/60"
    },
    "3-months": {
        badgeText: "Most Popular",
        badgeStyle: "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-md",
        cardBorder: "border-indigo-500/40 ring-2 ring-indigo-500/20",
        cardShadow: "shadow-xl hover:shadow-2xl",
        isDarkHeader: true,
        headerBg: "bg-gradient-to-b from-[#090D16] via-[#0F172A] to-[#1E1B4B]",
        priceColor: "text-white",
        periodColor: "text-indigo-200",
        savingsBadge: "Save GH₵ 148",
        savingsStyle: "bg-amber-400/20 text-amber-300 border border-amber-400/30",
        buttonClass: "bg-white text-slate-950 hover:bg-slate-100 font-bold shadow-md shadow-black/25",
        checkBg: "bg-indigo-50",
        checkColor: "text-indigo-600",
        checkBorder: "border-indigo-200/60"
    },
    "1-year": {
        badgeText: "Best Value",
        badgeStyle: "bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30",
        cardBorder: "border-emerald-200 hover:border-emerald-400 ring-1 ring-emerald-500/10",
        cardShadow: "shadow-md hover:shadow-xl",
        priceColor: "text-slate-900",
        periodColor: "text-slate-400",
        savingsBadge: "Save GH₵ 938",
        savingsStyle: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/25",
        checkBg: "bg-emerald-50",
        checkColor: "text-emerald-600",
        checkBorder: "border-emerald-200/60"
    }
};

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
    const [banks, setBanks] = useState<{ name: string; code: string }[]>(GHANA_BANKS.map(b => ({ name: b.name, code: b.code })))
    const [banksLoading, setBanksLoading] = useState(false)
    const [resolvingAccount, setResolvingAccount] = useState(false)
    const [payoutLoading, setPayoutLoading] = useState(false)

    // BulkClix Instant Payout settings state
    const [bulkclixPayoutType, setBulkclixPayoutType] = useState<"momo" | "bank">("momo")
    const [bulkclixAccountNumber, setBulkclixAccountNumber] = useState("")
    const [bulkclixAccountName, setBulkclixAccountName] = useState("")
    const [bulkclixChannelOrBankId, setBulkclixChannelOrBankId] = useState("MTN")
    const [bulkclixBankName, setBulkclixBankName] = useState("")
    const [bulkclixBanks, setBulkclixBanks] = useState<{ id: string; name: string }[]>(GHANA_BANKS.map(b => ({ id: b.id, name: b.name })))
    const [bulkclixBanksLoading, setBulkclixBanksLoading] = useState(false)
    const [resolvingBulkclixAccount, setResolvingBulkclixAccount] = useState(false)
    const [bulkclixSaving, setBulkclixSaving] = useState(false)

    // Administrative Defaults State (Logistics Sub-Types: Restaurant, Delivery Courier, Shipping)
    const [orderDefaults, setOrderDefaults] = useState<{
        logisticsType: LogisticsSubType
        // Restaurant
        defaultPickupLocation: string
        defaultPickupContact: string
        defaultDeliveryFee: string
        defaultPaymentNumber: string
        defaultPaymentProvider: string
        menuPresets: MenuPresetItem[]
        // Courier Delivery
        defaultDispatchHub: string
        defaultSenderContact: string
        defaultCourierFee: string
        packageCategories: string[]
        defaultCourierMoMoNumber: string
        defaultCourierPaymentProvider: string
        // Shipping
        defaultOriginPort: string
        defaultOriginContact: string
        defaultDestinationHub: string
        defaultFreightRatePerKg: string
        defaultHandlingFee: string
        defaultWaybillPrefix: string
        defaultShippingMoMoNumber: string
        defaultShippingPaymentProvider: string
    }>({
        logisticsType: "restaurant",
        defaultPickupLocation: "",
        defaultPickupContact: "",
        defaultDeliveryFee: "0",
        defaultPaymentNumber: "",
        defaultPaymentProvider: "MTN",
        menuPresets: [],
        defaultDispatchHub: "",
        defaultSenderContact: "",
        defaultCourierFee: "0",
        packageCategories: ["Documents", "Small Parcel", "Food/Cake Box", "Electronics", "Fragile"],
        defaultCourierMoMoNumber: "",
        defaultCourierPaymentProvider: "MTN",
        defaultOriginPort: "Tema Port / Kotoka Airport",
        defaultOriginContact: "",
        defaultDestinationHub: "Accra Central Hub",
        defaultFreightRatePerKg: "15.00",
        defaultHandlingFee: "50.00",
        defaultWaybillPrefix: "SHP",
        defaultShippingMoMoNumber: "",
        defaultShippingPaymentProvider: "MTN"
    })
    const [newPreset, setNewPreset] = useState<{ name: string; price: string; description: string }>({
        name: "",
        price: "",
        description: ""
    })
    const [newCategoryInput, setNewCategoryInput] = useState("")
    const [orderDefaultsSaving, setOrderDefaultsSaving] = useState(false)

    useEffect(() => {
        const fetchBanks = async () => {
            setBanksLoading(true)
            try {
                const { getGHSBanks } = await import("@/app/actions/paystack")
                const res = await getGHSBanks()
                if (res.success && res.banks && res.banks.length > 0) {
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
                if (res.success && res.banks && res.banks.length > 0) {
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

            // Initialize administrative order defaults settings
            setOrderDefaults({
                logisticsType: (metadata?.logisticsType as LogisticsSubType) || "restaurant",
                // Restaurant
                defaultPickupLocation: (metadata?.defaultPickupLocation as string) || (metadata?.location as string) || "",
                defaultPickupContact: (metadata?.defaultPickupContact as string) || (metadata?.contact as string) || "",
                defaultDeliveryFee: (metadata?.defaultDeliveryFee as string) || "0",
                defaultPaymentNumber: (metadata?.defaultPaymentNumber as string) || (metadata?.bulkclixAccountNumber as string) || "",
                defaultPaymentProvider: (metadata?.defaultPaymentProvider as string) || (metadata?.bulkclixChannelOrBankId as string) || "MTN",
                menuPresets: Array.isArray(metadata?.menuPresets) ? metadata.menuPresets : [],
                // Courier Delivery
                defaultDispatchHub: (metadata?.defaultDispatchHub as string) || (metadata?.location as string) || "",
                defaultSenderContact: (metadata?.defaultSenderContact as string) || (metadata?.contact as string) || "",
                defaultCourierFee: (metadata?.defaultCourierFee as string) || "0",
                packageCategories: Array.isArray(metadata?.packageCategories) ? metadata.packageCategories : ["Documents", "Small Parcel", "Food/Cake Box", "Electronics", "Fragile"],
                defaultCourierMoMoNumber: (metadata?.defaultCourierMoMoNumber as string) || (metadata?.bulkclixAccountNumber as string) || "",
                defaultCourierPaymentProvider: (metadata?.defaultCourierPaymentProvider as string) || "MTN",
                // Shipping
                defaultOriginPort: (metadata?.defaultOriginPort as string) || "Tema Port / Kotoka Airport",
                defaultOriginContact: (metadata?.defaultOriginContact as string) || (metadata?.contact as string) || "",
                defaultDestinationHub: (metadata?.defaultDestinationHub as string) || "Accra Central Hub",
                defaultFreightRatePerKg: (metadata?.defaultFreightRatePerKg as string) || "15.00",
                defaultHandlingFee: (metadata?.defaultHandlingFee as string) || "50.00",
                defaultWaybillPrefix: (metadata?.defaultWaybillPrefix as string) || "SHP",
                defaultShippingMoMoNumber: (metadata?.defaultShippingMoMoNumber as string) || (metadata?.bulkclixAccountNumber as string) || "",
                defaultShippingPaymentProvider: (metadata?.defaultShippingPaymentProvider as string) || "MTN"
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
        if (plan.id === '1-month') return "/ month";
        if (plan.id === '3-months') return "/ 3 months";
        return "/ year";
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
                            <TabsTrigger value="defaults" className="rounded-xl px-4 sm:px-6 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                                Administrative Defaults
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
                                                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Business Logo</h3>
                                                <p className="text-[11px] sm:text-xs text-slate-500 mb-2.5">Appears on customer tracking pages.</p>
                                                <Button type="button" variant="outline" size="sm" className="rounded-xl font-semibold border-slate-200 text-slate-700 text-xs h-8 px-3" onClick={triggerFileInput}>
                                                    Change Logo
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-slate-700 font-semibold text-xs sm:text-sm" htmlFor="companyName">Company Name</Label>
                                                <Input
                                                    id="companyName"
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 font-semibold text-xs sm:text-sm" htmlFor="contact">Contact Number</Label>
                                                <Input
                                                    id="contact"
                                                    name="contact"
                                                    value={formData.contact}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 font-semibold text-xs sm:text-sm" htmlFor="email">Public Email</Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-slate-700 font-semibold text-xs sm:text-sm" htmlFor="location">Business Address</Label>
                                                <Input
                                                    id="location"
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-slate-700 font-semibold text-xs sm:text-sm" htmlFor="website">Website URL (Optional)</Label>
                                                <Input
                                                    id="website"
                                                    name="website"
                                                    value={formData.website}
                                                    onChange={handleInputChange}
                                                    className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 transition-colors text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Default Invoice Settings */}
                                        <div className="pt-6 border-t border-slate-100 space-y-4">
                                            <div>
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Default Invoice Settings</h4>
                                                <p className="text-[11px] sm:text-xs text-slate-500">Default values automatically pre-filled on invoices.</p>
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
                                                className="w-full sm:w-auto min-w-[140px] h-11 px-6 rounded-xl sm:rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                                            >
                                                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Dual Gateway Payout & Settlement Settings */}
                            <div className="mt-8 space-y-4">
                                <div className="space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
                                            Payout &amp; Settlement Settings
                                        </h2>
                                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                            Instant Active
                                        </span>
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-normal">
                                        Receive automatic customer payouts to your MoMo or bank account.
                                    </p>
                                </div>

                                {/* 1. Primary Gateway: Instant Payouts */}
                                <Card className="border-emerald-200/80 shadow-xs overflow-hidden bg-gradient-to-br from-white to-emerald-50/20 rounded-2xl relative">
                                    <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 border-b border-emerald-100/60 bg-emerald-50/50">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Primary Gateway</span>
                                        </div>
                                        <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-xs">Instant Settlement</span>
                                    </div>
                                    <CardHeader className="p-3.5 sm:p-5 pb-2.5 pt-3">
                                        <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-snug truncate">
                                            Instant Mobile Money &amp; Bank Settlement
                                        </h3>
                                        <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-normal mt-0.5">
                                            Instant direct payouts as soon as an order is paid.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-5 pt-0">
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
                                        }} className="space-y-4">
                                            {/* Payout Type Switcher */}
                                            <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkclixPayoutType("momo")
                                                        setBulkclixChannelOrBankId("MTN")
                                                        setBulkclixAccountName("")
                                                    }}
                                                    className={cn(
                                                        "px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer",
                                                        bulkclixPayoutType === "momo"
                                                            ? "bg-white text-emerald-800 shadow-xs"
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
                                                        "px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer",
                                                        bulkclixPayoutType === "bank"
                                                            ? "bg-white text-emerald-800 shadow-xs"
                                                            : "text-slate-500 hover:text-slate-800"
                                                    )}
                                                >
                                                    Bank Account Transfer
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
                                                {bulkclixPayoutType === "momo" ? (
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-700 font-semibold text-[11px] sm:text-xs" htmlFor="bulkclixNetwork">Mobile Money Network</Label>
                                                        <select
                                                            id="bulkclixNetwork"
                                                            value={bulkclixChannelOrBankId}
                                                            onChange={(e) => {
                                                                setBulkclixChannelOrBankId(e.target.value)
                                                                setBulkclixAccountName("")
                                                            }}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-10 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                        >
                                                            <option value="MTN">MTN Mobile Money</option>
                                                            <option value="TELECEL">Telecel Cash (Vodafone)</option>
                                                            <option value="AIRTELTIGO">ATMoney (AirtelTigo)</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-700 font-semibold text-[11px] sm:text-xs" htmlFor="bulkclixBank">Select Bank</Label>
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
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-10 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                        >
                                                            <option value="">Select Target Bank</option>
                                                            {bulkclixBanks.map((b) => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <Label className="text-slate-700 font-semibold text-[11px] sm:text-xs" htmlFor="bulkclixAccountNumber">
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
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-colors flex-1 text-xs sm:text-sm"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={handleResolveBulkClixAccount}
                                                            disabled={resolvingBulkclixAccount || !bulkclixAccountNumber}
                                                            className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-3.5 shadow-xs text-xs cursor-pointer"
                                                        >
                                                            {resolvingBulkclixAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {bulkclixAccountName && (
                                                    <div className="md:col-span-2 p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[9px] uppercase tracking-wider text-emerald-800 font-bold">Verified Account Name</p>
                                                            <p className="text-xs sm:text-sm text-emerald-950 font-bold">{bulkclixAccountName}</p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                                                            Verified
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end pt-2.5 border-t border-slate-100">
                                                <Button
                                                    type="submit"
                                                    disabled={bulkclixSaving || !bulkclixAccountName}
                                                    className="w-full sm:w-auto h-10 px-5 rounded-xl sm:rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                                                >
                                                    {bulkclixSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                                                    Save Settlement Details
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* 2. Secondary Gateway: Card & International Fallback */}
                                <Card className="border-slate-200 shadow-xs overflow-hidden bg-white rounded-2xl">
                                    <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 border-b border-slate-100 bg-slate-50/50">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fallback Gateway</span>
                                        <span className="text-[8.5px] sm:text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">Paystack</span>
                                    </div>
                                    <CardHeader className="p-3.5 sm:p-5 pb-2.5 pt-3">
                                        <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-snug truncate">
                                            Card &amp; International Payment Backup
                                        </h3>
                                        <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-normal mt-0.5">
                                            Fallback account for Visa, Mastercard, and failovers.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-5 pt-0">
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
                                        }} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
                                                <div className="space-y-1">
                                                    <Label className="text-slate-700 font-semibold text-[11px] sm:text-xs" htmlFor="payoutBank">Paystack Settlement Bank</Label>
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
                                                        className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-10 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                    >
                                                        <option value="">Select Settlement Bank</option>
                                                        {banks.map((b) => (
                                                            <option key={b.code} value={b.code}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-slate-700 font-semibold text-[11px] sm:text-xs" htmlFor="accountNumber">Account / Mobile Number</Label>
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
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-10 transition-colors flex-1 text-xs sm:text-sm"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={handleResolveAccount}
                                                            disabled={resolvingAccount || !payoutSettings.bankCode || !payoutSettings.accountNumber}
                                                            className="h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold px-3.5 text-xs cursor-pointer"
                                                        >
                                                            {resolvingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {payoutSettings.accountName && (
                                                    <div className="md:col-span-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Verified Account Name</p>
                                                        <p className="text-xs sm:text-sm text-slate-900 font-medium">{payoutSettings.accountName}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end pt-2.5 border-t border-slate-100">
                                                <Button
                                                    type="submit"
                                                    disabled={payoutLoading || !payoutSettings.accountName}
                                                    className="w-full sm:w-auto h-10 px-5 rounded-xl sm:rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                                                >
                                                    {payoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                                                    Save Paystack Details
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                        </motion.div>
                    </TabsContent>

                    <TabsContent value="defaults">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
                                <CardHeader className="p-5 sm:p-8 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/30">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                            <Store className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Administrative Default Business Entry</h2>
                                            <p className="text-xs text-slate-500 font-medium">Configure your primary logistics operation type and default business parameters (Pickup branch, Menu entries, Delivery/Shipping rates, MoMo payments) that directly determine your Create Order page.</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 space-y-8">
                                    <form onSubmit={async (e) => {
                                        e.preventDefault()
                                        if (!organization) return
                                        setOrderDefaultsSaving(true)
                                        try {
                                            await updateOrgOrderDefaults(organization.id, orderDefaults)
                                            // Also sync active delivery fee to invoice settings for consistency
                                            const activeDeliveryFee = orderDefaults.logisticsType === 'restaurant'
                                                ? orderDefaults.defaultDeliveryFee
                                                : orderDefaults.logisticsType === 'delivery'
                                                    ? orderDefaults.defaultCourierFee
                                                    : orderDefaults.defaultHandlingFee
                                            await updateOrgInvoiceSettings(organization.id, {
                                                defaultDeliveryFee: activeDeliveryFee || "0"
                                            })
                                            toast.success("Administrative Defaults saved successfully!")
                                        } catch (err) {
                                            console.error(err)
                                            toast.error("Failed to save administrative defaults")
                                        } finally {
                                            setOrderDefaultsSaving(false)
                                        }
                                    }} className="space-y-8">

                                        {/* 1. Logistics Operation Type Selection */}
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                                Select Logistics Operation Model
                                            </Label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {/* Option 1: Restaurant Delivery Service */}
                                                <div
                                                    onClick={() => setOrderDefaults(prev => ({ ...prev, logisticsType: 'restaurant' }))}
                                                    className={cn(
                                                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative",
                                                        orderDefaults.logisticsType === 'restaurant'
                                                            ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20 shadow-sm"
                                                            : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                                                            <UtensilsCrossed className="w-5 h-5" />
                                                        </div>
                                                        {orderDefaults.logisticsType === 'restaurant' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                                                                Active Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Restaurant Delivery Service</h4>
                                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                            Contract food orders (e.g. Marwako, Papaye) with branch pickups, 1-click menu catalog, dish pricing, and delivery fees.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Option 2: Delivery Service (Courier) */}
                                                <div
                                                    onClick={() => setOrderDefaults(prev => ({ ...prev, logisticsType: 'delivery' }))}
                                                    className={cn(
                                                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative",
                                                        orderDefaults.logisticsType === 'delivery'
                                                            ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm"
                                                            : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                                                            <Truck className="w-5 h-5" />
                                                        </div>
                                                        {orderDefaults.logisticsType === 'delivery' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-xs">
                                                                Active Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Delivery Service (Courier)</h4>
                                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                            Local on-demand courier &amp; dispatch. Pickup hub, recipient dropoff, package category tags, and courier delivery rates.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Option 3: Shipping (Freight / Cargo) */}
                                                <div
                                                    onClick={() => setOrderDefaults(prev => ({ ...prev, logisticsType: 'shipping' }))}
                                                    className={cn(
                                                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative",
                                                        orderDefaults.logisticsType === 'shipping'
                                                            ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-sm"
                                                            : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                                                            <Ship className="w-5 h-5" />
                                                        </div>
                                                        {orderDefaults.logisticsType === 'shipping' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                                                                Active Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Shipping (Freight &amp; Cargo)</h4>
                                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                            Intercity/international cargo &amp; forwarding. Origin ports, destination hubs, per-kg rates, handling fees, and waybill numbers.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ========================================================================= */}
                                        {/* TYPE A: RESTAURANT DELIVERY SERVICE CONFIGURATION                         */}
                                        {/* ========================================================================= */}
                                        {orderDefaults.logisticsType === 'restaurant' && (
                                            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in-50 duration-200">
                                                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                                    <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Restaurant Branch &amp; MoMo Settlement</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultPickupLocation" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Pickup Location / Branch
                                                        </Label>
                                                        <Input
                                                            id="defaultPickupLocation"
                                                            value={orderDefaults.defaultPickupLocation}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultPickupLocation: e.target.value }))}
                                                            placeholder="e.g. Marwako Fast Food - East Legon Branch"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Pre-populates the pickup branch for new delivery and customer orders.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultPickupContact" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Branch / Pickup Phone
                                                        </Label>
                                                        <Input
                                                            id="defaultPickupContact"
                                                            value={orderDefaults.defaultPickupContact}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultPickupContact: e.target.value }))}
                                                            placeholder="e.g. 0244123456"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Default contact number displayed for riders and dispatchers.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultDeliveryFeeSetting" className="text-xs font-semibold text-slate-700">
                                                            Default Delivery Fee (GH₵)
                                                        </Label>
                                                        <Input
                                                            id="defaultDeliveryFeeSetting"
                                                            type="number"
                                                            step="0.01"
                                                            value={orderDefaults.defaultDeliveryFee}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultDeliveryFee: e.target.value }))}
                                                            placeholder="25.00"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Baseline dispatch charge pre-filled on new orders.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultPaymentNumber" className="text-xs font-semibold text-slate-700">
                                                            Receiving MoMo Number
                                                        </Label>
                                                        <Input
                                                            id="defaultPaymentNumber"
                                                            value={orderDefaults.defaultPaymentNumber}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultPaymentNumber: e.target.value }))}
                                                            placeholder="e.g. 0548706430"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Merchant MoMo line for payments and prompt requests.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultPaymentProvider" className="text-xs font-semibold text-slate-700">
                                                            MoMo Network Provider
                                                        </Label>
                                                        <select
                                                            id="defaultPaymentProvider"
                                                            value={orderDefaults.defaultPaymentProvider}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultPaymentProvider: e.target.value }))}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                        >
                                                            <option value="MTN">MTN Mobile Money</option>
                                                            <option value="TELECEL">Telecel Cash (Vodafone)</option>
                                                            <option value="AIRTELTIGO">AirtelTigo Money</option>
                                                        </select>
                                                        <p className="text-[10px] text-slate-400">Primary telco gateway for instant prompt processing.</p>
                                                    </div>
                                                </div>

                                                {/* Menu Presets Catalog */}
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <Tag className="w-4 h-4 text-amber-600" />
                                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Menu Entries &amp; Cost Presets</h3>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                const sampleItems: MenuPresetItem[] = [
                                                                    { id: `preset_${Date.now()}_1`, name: "Assorted Fried Rice", price: 75, description: "Main Meal" },
                                                                    { id: `preset_${Date.now()}_2`, name: "Grilled Chicken with Jollof", price: 70, description: "Main Meal" },
                                                                    { id: `preset_${Date.now()}_3`, name: "Marwako Beef Shawarma", price: 45, description: "Shawarma" },
                                                                    { id: `preset_${Date.now()}_4`, name: "Marwako Chicken Shawarma", price: 45, description: "Shawarma" },
                                                                    { id: `preset_${Date.now()}_5`, name: "Grilled Whole Chicken (Only)", price: 120, description: "Grill" },
                                                                    { id: `preset_${Date.now()}_6`, name: "Fresh Juice / Drink", price: 20, description: "Beverage" }
                                                                ]
                                                                setOrderDefaults(prev => ({
                                                                    ...prev,
                                                                    menuPresets: [...prev.menuPresets, ...sampleItems]
                                                                }))
                                                                toast.success("Loaded sample restaurant menu presets!")
                                                            }}
                                                            className="h-8 rounded-lg text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                                                            Load Sample Restaurant Menu
                                                        </Button>
                                                    </div>

                                                    {/* Add Preset Item Form */}
                                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Add New Menu Preset Item</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                                                            <div className="sm:col-span-5 space-y-1">
                                                                <Label className="text-[11px] text-slate-600 font-medium">Menu Item Name</Label>
                                                                <Input
                                                                    value={newPreset.name}
                                                                    onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                                                                    placeholder="e.g. Assorted Fried Rice & Chicken"
                                                                    className="h-9 rounded-xl bg-white border-slate-200 text-xs"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-3 space-y-1">
                                                                <Label className="text-[11px] text-slate-600 font-medium">Price / Cost (GH₵)</Label>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={newPreset.price}
                                                                    onChange={(e) => setNewPreset(prev => ({ ...prev, price: e.target.value }))}
                                                                    placeholder="75.00"
                                                                    className="h-9 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-2 space-y-1">
                                                                <Label className="text-[11px] text-slate-600 font-medium">Category / Note</Label>
                                                                <Input
                                                                    value={newPreset.description}
                                                                    onChange={(e) => setNewPreset(prev => ({ ...prev, description: e.target.value }))}
                                                                    placeholder="e.g. Main Dish"
                                                                    className="h-9 rounded-xl bg-white border-slate-200 text-xs"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-2 flex items-end">
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!newPreset.name.trim()) {
                                                                            toast.error("Please enter a menu item name")
                                                                            return
                                                                        }
                                                                        const priceNum = parseFloat(newPreset.price) || 0
                                                                        if (priceNum <= 0) {
                                                                            toast.error("Please enter a valid price")
                                                                            return
                                                                        }
                                                                        const item: MenuPresetItem = {
                                                                            id: `preset_${Date.now()}`,
                                                                            name: newPreset.name.trim(),
                                                                            price: priceNum,
                                                                            description: newPreset.description.trim() || undefined
                                                                        }
                                                                        setOrderDefaults(prev => ({
                                                                            ...prev,
                                                                            menuPresets: [...prev.menuPresets, item]
                                                                        }))
                                                                        setNewPreset({ name: "", price: "", description: "" })
                                                                        toast.success(`Added "${item.name}" (GH₵ ${item.price})`)
                                                                    }}
                                                                    className="w-full h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                                    Add Item
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Existing Menu Items List */}
                                                    {orderDefaults.menuPresets.length > 0 ? (
                                                        <div className="space-y-2">
                                                            <p className="text-[11px] text-slate-500 font-medium">
                                                                {orderDefaults.menuPresets.length} Menu item(s) configured. These will display as 1-click buttons when creating new orders.
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {orderDefaults.menuPresets.map((item, idx) => (
                                                                    <div
                                                                        key={item.id || idx}
                                                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                                                                    >
                                                                        <div className="min-w-0 flex-1 pr-3">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                                                                                {item.description && (
                                                                                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                                                                        {item.description}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs font-black text-emerald-700 mt-0.5">
                                                                                GH₵ {Number(item.price).toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setOrderDefaults(prev => ({
                                                                                    ...prev,
                                                                                    menuPresets: prev.menuPresets.filter((_, i) => i !== idx)
                                                                                }))
                                                                            }}
                                                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                                            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                            <p className="text-xs font-semibold text-slate-700">No menu presets added yet</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">Add your common food items and prices above to quickly select them on the order creation page.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ========================================================================= */}
                                        {/* TYPE B: DELIVERY SERVICE (COURIER) CONFIGURATION                          */}
                                        {/* ========================================================================= */}
                                        {orderDefaults.logisticsType === 'delivery' && (
                                            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in-50 duration-200">
                                                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                                    <Truck className="w-4 h-4 text-blue-600" />
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Courier Dispatch Hub &amp; Delivery Parameters</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultDispatchHub" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Dispatch Hub / Sender Address
                                                        </Label>
                                                        <Input
                                                            id="defaultDispatchHub"
                                                            value={orderDefaults.defaultDispatchHub}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultDispatchHub: e.target.value }))}
                                                            placeholder="e.g. Accra Central Dispatch Hub, Osu"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Pre-populates the default sender/pickup hub for courier bookings.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultSenderContact" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Dispatch / Sender Phone
                                                        </Label>
                                                        <Input
                                                            id="defaultSenderContact"
                                                            value={orderDefaults.defaultSenderContact}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultSenderContact: e.target.value }))}
                                                            placeholder="e.g. 0548706430"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Default contact number for sender dispatch inquiries.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultCourierFee" className="text-xs font-semibold text-slate-700">
                                                            Base Courier Delivery Fee (GH₵)
                                                        </Label>
                                                        <Input
                                                            id="defaultCourierFee"
                                                            type="number"
                                                            step="0.01"
                                                            value={orderDefaults.defaultCourierFee}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultCourierFee: e.target.value }))}
                                                            placeholder="30.00"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm font-bold"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Base fee automatically applied to courier shipments.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultCourierMoMoNumber" className="text-xs font-semibold text-slate-700">
                                                            Courier MoMo Payment Number
                                                        </Label>
                                                        <Input
                                                            id="defaultCourierMoMoNumber"
                                                            value={orderDefaults.defaultCourierMoMoNumber}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultCourierMoMoNumber: e.target.value }))}
                                                            placeholder="e.g. 0548706430"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Receiving mobile money line for courier payment prompts.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultCourierPaymentProvider" className="text-xs font-semibold text-slate-700">
                                                            MoMo Network Provider
                                                        </Label>
                                                        <select
                                                            id="defaultCourierPaymentProvider"
                                                            value={orderDefaults.defaultCourierPaymentProvider}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultCourierPaymentProvider: e.target.value }))}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                        >
                                                            <option value="MTN">MTN Mobile Money</option>
                                                            <option value="TELECEL">Telecel Cash (Vodafone)</option>
                                                            <option value="AIRTELTIGO">AirtelTigo Money</option>
                                                        </select>
                                                        <p className="text-[10px] text-slate-400">Provider network for courier billing.</p>
                                                    </div>
                                                </div>

                                                {/* Package Categories / Presets */}
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-blue-600" />
                                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Standard Package Categories</h3>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                const sampleCategories = ["Documents / Envelope", "Small Parcel (<2kg)", "Medium Box (2-5kg)", "Large Box (>5kg)", "Food / Cake Box", "Fragile Electronics", "Clothing / Apparel"]
                                                                setOrderDefaults(prev => ({
                                                                    ...prev,
                                                                    packageCategories: Array.from(new Set([...prev.packageCategories, ...sampleCategories]))
                                                                }))
                                                                toast.success("Loaded standard courier package categories!")
                                                            }}
                                                            className="h-8 rounded-lg text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                                                            Load Standard Categories
                                                        </Button>
                                                    </div>

                                                    {/* Add Category Form */}
                                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Add Custom Package Type</p>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={newCategoryInput}
                                                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                                                placeholder="e.g. Sealed Medical Sample, Perfume Fragile"
                                                                className="h-9 rounded-xl bg-white border-slate-200 text-xs flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!newCategoryInput.trim()) {
                                                                        toast.error("Please enter a category name")
                                                                        return
                                                                    }
                                                                    const val = newCategoryInput.trim()
                                                                    if (orderDefaults.packageCategories.includes(val)) {
                                                                        toast.error("Category already exists")
                                                                        return
                                                                    }
                                                                    setOrderDefaults(prev => ({
                                                                        ...prev,
                                                                        packageCategories: [...prev.packageCategories, val]
                                                                    }))
                                                                    setNewCategoryInput("")
                                                                    toast.success(`Added "${val}" category`)
                                                                }}
                                                                className="h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 cursor-pointer"
                                                            >
                                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                                Add
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Existing Categories Badges */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {orderDefaults.packageCategories.map((cat, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-800"
                                                            >
                                                                <Package className="w-3 h-3 text-blue-500" />
                                                                {cat}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOrderDefaults(prev => ({
                                                                            ...prev,
                                                                            packageCategories: prev.packageCategories.filter((_, i) => i !== idx)
                                                                        }))
                                                                    }}
                                                                    className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ========================================================================= */}
                                        {/* TYPE C: SHIPPING (FREIGHT & CARGO) CONFIGURATION                          */}
                                        {/* ========================================================================= */}
                                        {orderDefaults.logisticsType === 'shipping' && (
                                            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in-50 duration-200">
                                                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                                    <Ship className="w-4 h-4 text-emerald-600" />
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Freight Origin Ports &amp; Cargo Rates</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultOriginPort" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <Navigation className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Origin Port / Terminal
                                                        </Label>
                                                        <Input
                                                            id="defaultOriginPort"
                                                            value={orderDefaults.defaultOriginPort}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultOriginPort: e.target.value }))}
                                                            placeholder="e.g. Tema Sea Port / Kotoka Air Cargo Terminal"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Primary origin departure terminal for international / regional freight.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultDestinationHub" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                            Default Destination City / Hub
                                                        </Label>
                                                        <Input
                                                            id="defaultDestinationHub"
                                                            value={orderDefaults.defaultDestinationHub}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultDestinationHub: e.target.value }))}
                                                            placeholder="e.g. Kumasi Central Cargo Depot / Takoradi Hub"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Target transit warehouse or receiving hub.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultFreightRatePerKg" className="text-xs font-semibold text-slate-700">
                                                            Rate per Kg (GH₵ / kg)
                                                        </Label>
                                                        <Input
                                                            id="defaultFreightRatePerKg"
                                                            type="number"
                                                            step="0.01"
                                                            value={orderDefaults.defaultFreightRatePerKg}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultFreightRatePerKg: e.target.value }))}
                                                            placeholder="15.00"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm font-bold"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Charge per kilogram for freight calculations.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultHandlingFee" className="text-xs font-semibold text-slate-700">
                                                            Customs / Handling Fee (GH₵)
                                                        </Label>
                                                        <Input
                                                            id="defaultHandlingFee"
                                                            type="number"
                                                            step="0.01"
                                                            value={orderDefaults.defaultHandlingFee}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultHandlingFee: e.target.value }))}
                                                            placeholder="50.00"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm font-bold"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Base port clearance or documentation fee.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultWaybillPrefix" className="text-xs font-semibold text-slate-700">
                                                            Waybill / Tracking Prefix
                                                        </Label>
                                                        <Input
                                                            id="defaultWaybillPrefix"
                                                            value={orderDefaults.defaultWaybillPrefix}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultWaybillPrefix: e.target.value }))}
                                                            placeholder="SHP"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm uppercase font-bold"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Prefix attached to generated tracking barcodes.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultOriginContact" className="text-xs font-semibold text-slate-700">
                                                            Origin Port Contact Phone
                                                        </Label>
                                                        <Input
                                                            id="defaultOriginContact"
                                                            value={orderDefaults.defaultOriginContact}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultOriginContact: e.target.value }))}
                                                            placeholder="e.g. 0548706430"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Origin port clearing agent or dispatcher phone.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultShippingMoMoNumber" className="text-xs font-semibold text-slate-700">
                                                            Shipping MoMo Account
                                                        </Label>
                                                        <Input
                                                            id="defaultShippingMoMoNumber"
                                                            value={orderDefaults.defaultShippingMoMoNumber}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultShippingMoMoNumber: e.target.value }))}
                                                            placeholder="e.g. 0548706430"
                                                            className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl h-11 text-xs sm:text-sm"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Merchant MoMo line for cargo payments.</p>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="defaultShippingPaymentProvider" className="text-xs font-semibold text-slate-700">
                                                            MoMo Network Provider
                                                        </Label>
                                                        <select
                                                            id="defaultShippingPaymentProvider"
                                                            value={orderDefaults.defaultShippingPaymentProvider}
                                                            onChange={(e) => setOrderDefaults(prev => ({ ...prev, defaultShippingPaymentProvider: e.target.value }))}
                                                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white rounded-xl h-11 px-3 transition-colors text-slate-800 focus:outline-none text-xs sm:text-sm"
                                                        >
                                                            <option value="MTN">MTN Mobile Money</option>
                                                            <option value="TELECEL">Telecel Cash (Vodafone)</option>
                                                            <option value="AIRTELTIGO">AirtelTigo Money</option>
                                                        </select>
                                                        <p className="text-[10px] text-slate-400">Telco channel for cargo prompt billing.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Save Defaults Button */}
                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <Button
                                                type="submit"
                                                disabled={orderDefaultsSaving}
                                                className="w-full sm:w-auto min-w-[200px] h-11 px-6 rounded-xl sm:rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                                            >
                                                {orderDefaultsSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2 text-emerald-400" />}
                                                Save Administrative Defaults
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
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
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 w-full sm:w-fit sm:min-w-[340px] shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                                {subscriptionPlan ? `Current Plan (${subscriptionPlan})` : "Current Plan"}
                                            </h2>
                                            <span className={cn(
                                                "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                subscriptionStatus === 'active' && !isExpired
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                    : subscriptionStatus === 'trialing'
                                                        ? "bg-slate-100 text-slate-600"
                                                        : "bg-red-50 text-red-700 border border-red-200/60"
                                            )}>
                                                {isExpired ? "Expired" : subscriptionStatus === 'trialing' ? "Free Trial" : subscriptionStatus}
                                            </span>
                                        </div>
                                        {subscriptionExpiry ? (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{isExpired ? "Expired on " : "Renews on "}</span>
                                                <span className={cn("font-semibold", isExpired ? "text-red-500" : "text-slate-700")}>
                                                    {expiryDateObj?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-medium">No active subscription found.</p>
                                        )}
                                    </div>
                                    {isExpired && (
                                        <Button className="h-9 px-5 rounded-lg text-xs font-semibold bg-[#CE0003] hover:bg-[#CE0003]/90 text-white shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                                            Renew Now
                                        </Button>
                                    )}
                                </div>
                            </div>

                             {/* Upgrade Plans Grid */}
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900">Extend your access</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Select a plan duration to renew or extend your business workspace.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                                    {plans.map((plan) => {
                                        const theme = PLAN_THEMES[plan.id] || PLAN_THEMES["1-month"]
                                        const isDark = theme.isDarkHeader

                                        return (
                                            <div
                                                key={plan.name}
                                                className={cn(
                                                    "relative flex flex-col rounded-3xl transition-all duration-300 hover:-translate-y-1 bg-white overflow-hidden border",
                                                    theme.cardBorder,
                                                    theme.cardShadow
                                                )}
                                            >
                                                {/* Card Top Section */}
                                                {isDark ? (
                                                    /* Featured Card: Dark Fluid Gradient Header */
                                                    <div className={cn("p-5 sm:p-6 text-white relative overflow-hidden", theme.headerBg)}>
                                                        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                                                        <div className="relative z-10 flex flex-col">
                                                            {/* Top Badge */}
                                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap", theme.badgeStyle)}>
                                                                    <Sparkles className="w-2.5 h-2.5 text-indigo-300 shrink-0" />
                                                                    {theme.badgeText}
                                                                </span>
                                                            </div>

                                                            {/* Title & Description */}
                                                            <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">{plan.name}</h4>
                                                            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed min-h-[32px]">{plan.description}</p>

                                                            {/* Price Box with Savings Badge */}
                                                            <div className="mt-3.5 mb-3.5 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                                                                <div className="flex items-baseline justify-between gap-2">
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{getPlanPriceLabel(plan)}</span>
                                                                        <span className="text-xs text-indigo-200 font-medium">{getPlanPeriodLabel(plan)}</span>
                                                                    </div>
                                                                    {theme.savingsBadge && (
                                                                        <span className={cn("text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap shrink-0", theme.savingsStyle)}>
                                                                            {theme.savingsBadge}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* CTA Button */}
                                                            <PlanButton
                                                                plan={plan}
                                                                publicKey={publicKey}
                                                                organization={organization}
                                                                user={user}
                                                                onSuccess={() => handleActivateSubscription(plan.name)}
                                                                isLoaded={isLoaded}
                                                                className={theme.buttonClass}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Light Card Header */
                                                    <div className="p-5 sm:p-6 bg-white flex flex-col">
                                                        {/* Top Badge */}
                                                        <div className="flex items-center justify-between gap-2 mb-3">
                                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap", theme.badgeStyle)}>
                                                                {theme.badgeText}
                                                            </span>
                                                        </div>

                                                        {/* Title & Description */}
                                                        <h4 className="text-lg sm:text-xl font-bold text-[#191A43] tracking-tight">{plan.name}</h4>
                                                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed min-h-[32px]">{plan.description}</p>

                                                        {/* Price Box with Savings Badge */}
                                                        <div className="mt-3.5 mb-3.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-2xl sm:text-3xl font-black text-[#191A43] tracking-tight">{getPlanPriceLabel(plan)}</span>
                                                                    <span className="text-xs text-slate-400 font-medium">{getPlanPeriodLabel(plan)}</span>
                                                                </div>
                                                                {theme.savingsBadge && (
                                                                    <span className={cn("text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap shrink-0", theme.savingsStyle)}>
                                                                        {theme.savingsBadge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* CTA Button */}
                                                        <PlanButton
                                                            plan={plan}
                                                            publicKey={publicKey}
                                                            organization={organization}
                                                            user={user}
                                                            onSuccess={() => handleActivateSubscription(plan.name)}
                                                            isLoaded={isLoaded}
                                                            className={theme.buttonClass}
                                                        />
                                                    </div>
                                                )}

                                                {/* Features Section */}
                                                <div className="p-5 sm:p-6 pt-4 flex-1 flex flex-col justify-between bg-white border-t border-slate-100/80">
                                                    <div>
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3.5">
                                                            What's included
                                                        </p>
                                                        <ul className="space-y-3">
                                                            {plan.features.map((feature: string, idx: number) => (
                                                                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] leading-snug">
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                                                                        theme.checkBg,
                                                                        theme.checkColor,
                                                                        theme.checkBorder
                                                                    )}>
                                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                    </div>
                                                                    <span className="text-slate-600 font-medium">{feature}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
