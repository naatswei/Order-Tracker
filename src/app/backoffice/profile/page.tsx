"use client"

import { useState, useEffect, useRef } from "react"
import { useOrganization, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { updateOrgProfile, updateOrgSubscriptionStatus } from "@/app/actions/org-metadata"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Camera, Settings, Building2, CreditCard, Check, Clock } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import Link from "next/link"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

const PlanButton = dynamic(() => import("@/components/paystack-button"), {
    ssr: false,
    loading: () => <Button disabled className="w-full h-11 bg-slate-100 text-slate-400">Loading...</Button>
})

const plans = [
    {
        name: "2 weeks",
        description: "For short-term sales",
        price: "GHS 199",
        period: "14 days",
        features: [
            "Up to 2 team members",
            "Up to 100 orders",
            "Bulk order updates",
            "Customer messaging inbox"
        ],
        buttonText: "Get Started",
    },
    {
        name: "Month",
        description: "The Best Seller",
        price: "GHS 350",
        period: "Monthly",
        features: [
            "Up to 4 team members",
            "Unlimited orders",
            "Everything in 2 Weeks"
        ],
        buttonText: "Most Popular",
    },
    {
        name: "Yearly",
        description: "Maximum Value",
        price: "GHS 1,500",
        period: "Yearly",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Everything in Month",
            "Save over 60% annually"
        ],
        buttonText: "Get Maximum Value",
    },
]

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

    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    // Subscription State
    const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive")
    const [subscriptionExpiry, setSubscriptionExpiry] = useState<string>("")
    const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ""

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

    const handleActivateSubscription = async (planName: string) => {
        try {
            if (!organization) return
            const now = new Date()
            let expiryDays = 30
            if (planName === "Free Trial") expiryDays = 7
            if (planName === "2 weeks") expiryDays = 14
            if (planName === "Yearly") expiryDays = 365

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

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans">
            <BackofficeHeader config={config} />

            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-[1000px] space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/backoffice">
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-slate-900 rounded-full hover:bg-white shadow-sm transition-all border border-transparent hover:border-slate-200">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
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

                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <Button
                                                type="submit"
                                                disabled={profileLoading}
                                                className="min-w-[140px] h-11 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold shadow-sm transition-opacity"
                                            >
                                                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
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
                                            <h2 className="text-xl font-bold flex items-center gap-3">
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
                                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                    <Clock className="w-4 h-4" />
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
                                            <Button className="h-11 px-6 rounded-xl font-bold bg-[#CE0003] hover:bg-[#CE0003]/90 text-white shadow-sm">
                                                Renew Now
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Upgrade Plans Grid */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4 sm:mb-6">Upgrade your workspace</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {plans.map((plan) => (
                                        <Card key={plan.name} className={cn(
                                            "relative flex flex-col border-slate-200 rounded-3xl p-6 shadow-sm flex-1",
                                            plan.name === "Month" ? "border-slate-300 bg-slate-50/50" : "bg-white"
                                        )}>
                                            <CardHeader className="p-0 space-y-1">
                                                {plan.name === "Month" && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#CE0003] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                                                        Most Popular
                                                    </div>
                                                )}
                                                {plan.name === "Yearly" && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                                                        Save 64%
                                                    </div>
                                                )}
                                                <h3 className="text-lg font-bold">{plan.name}</h3>
                                                <p className="text-[11px] text-slate-500 font-medium">{plan.description}</p>
                                            </CardHeader>
                                            <CardContent className="p-0 pt-4 sm:pt-6 flex-1 flex flex-col">
                                                <div className="mb-4 sm:mb-6">
                                                    <span className="text-2xl font-bold tracking-tight">{plan.price}</span>
                                                    <span className="text-xs text-slate-500 font-medium ml-1">/{plan.period.replace(" Monthly", "mo").replace(" Yearly", "yr")}</span>
                                                </div>
                                                <ul className="space-y-3 mb-8 flex-1">
                                                    {plan.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-[12px] font-medium text-slate-600">
                                                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <PlanButton
                                                    plan={plan}
                                                    publicKey={publicKey}
                                                    organization={organization}
                                                    user={user}
                                                    onSuccess={() => handleActivateSubscription(plan.name)}
                                                    isLoaded={isLoaded}
                                                />
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
