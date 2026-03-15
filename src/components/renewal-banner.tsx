"use client"

import { useOrganization } from "@clerk/nextjs"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export function RenewalBanner() {
    const { organization, isLoaded } = useOrganization()
    const [daysLeft, setDaysLeft] = useState<number | null>(null)
    const [isFreeTrial, setIsFreeTrial] = useState(false)

    useEffect(() => {
        if (!isLoaded || !organization) return

        const planName = organization.publicMetadata?.subscriptionPlan as string
        setIsFreeTrial(planName === "Free Trial")

        const expiryDateStr = organization.publicMetadata?.subscriptionExpiry as string
        if (!expiryDateStr) return

        const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null
        const now = new Date()

        if (expiryDate) {
            const diffTime = expiryDate.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays <= 3) {
                setDaysLeft(diffDays)
            } else {
                setDaysLeft(null)
            }
        } else {
            // No expiry date means no subscription ever started or setup error
            setDaysLeft(-1) // Special value for 'No Subscription'
        }
    }, [isLoaded, organization])

    if (daysLeft === null && isLoaded) return null

    return (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 sticky top-0 z-[60]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                        {daysLeft === -1 
                            ? "An active subscription is required to use all OTracker features." 
                            : daysLeft < 0 
                                ? (isFreeTrial ? "Your free trial has expired." : "Your subscription has expired.")
                                : isFreeTrial
                                    ? (daysLeft === 0 ? "Your free trial expires today!" : `Your free trial expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`)
                                    : (daysLeft === 0 ? "Your subscription expires today!" : `Your subscription expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`)
                        }
                    </span>
                </div>
                <Link href="/onboarding/subscription">
                    <button className="flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 transition-colors tracking-wider uppercase">
                        {isFreeTrial ? "Upgrade Now" : "Renew Now"} <ArrowRight className="w-3 h-3" />
                    </button>
                </Link>
            </div>
        </div>
    )
}
