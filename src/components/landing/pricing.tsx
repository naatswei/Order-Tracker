"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { PRICING_PLANS, FREE_TRIAL_PLAN } from "@/constants/pricing"

const plans = [FREE_TRIAL_PLAN, ...PRICING_PLANS];

const planStyles: Record<string, {
    card: string;
    badge?: string;
    badgeText?: string;
    title: string;
    description: string;
    price: string;
    period: string;
    checkBg: string;
    checkColor: string;
    featureText: string;
    button: string;
    periodLabel: string;
}> = {
    "free-trial": {
        card: "bg-white border-slate-200 text-[#191A43] shadow-sm",
        title: "text-[#191A43]",
        description: "text-slate-400",
        price: "text-[#191A43]",
        period: "text-slate-400",
        checkBg: "bg-indigo-50",
        checkColor: "text-indigo-500",
        featureText: "text-[#191A43]/80",
        button: "bg-slate-100 text-[#191A43] hover:bg-slate-200",
        periodLabel: "/14 days",
    },
    "1-month": {
        card: "bg-[#191A43] border-[#191A43] text-white shadow-lg",
        title: "text-white",
        description: "text-slate-300",
        price: "text-white",
        period: "text-slate-300",
        checkBg: "bg-white/10",
        checkColor: "text-white",
        featureText: "text-slate-100",
        button: "bg-white text-[#191A43] hover:bg-white/90",
        periodLabel: "/month",
    },
    "3-months": {
        card: "bg-[#CE0003] border-[#CE0003] text-white shadow-xl",
        badge: "Most Popular",
        title: "text-white",
        description: "text-red-100",
        price: "text-white",
        period: "text-red-100",
        checkBg: "bg-white/15",
        checkColor: "text-white",
        featureText: "text-red-50",
        button: "bg-white text-[#CE0003] hover:bg-white/90 font-extrabold",
        periodLabel: "/3 months",
    },
    "1-year": {
        card: "bg-[#00864e] border-[#00864e] text-white shadow-lg",
        badge: "Best Value",
        title: "text-white",
        description: "text-green-100",
        price: "text-white",
        period: "text-green-100",
        checkBg: "bg-white/15",
        checkColor: "text-white",
        featureText: "text-green-50",
        button: "bg-white text-[#00864e] hover:bg-white/90 font-extrabold",
        periodLabel: "/year",
    },
};

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
                        Choose the duration that fits your business. All plans include full application access.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-12 max-w-7xl mx-auto">
                    {plans.map((plan, index) => {
                        const style = planStyles[plan.id] ?? planStyles["1-month"];
                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                                className="relative h-full"
                            >
                                {style.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#191A43] text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md whitespace-nowrap z-20 border border-slate-200">
                                        {style.badge}
                                    </div>
                                )}
                                <div className={cn(
                                    "p-7 rounded-[2rem] border relative h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                                    style.card
                                )}>
                                    <div className="mb-0">
                                        <h3 className={cn("text-xl font-extrabold tracking-tight mb-1", style.title)}>
                                            {plan.name}
                                        </h3>
                                        <p className={cn("text-[13px] font-medium", style.description)}>
                                            {plan.description}
                                        </p>
                                    </div>

                                    <div className="mt-6 mb-8 items-baseline flex gap-1.5">
                                        <span className={cn("text-2xl font-black tracking-tight", style.price)}>
                                            {plan.price === 0 ? "Free" : `GHS ${plan.price}`}
                                        </span>
                                        <span className={cn("text-[12px] font-medium uppercase tracking-wider", style.period)}>
                                            {style.periodLabel}
                                        </span>
                                    </div>

                                    <ul className="space-y-3 flex-1">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2.5 text-[12px] font-medium">
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                                                    style.checkBg, style.checkColor
                                                )}>
                                                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                                </div>
                                                <span className={style.featureText}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-8">
                                        <Link href="/sign-up">
                                            <Button className={cn(
                                                "w-full rounded-xl h-11 font-bold transition-all active:scale-95",
                                                style.button
                                            )}>
                                                {plan.buttonText}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
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
