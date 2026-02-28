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
        period: "1 week",
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

            <div className="max-w-7xl w-full space-y-20 relative z-10">
                {/* Header Section */}
                <div className="text-center space-y-6">
                    <h1 className="text-6xl font-black text-slate-900 sm:text-7xl tracking-tighter max-w-4xl mx-auto leading-[0.95]">
                        Transparent and <br className="hidden sm:block" /> flexible pricing plans
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium tracking-tight leading-relaxed">
                        All good things starts with a tracker. <br className="hidden sm:block" /> Get inspired without breaking your wallet.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 px-4">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className="relative flex flex-col border border-slate-100 bg-white/90 backdrop-blur-xl rounded-[3rem] p-6 shadow-2xl shadow-slate-200/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-slate-300/50"
                        >
                            <CardHeader className="space-y-2 pt-12 pb-8 text-center">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] block mb-4">{plan.name}</span>
                                <div className="space-y-1">
                                    <span className="text-6xl font-black text-slate-900 tracking-tighter block leading-none">{plan.price}</span>
                                    <span className="text-[12px] font-extrabold text-slate-400 uppercase tracking-[0.2em] block pt-2">{plan.period}</span>
                                </div>
                                <p className="text-[14px] font-bold text-slate-500 pt-8 leading-relaxed max-w-[200px] mx-auto">{plan.description}</p>
                            </CardHeader>
                            <CardContent className="flex-1 pt-12 pb-12">
                                <ul className="space-y-6 w-fit mx-auto">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-5 text-[14px] font-bold group">
                                            <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            <span className="text-slate-500 tracking-tight group-hover:text-slate-900 transition-colors duration-300">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="pb-12 px-8">
                                <Button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={cn(
                                        "w-full h-16 text-[14px] font-black rounded-2xl transition-all duration-300 shadow-2xl uppercase tracking-[0.1em]",
                                        plan.buttonVariant === "secondary" && "bg-[#101323] text-white hover:bg-[#101323]/90 shadow-[#101323]/20",
                                        plan.buttonVariant === "blue" && "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50",
                                        plan.buttonVariant === "orange" && "bg-[#CE0003] text-white hover:bg-[#CE0003]/90 shadow-red-200/50",
                                        plan.buttonVariant === "black" && "bg-slate-950 text-white hover:bg-black shadow-slate-300/50",
                                    )}
                                >
                                    {plan.buttonText === "Get Started" ? "Get Started" : plan.buttonText}
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
