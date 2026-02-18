"use client"

import { useState, useEffect } from "react"
import { getBusinessConfig } from "@/lib/business-configs"

export function Footer() {
    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    useEffect(() => {
        setBusinessType(localStorage.getItem("businessType"))
    }, [])

    return (
        <footer className="w-full py-12 px-6 mt-auto border-t border-slate-100 bg-white/50 backdrop-blur-sm">
            <div className="container mx-auto max-w-[1400px] flex flex-col items-center gap-4">
                <p className="text-slate-400 text-sm font-medium tracking-wide flex items-center gap-2">
                    &copy; {new Date().getFullYear()} <span style={{ color: config.theme.primary }} className="font-bold uppercase tracking-tight">OTracker</span>. All rights reserved.
                </p>
                <div className="h-px w-8 bg-slate-200" />
                <p className="text-[#191A43] opacity-100 text-[15px] font-semibold tracking-tight hover:opacity-80 transition-opacity cursor-default">
                    Made by <span className="text-[#CE0003] font-black">Angela Atswei Adjei</span>
                </p>
            </div>
        </footer>
    )
}
