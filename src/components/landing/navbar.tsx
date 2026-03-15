"use client"

import Link from "next/link"
import { useAuth, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function LandingNavbar() {
    const { userId } = useAuth()

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-indigo-500/10 rounded-2xl px-4 md:px-6 py-2.5 md:py-3 box-border">
                <Link href="/" className="flex items-center gap-0 group shrink-0">
                    <span className="text-[#CE0003] font-bold text-xl md:text-2xl tracking-tighter">O</span>
                    <span className="text-[#191A43] font-bold text-xl md:text-2xl tracking-tighter">Tracker</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-slate-600 hover:text-[#191A43] font-medium transition-colors">Features</Link>
                    <Link href="#pricing" className="text-slate-600 hover:text-[#191A43] font-medium transition-colors">Pricing</Link>
                </div>

                <div className="flex items-center gap-4">
                    {userId ? (
                        <>
                            <Link href="/backoffice">
                                <Button className="bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-xl px-6 font-semibold shadow-md transition-all active:scale-95">
                                    Dashboard
                                </Button>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </>
                    ) : (
                        <>
                            <Link href="/sign-in">
                                <Button variant="ghost" className="text-slate-600 font-semibold hover:bg-slate-100 rounded-xl px-6">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button className="bg-[#CE0003] hover:bg-[#CE0003]/90 text-white rounded-xl px-6 font-semibold shadow-md transition-all active:scale-95">
                                    Get Started
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </motion.nav>
    )
}
