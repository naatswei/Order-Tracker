"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
        name: "User",
        description: "Affordable",
        price: "Gh99",
        period: "Weekly",
        features: ["Full library access", "20 assets / mo", "Regular updates", "Desktop and mobile", "Premium support"],
        buttonText: "Get Started",
        buttonVariant: "blue",
        glowColor: "bg-blue-400/20",
    },
    {
        name: "Month",
        description: "Most Popular",
        price: "Gh250",
        period: "Monthly",
        features: ["Full library access", "30 assets / mo", "Regular updates", "Desktop and mobile", "Premium support"],
        buttonText: "Get Started",
        buttonVariant: "orange",
        glowColor: "bg-[#CE0003]/20",
    },
    {
        name: "Teams",
        description: "Save 30% a year",
        price: "Gh499",
        period: "Yearly",
        features: ["Full library access", "Unlimited assets", "Regular updates", "Desktop and mobile", "Premium support"],
        buttonText: "Get Started",
        buttonVariant: "black",
        glowColor: "bg-purple-400/20",
    },
]

export default function SubscriptionPage() {
    const router = useRouter()

    const handleSelectPlan = (planName: string) => {
        router.push("/backoffice")
    }

    return (
        <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center py-20 px-4 sm:px-6 lg:px-8">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-pink-100/30 rounded-full blur-[120px] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-[150px] -z-10" />
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-50/20 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl w-full space-y-16 relative z-10">
                {/* Header Section */}
                <div className="text-center space-y-6">
                    <h1 className="text-5xl font-bold text-[#191A43] sm:text-6xl tracking-tight max-w-4xl mx-auto leading-[1.1]">
                        Transparent and flexible pricing plans
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                        All good things starts with a tracker. Get inspired without breaking your wallet.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className="relative flex flex-col border border-slate-100 bg-white/80 backdrop-blur-md rounded-[2.5rem] p-4 shadow-2xl shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1"
                        >
                            <CardHeader className="space-y-4 pt-8 pb-4">
                                <span className="text-2xl font-bold text-[#191A43]">{plan.name}</span>
                                <p className="text-sm font-medium text-slate-400">{plan.description}</p>
                                <div className="space-y-1 pt-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[#191A43]">{plan.price}</span>
                                        <span className="text-sm font-bold text-slate-400">{plan.period}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 pt-8 space-y-6">
                                <ul className="space-y-4">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-4 text-sm font-bold">
                                            <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                                                <Check className="w-4 h-4 text-[#191A43]" strokeWidth={3} />
                                            </div>
                                            <span className="text-[#191A43]/80 leading-snug whitespace-nowrap text-[13px] tracking-tight">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="pb-8 pt-8">
                                <Button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={cn(
                                        "w-full h-14 text-sm font-black rounded-2xl transition-all duration-200 shadow-md",
                                        plan.buttonVariant === "secondary" && "bg-[#191A43] text-white hover:bg-[#191A43]/90 shadow-[#191A43]/20",
                                        plan.buttonVariant === "blue" && "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200",
                                        plan.buttonVariant === "orange" && "bg-[#CE0003] text-white hover:bg-[#CE0003]/90 shadow-red-200",
                                        plan.buttonVariant === "black" && "bg-slate-900 text-white hover:bg-black shadow-slate-200",
                                    )}
                                >
                                    {plan.buttonText}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="pt-20 text-center">
                    <p className="text-sm font-bold text-slate-400">
                        Payments secured by <span className="text-slate-600 font-extrabold">Paystack</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
