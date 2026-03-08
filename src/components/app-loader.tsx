"use client"

import { Loader2 } from "lucide-react"

interface AppLoaderProps {
    message?: string
}

export function AppLoader({ message = "Entering OTracker..." }: AppLoaderProps) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-[#191A43] animate-spin opacity-80" />
            <p className="text-slate-400 font-medium animate-pulse tracking-wide">{message}</p>
        </div>
    )
}
