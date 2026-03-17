"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface RenewalBannerProps {
    status: 'inactive' | 'expired' | 'trial_ended'
}

export function RenewalBanner({ status }: RenewalBannerProps) {
    const messages = {
        inactive: "Your organization needs an active plan to continue creating orders.",
        expired: "Your subscription has expired. Please renew to restore full access.",
        trial_ended: "Your free trial has ended. Choose a plan to continue growing."
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#191A43] text-white py-3 px-4 sm:px-6 relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white/90">
                        {messages[status]}
                    </p>
                </div>
                
                <Link href="/onboarding/subscription">
                    <Button size="sm" className="bg-[#CE0003] hover:bg-[#CE0003]/90 text-white border-none rounded-full px-6 h-9 font-bold shadow-lg transition-all active:scale-95">
                        Renew Now <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                </Link>
            </div>
            
            {/* Ambient Background Element */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
        </motion.div>
    )
}
