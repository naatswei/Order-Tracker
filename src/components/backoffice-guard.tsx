"use client"

import { useOrganization } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function BackofficeGuard({ children }: { children: React.ReactNode }) {
    const { organization, isLoaded } = useOrganization()
    const router = useRouter()
    const pathname = usePathname()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        if (!isLoaded) return

        const checkOnboarding = async () => {
            if (!organization) {
                router.push("/onboarding/organization")
                return
            }

            const metadata = organization.publicMetadata as any

            // 1. Check Business Type
            if (!metadata.businessType) {
                router.push("/onboarding/business-type")
                return
            }

            // 2. Check Profile (Location/Contact)
            if (!metadata.location || !metadata.contact) {
                router.push("/onboarding/profile")
                return
            }

            // 3. Check Subscription
            const isSubscribed = metadata.subscriptionStatus === 'active' || metadata.subscriptionStatus === 'trialing'
            const expiryDate = metadata.subscriptionExpiry ? new Date(metadata.subscriptionExpiry) : null
            const isExpired = expiryDate ? new Date() > expiryDate : false

            if (!isSubscribed || isExpired) {
                router.push("/onboarding/subscription")
                return
            }

            setIsChecking(false)
        }

        checkOnboarding()
    }, [isLoaded, organization, router, pathname])

    if (!isLoaded || isChecking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-slate-500 font-medium">Preparing your dashboard...</p>
            </div>
        )
    }

    return <>{children}</>
}
