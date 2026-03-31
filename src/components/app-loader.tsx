"use client"

import { Loader2 } from "lucide-react"

interface AppLoaderProps {
    message?: string
}

export function AppLoader({ message = "Entering OTracker..." }: AppLoaderProps) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-red-100 animate-ping absolute inset-0" />
                <div className="w-16 h-16 rounded-full bg-white border border-red-100 flex items-center justify-center shadow-xl relative z-10 animate-revolve">
                    <span className="text-[#CE0003] font-black text-3xl">O</span>
                </div>
            </div>
            <p className="text-slate-400 font-bold animate-pulse tracking-[0.2em] uppercase text-[10px]">{message}</p>
        </div>
    )
}
