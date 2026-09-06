"use client"

import Link from "next/link"
import { UserButton, ClerkLoading, useUser } from "@clerk/nextjs"

export function OnboardingHeader() {
    const { user, isLoaded } = useUser()
    const displayName = user?.firstName || "Account"

    return (
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100/80">
            <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center text-xl sm:text-2xl font-extrabold tracking-tight">
                    <span className="text-[#CE0003]">O</span>
                    <span className="text-[#191A43]">Tracker</span>
                </Link>

                <div className="flex items-center gap-3">
                    <ClerkLoading>
                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 rounded-full pl-3.5 pr-1.5 py-1">
                            <div className="h-3 w-14 bg-slate-200 rounded animate-pulse" />
                            <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                    </ClerkLoading>
                    {isLoaded && (
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-full pl-3.5 pr-1.5 py-1 transition-all shadow-sm">
                            <span className="text-xs font-semibold text-slate-700">
                                {displayName}
                            </span>
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8",
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
