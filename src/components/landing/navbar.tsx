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
            className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-3 sm:py-4"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-indigo-500/10 rounded-xl sm:rounded-2xl px-2.5 sm:px-6 py-2 sm:py-3 box-border gap-2">
                <Link href="/" className="flex items-center gap-0 group shrink-0 transition-all">
                    <span className="text-[#CE0003] font-bold text-lg sm:text-2xl tracking-tighter">O</span>
                    <span className="text-[#191A43] font-bold text-lg sm:text-2xl tracking-tighter">Tracker</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    {userId ? (
                        <>
                            <Button asChild className="bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-xl px-4 sm:px-6 h-9 sm:h-11 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95">
                                <Link href="/backoffice">
                                    Dashboard
                                </Link>
                            </Button>
                            <UserButton afterSignOutUrl="/" />
                        </>
                    ) : (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Link href="/sign-in" className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#191A43] transition-colors whitespace-nowrap px-1">
                                Sign In
                            </Link>
                            <Link href="/sign-up">
                                <Button className="bg-[#CE0003] hover:bg-[#CE0003]/90 text-white rounded-xl px-2.5 sm:px-6 h-8 sm:h-11 text-[10px] sm:text-sm font-semibold shadow-md transition-all active:scale-95">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </motion.nav>
    )
}
