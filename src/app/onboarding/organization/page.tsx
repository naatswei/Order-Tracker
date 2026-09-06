"use client"

import { OrganizationList, useOrganization, useOrganizationList, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppLoader } from "@/components/app-loader"
import { OnboardingLayout } from "@/components/onboarding-layout"

export default function OrganizationSelectionPage() {
    const { organization, isLoaded } = useOrganization()
    const { user } = useUser()
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

    // Disable browser autofill on Clerk's organization name input
    useEffect(() => {
        const disableAutofill = () => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                if (input.placeholder === 'Organization name' || input.name === 'name') {
                    input.setAttribute('autocomplete', 'off');
                }
            });
        };

        disableAutofill();
        const interval = setInterval(disableAutofill, 500);
        return () => clearInterval(interval);
    }, []);


    if (!isLoaded || organization) {
        return <AppLoader message="Loading your workspace..." />
    }

    const firstName = user?.firstName || ""

    return (
        <OnboardingLayout
            currentStep={1}
            title={firstName ? `Hey ${firstName}, let\u2019s create your workspace` : "Create your workspace"}
            subtitle="This is your team\u2019s home base for managing orders, inventory, and customers."
        >
            {/* Hint for returning users */}
            {membershipsLoaded && userMemberships.data && userMemberships.data.length > 0 && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-100 text-sm text-amber-700 leading-relaxed">
                    <span className="font-semibold">Tip:</span> Use a unique name for each business to stay organized.
                </div>
            )}

            {/* Clerk Organization List — restyled */}
            <div className="w-full">
                <OrganizationList
                    hidePersonal={true}
                    afterCreateOrganizationUrl="/onboarding/business-type"
                    afterSelectOrganizationUrl="/onboarding/business-type"
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            card: "shadow-none border border-slate-150 rounded-2xl bg-white/80 backdrop-blur-sm w-full",
                            headerTitle: "text-base font-semibold text-[#191A43]",
                            headerSubtitle: "text-sm text-slate-500",
                            organizationListCreateOrganizationActionButton: "text-[#191A43] font-semibold",
                            formButtonPrimary: "bg-[#191A43] hover:bg-[#191A43]/90 text-white shadow-lg shadow-[#191A43]/10 rounded-xl h-11 font-semibold text-sm transition-all duration-200",
                            formFieldInput: "h-11 rounded-xl border-slate-200 bg-white focus:ring-[#191A43] focus:border-[#191A43] text-sm transition-all duration-200",
                            formFieldLabel: "text-sm font-medium text-slate-700",
                            organizationListPreviewButton: "rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200",
                            organizationListPreviewMainIdentifier: "font-semibold text-[#191A43]",
                        },
                    }}
                />
            </div>

            <p className="mt-10 text-center text-sm text-slate-400">
                You can always switch or add more businesses later.
            </p>
        </OnboardingLayout>
    )
}
