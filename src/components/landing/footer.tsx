"use client"

import Link from "next/link"

export function LandingFooter() {
    return (
        <footer className="bg-white border-t border-slate-100 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-0">
                        <span className="text-[#CE0003] font-black text-lg tracking-tight">O</span>
                        <span className="text-[#191A43] font-black text-lg tracking-tight">Tracker</span>
                    </div>

                    <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
                        <Link href="#features" className="hover:text-[#191A43] transition-colors">Features</Link>
                        <Link href="#pricing" className="hover:text-[#191A43] transition-colors">Pricing</Link>
                        <Link href="/terms" className="hover:text-[#191A43] transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-[#191A43] transition-colors">Privacy</Link>
                    </div>

                    <div className="text-sm text-slate-400">
                        © {new Date().getFullYear()} OTracker. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    )
}
