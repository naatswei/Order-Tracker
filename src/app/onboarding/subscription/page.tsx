"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const plans = [
    {
        name: "Free Trial",
        price: "Gh0",
        period: "7 days",
        description: "Perfect to get started",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        highlighted: false,
    },
    {
        name: "User",
        price: "Gh99",
        period: "Weekly",
        description: "Affordable",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        highlighted: false,
    },
    {
        name: "Month",
        price: "Gh250",
        period: "Monthly",
        description: "Most Popular",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        highlighted: true,
    },
    {
        name: "Teams",
        price: "Gh499",
        period: "Yearly",
        description: "Save 65% a year",
        features: ["Customer notifications", "Customer data Collection", "Real-time order status updates"],
        buttonText: "Start Free Trial",
        highlighted: false,
    },
]

export default function SubscriptionPage() {
    const router = useRouter()

    const handleSelectPlan = (planName: string) => {
        // For now, all buttons just redirect to backoffice
        router.push("/backoffice")
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl w-full space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold text-[#191A43] sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        Simple, Transparent pricing that grows with you. Start free and upgrade anytime.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col border-none shadow-xl transition-all duration-300 hover:-translate-y-1",
                                plan.highlighted
                                    ? "bg-[#191A43] text-white scale-105 z-10"
                                    : "bg-white text-[#191A43]"
                            )}
                        >
                            <CardHeader className="pb-8">
                                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                <p className={cn(
                                    "text-sm font-medium",
                                    plan.highlighted ? "text-slate-300" : "text-slate-500"
                                )}>
                                    {plan.description}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                                    <span className={cn(
                                        "text-sm font-medium",
                                        plan.highlighted ? "text-slate-400" : "text-slate-500"
                                    )}>
                                        {plan.period}
                                    </span>
                                </div>
                                <ul className="space-y-4">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm">
                                            <div className={cn(
                                                "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                                                plan.highlighted
                                                    ? "bg-white/10 border-white/20"
                                                    : "bg-blue-50 border-blue-100"
                                            )}>
                                                <Check className={cn(
                                                    "w-3 h-3",
                                                    plan.highlighted ? "text-white" : "text-blue-600"
                                                )} />
                                            </div>
                                            <span className={plan.highlighted ? "text-slate-200" : "text-slate-600"}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="pt-8">
                                <Button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={cn(
                                        "w-full h-12 text-base font-bold rounded-xl transition-all duration-200",
                                        plan.highlighted
                                            ? "bg-white text-[#191A43] hover:bg-slate-100"
                                            : "bg-[#191A43] text-white hover:bg-[#191A43]/90"
                                    )}
                                >
                                    {plan.buttonText}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="text-center pt-8">
                    <p className="text-slate-400 text-sm font-medium">
                        No credit card required. Enjoy 7 days free trial.
                    </p>
                </div>
            </div>
        </div>
    )
}
