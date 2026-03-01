"use client"

import { OrganizationList, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function OrganizationSelectionPage() {
    const { organization, isLoaded } = useOrganization()
    const router = useRouter()

    useEffect(() => {
        if (isLoaded && organization) {
            // If they already have an org selected, let BackofficeGuard handle routing
            router.replace("/backoffice")
        }
    }, [isLoaded, organization, router])

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Standard Header */}
            <header className="bg-white sticky top-0 z-50">
                <div className="w-full px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center text-xl font-bold tracking-tight">
                        <span className="text-red-600 font-black">O</span>
                        <span className="text-[#191A43] font-bold">Tracker</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-col items-center justify-center p-4 py-20">
                <div className="max-w-md w-full space-y-8 text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#191A43]">
                        Create your Business Account
                    </h1>
                    <p className="text-slate-500">
                        To start tracking orders, you need a business space. Create a new one or select an existing one below.
                    </p>
                </div>

                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-2 border border-slate-200">
                    <OrganizationList
                        hidePersonal
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
