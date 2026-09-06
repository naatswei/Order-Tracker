"use client"

import { Check, ShieldCheck, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useOrganization, useUser } from "@clerk/nextjs"
import { updateOrgSubscriptionStatus } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { OnboardingLayout } from "@/components/onboarding-layout"
import { PRICING_PLANS, FREE_TRIAL_PLAN } from "@/constants/pricing"

const PlanButton = dynamic(() => import("@/components/paystack-button"), {
    ssr: false,
    loading: () => <Button disabled className="w-full h-11 bg-slate-100 text-slate-400 rounded-xl">Loading...</Button>
})

const plans = PRICING_PLANS

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
    "free-trial": {
        badgeText: "30-Day Free Trial",
        badgeStyle: "bg-sky-50 text-sky-700 border border-sky-200/80",
        cardBorder: "border-slate-200 hover:border-sky-300",
        cardShadow: "shadow-sm hover:shadow-xl",
        priceColor: "text-slate-900",
        periodColor: "text-slate-400",
        buttonClass: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/90 font-semibold shadow-none",
        checkBg: "bg-sky-50",
        checkColor: "text-sky-600",
        checkBorder: "border-sky-200/60"
    },
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
        savingsStyle: "bg-amber-400/15 text-amber-300 border border-amber-400/25",
        buttonClass: "bg-white text-slate-950 hover:bg-slate-100 font-bold shadow-lg shadow-black/25",
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
}

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
        const subscriptionStatus = metadata?.subscriptionStatus as string
        const expiryDateStr = metadata?.subscriptionExpiry as string

        const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
        const isExpired = expiryDateStr ? (new Date() > new Date(expiryDateStr)) : false

        // CRITICAL: If they have an active plan and reached this page, 
        // we should automatically send them to the dashboard.
        if (isSubscribed && !isExpired) {
            router.replace("/backoffice")
            return
        }

        setCanGoBack(true)
    }, [isLoaded, organization, router, userLoaded])

    const isLoading = !isLoaded || !userLoaded
    const metadata = organization?.publicMetadata as any
    const userMetadata = user?.publicMetadata as any

    const handleActivateSubscription = async (planName: string) => {
        try {
            if (!organization) return

            // Calculate expiry date
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

            // Save to localStorage as well for immediate UI consistency
            if (typeof window !== "undefined") {
                localStorage.setItem("subscriptionStatus", 'active')
                localStorage.setItem("subscriptionExpiry", expiryDate)
                localStorage.setItem("lastActivation", Date.now().toString())

                toast.success(`${planName} activated!`)
                window.location.href = "/backoffice"
            }
        } catch (error) {
            console.error("Failed to activate subscription:", error)
            toast.error("Failed to activate subscription. Please try again or contact support.")
        }
    }

    const getPlanPriceLabel = (plan: any) => {
        if (plan.price === 0) return "Free"
        return `GH₵ ${plan.price}`
    }

    const getPlanPeriodLabel = (plan: any) => {
        if (plan.id === 'free-trial') return "/ 30 days"
        if (plan.id === '1-month') return "/ month"
        if (plan.id === '3-months') return "/ 3 months"
        return "/ year"
    }

    // Prevent Free Trial reuse by checking trial flags explicitly
    const hasSubscriptionHistory = isLoading ||
        !!metadata?.subscriptionStatus ||
        !!metadata?.trialUsed ||
        !!userMetadata?.hasUsedTrial

    useEffect(() => {
        if (!isLoaded || !userLoaded || !organization) return

        const searchParams = new URLSearchParams(window.location.search)
        const queryPlan = searchParams.get('plan')
        const storagePlan = localStorage.getItem('pendingPlan')
        const planToActivate = queryPlan || storagePlan

        if (planToActivate === "Free Trial" && !hasSubscriptionHistory) {
            localStorage.removeItem('pendingPlan')
            toast.info("Activating your free trial...")
            handleActivateSubscription("Free Trial")
        }
    }, [isLoaded, userLoaded, organization, hasSubscriptionHistory])

    const displayPlans = hasSubscriptionHistory
        ? plans
        : [FREE_TRIAL_PLAN, ...plans]

    if (isLoading) {
        return <AppLoader message="Loading plans..." />
    }

    return (
        <OnboardingLayout
            currentStep={4}
            title="Choose your plan"
            subtitle="All plans include complete platform access. Pick the duration that works best for your team."
            wide
            centerHeader
            backUrl="/onboarding/profile?edit=true"
            backLabel="Back to Profile Details"
        >
            {/* Value Highlights Pill */}
            <div className="flex items-center justify-center gap-6 mb-8 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    No setup fees
                </span>
                <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Instant activation
                </span>
                <span className="flex items-center gap-1.5 hidden sm:inline-flex">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Cancel anytime
                </span>
            </div>

            {/* Plan Cards Grid */}
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch",
                displayPlans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
            )}>
                {displayPlans.map((plan) => {
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
                                /* Featured Card: Dark Fluid Gradient Header (Reference Inspired!) */
                                <div className={cn("p-5 sm:p-6 text-white relative overflow-hidden", theme.headerBg)}>
                                    {/* Decorative subtle ambient wave glow */}
                                    <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col">
                                        {/* Top Badge (Compact, single-line, never wraps) */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap", theme.badgeStyle)}>
                                                <Sparkles className="w-2.5 h-2.5 text-indigo-300 shrink-0" />
                                                {theme.badgeText}
                                            </span>
                                        </div>

                                        {/* Title & Description */}
                                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{plan.name}</h3>
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
                                    {/* Top Badge (Compact, single-line, never wraps) */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap", theme.badgeStyle)}>
                                            {theme.badgeText}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="text-lg sm:text-xl font-bold text-[#191A43] tracking-tight">{plan.name}</h3>
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

            {/* Trust & Paystack Attribution */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>256-bit secure encrypted transaction</span>
                </div>
                <span className="hidden sm:inline text-slate-300">•</span>
                <p className="flex items-center gap-2">
                    Payments powered by
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Paystack_Logo.svg"
                        alt="Paystack"
                        className="h-3.5 w-auto opacity-70"
                    />
                </p>
            </div>
        </OnboardingLayout>
    )
}
