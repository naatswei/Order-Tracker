"use client"

import { Check, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useOrganization } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

const plans = [
    {
        name: "Free Trial",
        description: "Perfect to get started",
        price: "Gh0",
        period: "7 days",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        buttonVariant: "secondary",
        glowColor: "bg-pink-400/20",
    },
    {
        name: "2 weeks",
        description: "For businesses running sales",
        price: "Gh199",
        period: "2 weeks",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        buttonVariant: "secondary",
        glowColor: "bg-blue-400/20",
    },
    {
        name: "Month",
        description: "Sweet Spot",
        price: "Gh350",
        period: "Monthly",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        buttonVariant: "orange",
        glowColor: "bg-[#CE0003]/20",
    },
    {
        name: "Yearly",
        description: "The Steal",
        price: "Gh1,500",
        period: "Yearly",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        buttonVariant: "black",
        glowColor: "bg-purple-400/20",
    },
]

export default function SubscriptionPage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const [redirectingPlan, setRedirectingPlan] = useState<string | null>(null)

    useEffect(() => {
        console.log("Subscription Page State:", { isLoaded, orgId: organization?.id })
    }, [isLoaded, organization])

    const handleSelectPlan = (planName: string) => {
        if (!isLoaded || redirectingPlan) return

        setRedirectingPlan(planName)

        // Save the selected plan to localStorage for later processing if needed
        localStorage.setItem("selectedPlan", planName)

        // Simple and robust redirect
        window.location.href = "/backoffice"
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pt-10 pb-20 px-4 sm:px-6 lg:px-8">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col border-0 rounded-[1.5rem] p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                                plan.name === "Month" ? "bg-[#161931] text-white" : "bg-white text-[#101323]"
                            )}
                        >
                            <CardHeader className="space-y-1 p-0">
                                <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                                <p className={cn(
                                    "text-[13px] font-medium",
                                    plan.name === "Month" ? "text-slate-400" : "text-slate-400"
                                )}>{plan.description}</p>
                            </CardHeader>

                            <CardContent className="flex-1 p-0 pt-10 space-y-10">
                                <div className="flex flex-col space-y-2">
                                    {plan.name === "Yearly" && (
                                        <div className="w-fit bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                                            Save 64%
                                        </div>
                                    )}
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
                                <Button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    // We only disable for loading state, not redirect state, 
                                    // to prevent the "messy" grey-out of other buttons.
                                    disabled={!isLoaded}
                                    className={cn(
                                        "w-full h-12 text-sm font-bold rounded-xl transition-all duration-200",
                                        plan.name === "Month" ? "bg-white text-[#101323] hover:bg-white/90" : "bg-[#161931] text-white hover:bg-[#161931]/90",
                                        redirectingPlan === plan.name && "opacity-70 scale-[0.98]",
                                        !isLoaded && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {redirectingPlan === plan.name ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (isLoaded ? plan.buttonText : "Loading...")}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
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
    )
}
