"use client"

import Link from "next/link"
import { SignedIn, SignedOut, ClerkLoading, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function LandingNavbar() {

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 sm:py-6"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full px-4 sm:px-8 py-2.5 sm:py-3.5 box-border gap-2">
                <Link href="/" className="flex items-center gap-0 group shrink-0 transition-all">
                    <span className="text-[#CE0003] font-bold text-lg sm:text-2xl tracking-tighter">O</span>
                    <span className="text-[#191A43] font-bold text-lg sm:text-2xl tracking-tighter">Tracker</span>
                </Link>

                <div className="hidden lg:flex items-center gap-10 bg-slate-50/50 px-8 py-2.5 rounded-full border border-slate-100/50">
                    <Link href="/#features" className="text-sm font-bold text-slate-500 hover:text-[#191A43] transition-colors">Features</Link>
                    <Link href="/#pricing" className="text-sm font-bold text-slate-500 hover:text-[#191A43] transition-colors">Pricing</Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 min-w-[140px] justify-end">
                    <ClerkLoading>
                        <div className="h-10 sm:h-12 w-32 bg-slate-50 animate-pulse rounded-full" />
                    </ClerkLoading>
                    
                    <SignedIn>
                        <div className="flex items-center gap-3 sm:gap-5">
                            <Button asChild className="bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-full px-5 sm:px-8 h-10 sm:h-12 text-xs sm:text-sm font-bold shadow-lg shadow-[#191A43]/10 transition-all active:scale-95">
                                <Link href="/backoffice">
                                    Dashboard
                                </Link>
                            </Button>
                            <UserButton 
                                afterSignOutUrl="/" 
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8 sm:w-10 sm:h-10 shadow-md border-2 border-white transition-transform hover:scale-110"
                                    }
                                }}
                            />
                        </div>
                    </SignedIn>

                    <SignedOut>
                        <div className="flex items-center gap-2 sm:gap-6">
                            <Link href="/sign-in" className="text-xs sm:text-sm font-bold text-slate-600 hover:text-[#191A43] transition-colors whitespace-nowrap px-1">
                                Sign In
                            </Link>
                            <Link href="/sign-up">
                                <Button className="bg-[#CE0003] hover:bg-[#CE0003]/90 text-white rounded-full px-4 sm:px-8 h-10 sm:h-12 text-[10px] sm:text-sm font-bold shadow-lg shadow-[#CE0003]/10 transition-all active:scale-95">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </SignedOut>
                </div>
            </div>
        </motion.nav>
    )
}
