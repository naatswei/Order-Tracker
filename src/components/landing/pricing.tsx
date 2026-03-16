"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
    {
        name: "Free Trial",
        price: "GHS 0",
        duration: "/7 days",
        description: "Perfect to get started",
        features: [
            "Unlimited team members",
            "Up to 20 orders",
            "Bulk order updates",
            "Customer tracking page",
            "Standard dashboard"
        ],
        cta: "Try For Free",
        popular: false
    },
    {
        name: "2 weeks",
        price: "GHS 199",
        duration: "14 days",
        description: "For short-term sales",
        features: [
            "Unlimited team members",
            "Up to 100 orders",
            "Customer messaging inbox",
            "Everything in Free Trial"
        ],
        cta: "Get Started",
        popular: false
    },
    {
        name: "Month",
        price: "GHS 350",
        duration: "Monthly",
        description: "The Best Seller",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Everything in 2 Weeks"
        ],
        cta: "Go Standard",
        popular: true
    },
    {
        name: "Yearly",
        price: "GHS 1,500",
        duration: "Yearly",
        description: "Maximum Value",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Everything in Month",
            "Save 64% annually"
        ],
        cta: "Go Yearly",
        popular: false
    }
]

export function LandingPricing() {
    return (
        <section id="pricing" className="py-32 md:py-48 bg-slate-50 scroll-mt-32">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12 md:mb-20 px-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-2xl md:text-4xl font-black text-[#191A43] mb-4 md:mb-6 leading-tight"
                    >
                        Simple Plans for <span className="text-[#CE0003]">Smart Growth</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-medium opacity-80"
                    >
                        Choose the plan that fits your current business size. Upgrade as you scale.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pt-12">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                        >
                            {plan.popular && (
                                <div className="absolute -top-12 left-0 right-0 bg-[#191A43] h-24 rounded-t-[2rem] -z-10 flex justify-center pt-3">
                                    <div className="bg-white text-[#191A43] text-[10px] font-bold uppercase tracking-widest px-6 py-1.5 rounded-full h-fit">
                                        Most Popular
                                    </div>
                                </div>
                            )}
                            
                            <div className={cn(
                                "p-8 md:p-10 rounded-[2rem] border relative bg-white h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                                plan.popular ? "border-[#191A43]/10 shadow-xl" : "border-slate-100 shadow-sm"
                            )}>
                                {plan.name === "Yearly" && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B171] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap z-20">
                                        SAVE 64%
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-2xl font-extrabold tracking-tight text-[#191A43] mb-1">{plan.name}</h3>
                                    <p className="text-[14px] font-medium text-slate-400">{plan.description}</p>
                                </div>

                                <div className="mb-10 items-baseline flex gap-2">
                                    <span className="text-3xl font-black tracking-tight text-[#191A43]">GHS {plan.price.replace("GHS ", "")}</span>
                                    <span className="text-[14px] font-medium text-slate-400 uppercase tracking-wider">{plan.duration.replace("/", "")}</span>
                                </div>

                                <ul className="space-y-4 mb-10 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2.5 text-[13px] font-medium text-[#191A43]/90">
                                            <div className="w-4.5 h-4.5 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                            </div>
                                            <span className="whitespace-nowrap">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/sign-up" className="mt-auto">
                                    <Button className={cn(
                                        "w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-95",
                                        plan.popular
                                            ? "bg-[#191A43] text-white hover:bg-[#191A43]/90 shadow-lg shadow-indigo-500/20"
                                            : "bg-[#191A43] text-white hover:bg-[#191A43]/90"
                                    )}>
                                        {plan.cta}
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
