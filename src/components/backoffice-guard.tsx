"use client"

import { useOrganization, useOrganizationList } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AppLoader } from "@/components/app-loader"

export function BackofficeGuard({ children }: { children: React.ReactNode }) {
    const { organization, isLoaded } = useOrganization()
    const { userMemberships, isLoaded: membershipsLoaded, setActive } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const router = useRouter()
    const pathname = usePathname()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        if (!isLoaded || !membershipsLoaded) return

        const checkOnboarding = async () => {
            if (!organization) {
                // Auto-select if they only have one organization
                const memberships = userMemberships.data
                if (memberships && memberships.length === 1 && setActive) {
                    await setActive({ organization: memberships[0].organization.id })
                    // The component will re-render with the new organization, so we return here
                    return
                }

                router.replace("/onboarding/organization")
                return
            }


            const metadata = organization.publicMetadata as any

            // 1. Check Business Type
            if (!metadata.businessType) {
                router.replace("/onboarding/business-type")
                return
            }

            // 2. Check Profile (Location/Contact)
            if (!metadata.location || !metadata.contact) {
                router.replace("/onboarding/profile")
                return
            }

            // 3. Subscription Check
            // New users MUST at least start a trial or pick a plan before entering.
            // Returning users with expired subscriptions are still allowed (handled by banners).
            if (!metadata.subscriptionStatus) {
                router.replace("/onboarding/subscription")
                return
            }

            // If we've made it here, everything is good
            setIsChecking(false)
        }

        checkOnboarding()
    }, [isLoaded, organization, membershipsLoaded, router]) // Removed pathname to prevent re-checks on every nav

    if (!isLoaded || isChecking) {
        return <AppLoader message="Preparing your dashboard..." />
    }

    return <>{children}</>
}
