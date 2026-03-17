"use client"

import { OrganizationList, useOrganization, SignOutButton, useOrganizationList } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppLoader } from "@/components/app-loader"
import { OnboardingHeader } from "@/components/onboarding-header"

export default function OrganizationSelectionPage() {
    const { organization, isLoaded } = useOrganization()
    const { userMemberships, isLoaded: membershipsLoaded, setActive } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const router = useRouter()
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isRestarting = searchParams?.get('restart') === 'true'

    useEffect(() => {
        if (!isLoaded || !membershipsLoaded) return

        // Only auto-redirect if NOT explicitly restarting/switching
        if (organization && !isRestarting) {
            router.replace("/onboarding/business-type")
            return
        }

        // Auto-select if they only have one organization AND NOT restarting
        const memberships = userMemberships.data
        if (memberships && memberships.length === 1 && setActive && !isRestarting) {
            const autoSelect = async () => {
                await setActive({ organization: memberships[0].organization.id })
                router.replace("/onboarding/business-type")
            }
            autoSelect()
        }
    }, [isLoaded, organization, membershipsLoaded, userMemberships.data, setActive, router, isRestarting])


    if (!isLoaded || organization) {
        return <AppLoader message="Loading your workspace..." />
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Standard Header */}
            <OnboardingHeader />

            <div className="flex flex-col items-center justify-center p-4 py-20">
                <div className="max-w-md w-full space-y-6 text-center mb-10">
                    <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                        Create your Business Account
                    </h1>
                    <p className="text-slate-500">
                        To start tracking orders, you need a business space. Create a new one or select an existing one below.
                    </p>

                    {membershipsLoaded && userMemberships.data && userMemberships.data.length > 0 && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left">
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">💡 Important Note</p>
                            <p className="text-sm text-amber-600 leading-relaxed">
                                Avoid using the same name for multiple businesses. Unique names help you and your customers stay organized!
                            </p>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-md flex justify-center">
                    <OrganizationList
                        hidePersonal={true}
                        afterCreateOrganizationUrl="/onboarding/business-type"
                        afterSelectOrganizationUrl="/onboarding/business-type"
                    />
                </div>

                <p className="mt-8 text-sm text-slate-400">
                    You can always switch or add more businesses later.
                </p>
            </div>
        </div>
    )
}
