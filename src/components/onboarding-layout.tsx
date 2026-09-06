"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Check, ArrowLeft } from "lucide-react"
import { OnboardingHeader } from "@/components/onboarding-header"

const STEPS = [
    { label: "Workspace", step: 1, href: "/onboarding/organization?restart=true" },
    { label: "Business Type", step: 2, href: "/onboarding/business-type" },
    { label: "Your Details", step: 3, href: "/onboarding/profile" },
    { label: "Choose Plan", step: 4, href: "/onboarding/subscription" },
]

interface OnboardingLayoutProps {
    currentStep: 1 | 2 | 3 | 4
    title: string
    subtitle?: string
    children: React.ReactNode
    /** Custom back URL, if not provided will use the previous step */
    backUrl?: string
    /** Custom back button label */
    backLabel?: string
    /** Use wider container (for pricing grid, etc.) */
    wide?: boolean
    /** Center align title and subtitle */
    centerHeader?: boolean
}

export function OnboardingLayout({
    currentStep,
    title,
    subtitle,
    children,
    backUrl,
    backLabel,
    wide = false,
    centerHeader = false,
}: OnboardingLayoutProps) {
    const router = useRouter()
    const currentStepObj = STEPS[currentStep - 1]

    // Determine default back URL based on current step
    const resolvedBackUrl = backUrl !== undefined 
        ? backUrl 
        : currentStep > 1 
            ? STEPS[currentStep - 2].href 
            : null

    const resolvedBackLabel = backLabel || (currentStep > 1 ? `Back to ${STEPS[currentStep - 2].label}` : "Back")

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 bg-grid selection:bg-[#191A43] selection:text-white flex flex-col justify-between">
            <div>
                <OnboardingHeader />

                {/* Step Progress Indicator Bar */}
                <div className="w-full border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-14 sm:top-16 z-40">
                    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                        {/* Mobile Stepper Header (< sm) */}
                        <div className="flex sm:hidden items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {resolvedBackUrl && (
                                    <Link
                                        href={resolvedBackUrl}
                                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors mr-1"
                                        aria-label="Go to previous step"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#191A43] text-white">
                                    Step {currentStep} of 4
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                    {currentStepObj.label}
                                </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400">
                                {Math.round((currentStep / 4) * 100)}% Complete
                            </span>
                        </div>

                        {/* Mobile Progress Track (< sm) */}
                        <div className="grid grid-cols-4 gap-1.5 sm:hidden">
                            {STEPS.map((s) => {
                                const isComplete = currentStep > s.step
                                const isActive = currentStep === s.step
                                const isAccessible = s.step <= currentStep

                                const bar = (
                                    <div
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-500",
                                            isComplete && "bg-emerald-500",
                                            isActive && "bg-[#191A43] ring-2 ring-[#191A43]/20",
                                            currentStep < s.step && "bg-slate-200/80"
                                        )}
                                    />
                                )

                                if (isAccessible && s.step !== currentStep) {
                                    return (
                                        <Link key={s.step} href={s.href} className="block cursor-pointer">
                                            {bar}
                                        </Link>
                                    )
                                }

                                return <div key={s.step}>{bar}</div>
                            })}
                        </div>

                        {/* Desktop Stepper (sm+) */}
                        <div className="hidden sm:flex items-center justify-between">
                            {STEPS.map((s, i) => {
                                const isComplete = currentStep > s.step
                                const isActive = currentStep === s.step
                                const isUpcoming = currentStep < s.step
                                const isAccessible = s.step <= currentStep

                                const stepContent = (
                                    <div className="flex items-center gap-2.5 shrink-0 group">
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                                                isComplete && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105",
                                                isActive && "bg-[#191A43] text-white shadow-md shadow-[#191A43]/25 ring-3 ring-[#191A43]/15",
                                                isUpcoming && "bg-slate-100 text-slate-400"
                                            )}
                                        >
                                            {isComplete ? (
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            ) : (
                                                s.step
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span
                                                className={cn(
                                                    "text-xs font-bold transition-colors duration-200",
                                                    isActive && "text-[#191A43]",
                                                    isComplete && "text-emerald-700 group-hover:text-emerald-800",
                                                    isUpcoming && "text-slate-400"
                                                )}
                                            >
                                                {s.label}
                                            </span>
                                        </div>
                                    </div>
                                )

                                return (
                                    <div key={s.step} className="flex items-center gap-2 flex-1 last:flex-initial">
                                        {isAccessible && s.step !== currentStep ? (
                                            <Link href={s.href} className="cursor-pointer">
                                                {stepContent}
                                            </Link>
                                        ) : (
                                            stepContent
                                        )}

                                        {/* Connector line */}
                                        {i < STEPS.length - 1 && (
                                            <div className="flex-1 mx-2">
                                                <div
                                                    className={cn(
                                                        "h-0.5 w-full rounded-full transition-all duration-500",
                                                        isComplete ? "bg-emerald-500" : "bg-slate-200"
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className={cn(
                    "mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-16 w-full",
                    wide ? "max-w-7xl" : "max-w-xl"
                )}>
                    {/* Back button navigation for desktop/tablet */}
                    {resolvedBackUrl && (
                        <div className="mb-4">
                            <Link
                                href={resolvedBackUrl}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#191A43] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 -ml-2"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>{resolvedBackLabel}</span>
                            </Link>
                        </div>
                    )}

                    {/* Title Section */}
                    <div className={cn("mb-6 sm:mb-8 onboarding-fade-in", centerHeader && "text-center")}>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#191A43] tracking-tight leading-tight mb-2">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className={cn(
                                "text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed font-normal",
                                wide ? "max-w-2xl" : "max-w-lg",
                                centerHeader && "mx-auto"
                            )}>
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Page Content */}
                    <div className="onboarding-fade-in" style={{ animationDelay: "80ms" }}>
                        {children}
                    </div>
                </main>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 text-[11px] sm:text-xs text-slate-400 border-t border-slate-100 bg-white/50">
                &copy; {new Date().getFullYear()} OTracker &bull; Ghana&apos;s #1 Order &amp; Delivery Management Platform
            </footer>
        </div>
    )
}
