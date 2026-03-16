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
            if (organization) {
                // If we have an organization, absolutely let them in.
                // We don't check metadata here to avoid redirect loops.
                setIsChecking(false)
                return
            }

            // If no organization, try to auto-select
            const memberships = userMemberships.data
            if (memberships && memberships.length === 1 && setActive) {
                try {
                    await setActive({ organization: memberships[0].organization.id })
                    // Don't call setIsChecking(false) yet, let the next render with 'organization' do it
                    return
                } catch (e) {
                    console.error("Failed to auto-select organization", e)
                }
            }

            // If we've finished loading and still have no organization, send them to choose/create one
            if (pathname !== "/onboarding/organization") {
                router.replace("/onboarding/organization")
            }
        }

        checkOnboarding()
    }, [isLoaded, organization?.id, membershipsLoaded, router, pathname])

    if (!isLoaded || isChecking) {
        return <AppLoader message="Preparing your dashboard..." />
    }

    return <>{children}</>
}
