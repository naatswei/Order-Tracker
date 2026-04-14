"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck, Zap } from "lucide-react"
import Image from "next/image"
export function LandingHero() {
    return (
        <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-24 overflow-hidden bg-white bg-grid">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="text-center lg:text-left"
                    >

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#191A43] leading-[1.1] mb-8 tracking-[-0.02em]">
                            Manage Your <span className="text-[#CE0003]">Business Back Home</span>, From Anywhere
                        </h1>

                        <p className="text-sm md:text-base text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-medium">
                            The international dashboard for the diaspora. Eliminate inquiry fatigue, track local operations, and build radical trust with your customers and staff.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-14">
                            <Link href="/sign-up">
                                <Button className="bg-[#191A43] text-white hover:bg-[#191A43]/90 rounded-xl h-11 px-8 text-sm font-bold shadow-lg shadow-indigo-500/10 transition-all active:scale-95">
                                    Start Free Trial
                                </Button>
                            </Link>
                        </div>

                         <div className="flex flex-wrap items-center gap-8 justify-center lg:justify-start">
                            <div className="flex items-center gap-2.5 text-slate-500 text-sm font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#CE0003]" />
                                <span>Branded Links</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-slate-500 text-sm font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#191A43]" />
                                <span>Real-time Tracking</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-slate-500 text-sm font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span>Global Visibility</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative z-10 rounded-[2rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.12)] border-[1px] border-slate-200 bg-white">
                            <div className="aspect-video bg-slate-50 relative group">
                                <Image
                                    src="/otracker-dashboard-premium.png"
                                    alt="OTracker Platform"
                                    fill
                                    className="object-cover"
                                    priority
                                    quality={100}
                                />
                            </div>
                        </div>
                        {/* Decorative background blur */}
                        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-[100px] -z-10" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
