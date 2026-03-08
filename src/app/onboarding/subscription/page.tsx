"use client"

import { Check, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useOrganization, useUser } from "@clerk/nextjs"
import { updateOrgSubscriptionStatus } from "@/app/actions/org-metadata"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import dynamic from "next/dynamic"

const PlanButton = dynamic(() => import("@/components/paystack-button"), {
    ssr: false,
    loading: () => <Button disabled className="w-full h-12 bg-slate-100 text-slate-400">Loading...</Button>
})

const plans = [
    {
        name: "Free Trial",
        description: "Perfect to get started",
        price: "GHS 0",
        period: "7 days",
        features: [
            "Unlimited team members",
            "Up to 20 orders",
            "Bulk order updates",
            "Customer tracking page",
            "Standard dashboard"
        ],
        buttonText: "Start Free Trial",
        buttonVariant: "secondary",
        glowColor: "bg-pink-400/20",
    },
    {
        name: "2 weeks",
        description: "For short-term sales",
        price: "GHS 199",
        period: "14 days",
        features: [
            "Unlimited team members",
            "Up to 100 orders",
            "Customer messaging inbox",
            "Everything in Free Trial"
        ],
        buttonText: "Get Started",
        buttonVariant: "secondary",
        glowColor: "bg-blue-400/20",
    },
    {
        name: "Month",
        description: "The Best Seller",
        price: "GHS 350",
        period: "Monthly",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Everything in 2 Weeks"
        ],
        buttonText: "Most Popular",
        buttonVariant: "orange",
        glowColor: "bg-[#CE0003]/20",
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
            "Save 64% annually"
        ],
        buttonText: "Get Maximum Value",
        buttonVariant: "black",
        glowColor: "bg-purple-400/20",
    },
]

export default function SubscriptionPage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const { user, isLoaded: userLoaded } = useUser()
    const [redirectingPlan, setRedirectingPlan] = useState<string | null>(null)

    // Paystack public key from env
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ""

    const [canGoBack, setCanGoBack] = useState(false)

    useEffect(() => {
        if (!isLoaded || !userLoaded) return

        if (!organization) {
            router.replace("/onboarding/organization")
            return
        }

        const metadata = organization?.publicMetadata as any
        const subscriptionStatus = metadata?.subscriptionStatus
        const expiryDateStr = metadata?.subscriptionExpiry as string

        let isExpired = false
        let isNearExpiry = false

        if (expiryDateStr) {
            const expiryDate = new Date(expiryDateStr)
            const now = new Date()
            isExpired = now > expiryDate

            // Allow renewal if within 3 days
            const diffTime = expiryDate.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            isNearExpiry = diffDays <= 3 && diffDays >= 0
        }

        const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

        // Set whether they can go back to dashboard safely without a redirect loop
        setCanGoBack(isSubscribed && !isExpired)

        // Only redirect away if they are active AND NOT nearing expiry
        if (isSubscribed && !isExpired && !isNearExpiry) {
            router.replace("/backoffice")
        }
    }, [isLoaded, organization, router])

    const handleActivateSubscription = async (planName: string) => {
        try {
            if (!organization) return

            // Calculate expiry date
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

            // Save to localStorage as well for immediate UI consistency
            if (typeof window !== "undefined") {
                localStorage.setItem("selectedPlan", planName)
                localStorage.setItem("subscriptionExpiry", expiryDate)
                window.location.href = "/backoffice"
            }
        } catch (error) {
            console.error("Failed to update subscription status:", error)
            // Still try to redirect as a fallback
            if (typeof window !== "undefined") {
                window.location.href = "/backoffice"
            }
        }
    }

    const handleSelectPlan = async (plan: any) => {
        if (!isLoaded || redirectingPlan || !organization) return

        // 1. If it's the Free Trial, activate immediately
        if (plan.name === "Free Trial") {
            setRedirectingPlan(plan.name)
            await handleActivateSubscription(plan.name)
            return
        }

        // 2. For paid plans, trigger Paystack
        if (!publicKey) {
            toast.error("Payment system configuration missing. Please contact support.")
            return
        }

        const amountInGHS = parseInt(plan.price.replace(/[^0-9]/g, ""))
        const amountInKobo = amountInGHS * 100

        const config = {
            reference: (new Date()).getTime().toString(),
            email: organization.publicMetadata?.adminEmail as string || user?.emailAddresses[0].emailAddress || "",
            amount: amountInKobo,
            publicKey: publicKey,
            currency: "GHS",
        }
    }

    const metadata = organization?.publicMetadata as any
    const userMetadata = user?.publicMetadata as any

    // While loading, we assume subscription history exists to prevent "Free Trial" flash
    const isLoading = !isLoaded || !userLoaded
    const hasSubscriptionHistory = isLoading || !!metadata?.subscriptionStatus || !!userMetadata?.hasUsedTrial

    const displayPlans = hasSubscriptionHistory
        ? plans.filter(p => p.name !== "Free Trial")
        : plans

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Loading plans...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white">
                <div className="w-full px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center text-xl font-bold tracking-tight">
                        <span className="text-[#CE0003]">O</span>
                        <span className="text-[#191A43]">Tracker</span>
                    </div>
                    {canGoBack && (
                        <Button
                            variant="ghost"
                            onClick={() => router.push("/backoffice")}
                            className="text-slate-500 hover:text-slate-900 font-medium"
                        >
                            Back to Dashboard
                        </Button>
                    )}
                </div>
            </header>

            <div className="pt-10 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl w-full mx-auto space-y-12">
                    {/* Header Section */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold text-[#101323] tracking-tight">
                            Pricing built to suit all business types
                        </h1>
                        <p className="text-sm font-medium text-slate-400 max-w-2xl mx-auto">
                            Simple, Transparent pricing that grows with you. Start free and upgrade later.
                        </p>
                    </div>

                    {/* Cards Grid */}
                    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", hasSubscriptionHistory ? "lg:grid-cols-3 max-w-5xl mx-auto" : "lg:grid-cols-4")}>
                        {displayPlans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={cn(
                                    "relative flex flex-col border-0 rounded-[1.5rem] p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                                    plan.name === "Month" ? "bg-[#161931] text-white" : "bg-white text-[#101323]"
                                )}
                            >
                                <CardHeader className="space-y-1 p-0">
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
                                    <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                                    <p className={cn(
                                        "text-[13px] font-medium",
                                        plan.name === "Month" ? "text-slate-400" : "text-slate-400"
                                    )}>{plan.description}</p>
                                </CardHeader>

                                <CardContent className="flex-1 p-0 pt-10 space-y-10">
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                                            <span className={cn(
                                                "text-[13px] font-medium",
                                                plan.name === "Month" ? "text-slate-400" : "text-slate-400"
                                            )}>{plan.period}</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-4">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-[13px] font-medium">
                                                <div className={cn(
                                                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                                    plan.name === "Month" ? "bg-white/10 text-white" : "bg-blue-50 text-blue-500"
                                                )}>
                                                    <Check className="w-3 h-3" strokeWidth={3} />
                                                </div>
                                                <span className={plan.name === "Month" ? "text-white/90" : "text-[#101323]/80"}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter className="p-0 pt-10">
                                    <PlanButton
                                        plan={plan}
                                        publicKey={publicKey}
                                        organization={organization}
                                        user={user}
                                        onSuccess={() => handleActivateSubscription(plan.name)}
                                        isLoaded={isLoaded}
                                    />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <div className="pt-20 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-100">
                        <div className="space-y-3">
                            <h3 className="font-bold text-[#101323]">Real-time Tracking</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Give your customers peace of mind with instant updates on their order status, from pickup to delivery.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-bold text-[#101323]">Team Collaboration</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Invite your staff and managers to help manage orders, update statuses, and track business performance.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-bold text-[#101323]">Data Insights</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Understand your business better with insights into your most popular items and peak order times.
                            </p>
                        </div>
                    </div>

                    <div className="pt-10 flex flex-col items-center space-y-4">
                        <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            Payments secured by
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Paystack_Logo.svg"
                                alt="Paystack"
                                className="h-4 w-auto opacity-80"
                            />
                        </p>
                    </div>
                </div>
            </div>
        </div >
    )
}



