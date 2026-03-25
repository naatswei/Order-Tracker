"use client"

import { useOrganization, useOrganizationList } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export function BackofficeGuard({ children }: { children: React.ReactNode }) {
    const { organization, isLoaded } = useOrganization()
    const { userMemberships, isLoaded: membershipsLoaded, setActive } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const router = useRouter()
    const pathname = usePathname()
    const [validatedOrgId, setValidatedOrgId] = useState<string | null>(null)

    useEffect(() => {
        if (!isLoaded || !membershipsLoaded) return

        const checkOnboarding = async () => {
            if (organization) {
                const metadata = organization.publicMetadata as any
                
                // 1. Check Business Type
                if (!metadata.businessType) {
                    router.replace("/onboarding/business-type")
                    return
                }

                // 2. Allow dashboard exploration even without subscription
                // The dashboard itself will show a banner and lock 'create' actions
                setValidatedOrgId(organization.id)
                return
            }

            // If no organization, try to auto-select
            const memberships = userMemberships.data
            if (memberships && memberships.length === 1 && setActive) {
                try {
                    await setActive({ organization: memberships[0].organization.id })
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
    }, [isLoaded, organization?.id, membershipsLoaded, router, pathname, setActive, userMemberships.data])

    // CRITICAL: Prevent dashboard content from flashing until the current organization has been validated
    if (!isLoaded || !membershipsLoaded || !organization || organization.id !== validatedOrgId) {
        return <DashboardSkeleton />
    }

    return <>{children}</>
}
