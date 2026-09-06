"use client"

import Link from "next/link"
import { UserButton, ClerkLoading, useUser } from "@clerk/nextjs"

export function OnboardingHeader() {
    const { user, isLoaded } = useUser()
    const displayName = user?.firstName || "Account"

    return (
        <header className="bg-white/85 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100/90 transition-all">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 h-14 sm:h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-1 text-xl sm:text-2xl font-black tracking-tight select-none">
                    <span className="text-[#CE0003] transition-transform hover:scale-105">O</span>
                    <span className="text-[#191A43]">Tracker</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <ClerkLoading>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-full pl-3 pr-1 py-1">
                            <div className="h-3 w-12 bg-slate-200 rounded animate-pulse hidden sm:block" />
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                    </ClerkLoading>
                    {isLoaded && (
                        <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/70 rounded-full pl-2.5 sm:pl-3.5 pr-1 py-1 transition-all shadow-xs">
                            <span className="text-xs font-semibold text-slate-700 hidden sm:inline max-w-[120px] truncate">
                                {displayName}
                            </span>
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-white shadow-xs",
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
