"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
    {
        name: "Starter",
        price: "GHS 149",
        duration: "Monthly",
        description: "Perfect for startups",
        features: [
            "Unlimited team members",
            "Up to 50 orders",
            "Branded tracking page",
            "Standard dashboard",
            "Email support"
        ],
        cta: "Try For Free",
        popular: false
    },
    {
        name: "Growth",
        price: "GHS 299",
        duration: "Monthly",
        description: "For professional brands",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Customer messaging inbox",
            "Staff performance tracking",
            "Priority support"
        ],
        cta: "Get Started",
        popular: true
    },
    {
        name: "Scale",
        price: "GHS 599",
        duration: "Monthly",
        description: "The Empire builder",
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Multi-branch management",
            "Advanced analytics",
            "Dedicated account manager"
        ],
        cta: "Go Scale",
        popular: false
    },
    {
        name: "Yearly",
        price: "GHS 1,500",
        duration: "Yearly",
        description: "Maximum Value",
        features: [
            "Everything in Growth",
            "Unlimited everything",
            "Save 58% annually",
            "Best for large teams"
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-12">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group h-full"
                        >
                            <div className={cn(
                                "p-8 md:p-10 rounded-[2rem] border relative h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                                plan.popular ? "bg-[#161931] border-[#161931] text-white shadow-xl" : "bg-white border-slate-100 text-[#191A43] shadow-sm"
                            )}>
                                {plan.name === "Yearly" && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B171] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap z-20">
                                        SAVE 64%
                                    </div>
                                )}

                                <div className="mb-0">
                                    <h3 className={cn(
                                        "text-2xl font-extrabold tracking-tight mb-1",
                                        plan.popular ? "text-white" : "text-[#191A43]"
                                    )}>
                                        {plan.name}
                                    </h3>
                                    <p className={cn(
                                        "text-[14px] font-medium",
                                        plan.popular ? "text-slate-300" : "text-slate-400"
                                    )}>
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="mt-8 mb-10 items-baseline flex gap-2">
                                    <span className={cn(
                                        "text-3xl font-black tracking-tight",
                                        plan.popular ? "text-white" : "text-[#191A43]"
                                    )}>
                                        GHS {plan.price.replace("GHS ", "")}
                                    </span>
                                    <span className={cn(
                                        "text-[14px] font-medium uppercase tracking-wider",
                                        plan.popular ? "text-slate-300" : "text-slate-400"
                                    )}>
                                        {plan.duration.replace("/", "")}
                                    </span>
                                </div>

                                <ul className="space-y-4 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-[13px] font-medium">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                                plan.popular ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-500"
                                            )}>
                                                <Check className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                            <span className={plan.popular ? "text-slate-100" : "text-[#191A43]/90"}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <Link href="/sign-up">
                        <Button className="w-full sm:w-auto bg-white text-[#191A43] hover:bg-slate-50 rounded-2xl h-16 md:h-20 px-10 md:px-14 text-lg md:text-xl font-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-3 group/btn">
                            Start Your 14-Day Free Trial
                            <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                    <p className="mt-4 text-sm font-medium text-slate-400">
                        No credit card required to start your free trial.
                    </p>
                </div>
            </div>
        </section>
    )
}
