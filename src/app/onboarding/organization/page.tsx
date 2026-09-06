"use client"

import { OrganizationList, useOrganization, useOrganizationList, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"
import { AppLoader } from "@/components/app-loader"
import { OnboardingLayout } from "@/components/onboarding-layout"
import { ArrowRight, Building2 } from "lucide-react"

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

    if (!isLoaded || (organization && !isRestarting)) {
        return <AppLoader message="Loading your workspace..." />
    }

    const firstName = user?.firstName || ""

    return (
        <OnboardingLayout
            currentStep={1}
            title={firstName ? `Hey ${firstName}, let's create your workspace` : "Create your workspace"}
            subtitle="This is your team's home base for managing orders, inventory, and deliveries."
        >
            {/* Quick continue if an organization is already active */}
            {organization && isRestarting && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-600 font-medium">Currently Selected</p>
                            <p className="text-sm font-bold text-slate-800">{organization.name}</p>
                        </div>
                    </div>
                    <Link
                        href="/onboarding/business-type"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#191A43] hover:bg-[#25275e] text-white text-xs font-semibold shadow-xs transition-all"
                    >
                        Continue with this workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* Hint for returning users */}
            {membershipsLoaded && userMemberships.data && userMemberships.data.length > 0 && !isRestarting && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50/90 border border-amber-200/60 text-xs sm:text-sm text-amber-800 leading-relaxed flex items-center gap-2.5">
                    <span className="font-bold">Tip:</span> Use a unique name for each business to stay organized.
                </div>
            )}

            {/* Clerk Organization List Container */}
            <div className="w-full">
                <OrganizationList
                    hidePersonal={true}
                    afterCreateOrganizationUrl="/onboarding/business-type"
                    afterSelectOrganizationUrl="/onboarding/business-type"
                    appearance={{
                        elements: {
                            rootBox: "w-full max-w-full flex flex-col items-stretch",
                            cardBox: "w-full max-w-full shadow-none border-0",
                            card: "shadow-sm border border-slate-200/80 rounded-2xl bg-white p-4 sm:p-6 w-full max-w-full",
                            headerTitle: "text-base sm:text-lg font-bold text-[#191A43] tracking-tight",
                            headerSubtitle: "text-xs sm:text-sm text-slate-500 mt-0.5",
                            organizationListCreateOrganizationActionButton: "bg-[#191A43] hover:bg-[#25275e] text-white font-semibold text-xs sm:text-sm rounded-xl h-11 px-4 transition-all duration-200",
                            formButtonPrimary: "bg-[#191A43] hover:bg-[#25275e] text-white shadow-md shadow-[#191A43]/15 rounded-xl h-11 font-semibold text-xs sm:text-sm transition-all duration-200 w-full sm:w-auto",
                            formFieldInput: "h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-[#191A43]/10 focus:border-[#191A43] text-sm transition-all duration-200",
                            formFieldLabel: "text-xs sm:text-sm font-semibold text-slate-700",
                            organizationListPreviewButton: "rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-200",
                            organizationListPreviewMainIdentifier: "font-bold text-[#191A43] text-xs sm:text-sm",
                        },
                    }}
                />
            </div>

            <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-slate-400">
                You can always switch or add more business branches later.
            </p>
        </OnboardingLayout>
    )
}
