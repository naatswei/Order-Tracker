"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

export function LandingFooter() {
    const [year, setYear] = useState<number | null>(null)

    useEffect(() => {
        setYear(new Date().getFullYear())
    }, [])

    return (
        <footer className="bg-white border-t border-slate-100 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
                        <Link href="/terms" className="hover:text-[#191A43] transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-[#191A43] transition-colors">Privacy</Link>
                        <Link href="/return-policy" className="hover:text-[#191A43] transition-colors">Returns</Link>
                        <Link href="/shipping-policy" className="hover:text-[#191A43] transition-colors">Shipping</Link>
                    </div>

                    <div className="text-sm text-slate-400">
                        © {year} OTracker. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    )
}
