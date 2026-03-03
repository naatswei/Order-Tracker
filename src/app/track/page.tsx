"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getBusinessConfig } from "@/lib/business-configs"
import { motion } from "framer-motion"
import { ArrowRight, Search, Sparkles } from "lucide-react"

export default function TrackPage() {
    const [trackingId, setTrackingId] = useState("")
    const [businessType, setBusinessType] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const stored = localStorage.getItem("businessType")
        if (stored && stored !== businessType) {
            setTimeout(() => setBusinessType(stored), 0)
        }
    }, [businessType])

    const config = getBusinessConfig(businessType)
    const isGeneric = !businessType

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (trackingId.trim()) {
            router.push(`/track/${trackingId.trim()}`)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A0B14] text-white selection:bg-[#CE0003]/30 overflow-hidden relative">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#CE0003]/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-6 py-12 relative z-10 flex flex-col min-h-screen">
                <header className="flex justify-between items-center mb-20">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[#CE0003] font-black text-2xl tracking-tighter">O</span>
                        <span className="text-white/90 font-light text-xl tracking-[0.2em] uppercase">Tracker</span>
                    </div>
                    <Link href="/">
                        <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 font-light tracking-widest text-[10px] uppercase">
                            Home Portal
                        </Button>
                    </Link>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full text-center space-y-12"
                    >
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/30 mb-6"
                            >
                                <Sparkles className="w-3 h-3 text-[#CE0003]" />
                                <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-medium">Secure Tracing</span>
                            </motion.div>
                            <h1 className="text-5xl sm:text-7xl font-extralight tracking-tighter leading-tight">
                                Trace your <br />
                                <span className="font-normal text-white/90">Masterpiece.</span>
                            </h1>
                            <p className="text-white/60 font-light tracking-wide max-w-sm mx-auto leading-relaxed">
                                Enter your exclusive reference number below to reveal the journey of your curation.
                            </p>
                        </div>

                        <Card className="bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl rounded-[2.5rem] overflow-hidden">
                            <CardContent className="p-8 sm:p-12">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="space-y-3 text-left">
                                        <Label htmlFor="trackingId" className="text-[10px] uppercase tracking-[0.2em] text-[#CE0003] font-bold ml-1">
                                            {isGeneric ? "Order Reference" : config.orderLabel}
                                        </Label>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#CE0003]/40 transition-colors" strokeWidth={1.5} />
                                            <Input
                                                id="trackingId"
                                                value={trackingId}
                                                onChange={(e) => setTrackingId(e.target.value)}
                                                placeholder="e.g. KT-7492-X"
                                                className="bg-white/10 border-white/30 h-16 pl-12 rounded-[1.25rem] focus:border-[#CE0003] focus:ring-1 focus:ring-[#CE0003]/20 placeholder:text-white/40 text-lg font-light tracking-widest uppercase transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-[#CE0003] hover:bg-[#CE0003]/90 text-white h-12 rounded-full font-light tracking-[0.1em] text-xs uppercase shadow-xl transition-all active:scale-95 group border-none"
                                    >
                                        Track Order
                                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="pt-12">
                            <p className="text-[10px] text-white/50 font-light tracking-[0.4em] uppercase">
                                Private & Encrypted Journey
                            </p>
                        </div>
                    </motion.div>
                </div>

                <footer className="mt-auto py-8 text-center opacity-50 text-[10px] uppercase tracking-[0.3em] font-light">
                    &copy; {new Date().getFullYear()} OTracker Royale
                </footer>
            </div>

            {/* Visual Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
    )
}
