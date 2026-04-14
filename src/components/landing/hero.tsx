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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative hidden lg:flex items-center justify-center min-h-[500px]"
                    >
                        {/* Central Brand Anchor */}
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.05, 1],
                                transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className="relative z-10 w-48 h-48 rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center justify-center group"
                        >
                            <div className="absolute inset-0 rounded-full bg-red-500/5 blur-2xl group-hover:bg-red-500/10 transition-colors" />
                            <span className="text-8xl font-black text-[#CE0003] drop-shadow-sm select-none">O</span>
                        </motion.div>

                        {/* Industry Ecosystem Satellites (Orbits) */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-0 left-10 z-20 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white"
                        >
                            <Image src="/industry-tailor.png" alt="Tailoring Industry" fill className="object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm py-1.5 px-2 text-[10px] text-white font-bold text-center">Tailoring</div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 25, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute top-10 right-10 z-20 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white"
                        >
                            <Image src="/industry-hair.png" alt="Hair Retail" fill className="object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm py-1.5 px-2 text-[10px] text-white font-bold text-center">Hair Retail</div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-10 left-10 z-20 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white"
                        >
                            <Image src="/industry-logistics.png" alt="Logistics" fill className="object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm py-1.5 px-2 text-[10px] text-white font-bold text-center">Logistics</div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                            className="absolute bottom-0 right-10 z-20 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white"
                        >
                            <Image src="/industry-vendor.png" alt="Online Stores" fill className="object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm py-1.5 px-2 text-[10px] text-white font-bold text-center">Online Stores</div>
                        </motion.div>

                        {/* Background Decorative Elements */}
                        <div className="absolute w-[400px] h-[400px] border border-slate-100 rounded-full -z-10 opacity-50" />
                        <div className="absolute w-[600px] h-[600px] border border-slate-50 rounded-full -z-10 opacity-30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-[100px] -z-10" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
