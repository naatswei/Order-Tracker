"use client"

import Link from "next/link"
import { OrganizationSwitcher, UserButton, useOrganizationList, ClerkLoading } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard } from "lucide-react"

export function OnboardingHeader() {
    const { userMemberships, isLoaded } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    const hasOtherOrgs = isLoaded && userMemberships.data && userMemberships.data.length > 1;

    return (
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-[0.5px] border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
            <div className="w-full px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center text-xl font-bold tracking-tight">
                    <span className="text-[#CE0003]">O</span>
                    <span className="text-[#191A43]">Tracker</span>
                </Link>

                <div className="flex items-center gap-4 min-w-[120px] justify-end">
                    <ClerkLoading>
                         <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                    </ClerkLoading>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full py-1 pr-1 pl-3 transition-colors hover:border-slate-300">
                        <OrganizationSwitcher
                            hidePersonal={true}
                            afterCreateOrganizationUrl="/onboarding/business-type"
                            afterSelectOrganizationUrl="/backoffice"
                            afterLeaveOrganizationUrl="/backoffice"
                            appearance={{
                                elements: {
                                    rootBox: "flex items-center",
                                    organizationSwitcherTrigger: "h-7 px-2 rounded-md bg-transparent hover:bg-slate-100 transition-all border-none shadow-none text-slate-700 focus:ring-0",
                                    organizationSwitcherPopoverCard: "z-[60]"
                                }
                            }}
                        />
                    </div>
                    
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </header>
    )
}
