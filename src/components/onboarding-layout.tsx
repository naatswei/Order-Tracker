"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { OnboardingHeader } from "@/components/onboarding-header"

const STEPS = [
    { label: "Workspace", step: 1 },
    { label: "Business Type", step: 2 },
    { label: "Your Details", step: 3 },
    { label: "Choose Plan", step: 4 },
]

interface OnboardingLayoutProps {
    currentStep: 1 | 2 | 3 | 4
    title: string
    subtitle?: string
    children: React.ReactNode
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
    wide = false,
    centerHeader = false,
}: OnboardingLayoutProps) {
    return (
        <div className="min-h-screen bg-white bg-grid">
            <OnboardingHeader />

            {/* Step Progress Indicator */}
            <div className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                <div className="max-w-xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {STEPS.map((s, i) => {
                            const isComplete = currentStep > s.step
                            const isActive = currentStep === s.step
                            const isUpcoming = currentStep < s.step

                            return (
                                <div key={s.step} className="flex items-center gap-2 flex-1 last:flex-initial">
                                    {/* Step dot/number */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500",
                                                isComplete && "bg-emerald-500 text-white",
                                                isActive && "bg-[#191A43] text-white shadow-md shadow-[#191A43]/20",
                                                isUpcoming && "bg-slate-100 text-slate-400"
                                            )}
                                        >
                                            {isComplete ? (
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            ) : (
                                                s.step
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "text-xs font-medium hidden sm:block transition-colors duration-300",
                                                isActive && "text-[#191A43]",
                                                isComplete && "text-emerald-600",
                                                isUpcoming && "text-slate-400"
                                            )}
                                        >
                                            {s.label}
                                        </span>
                                    </div>

                                    {/* Connector line */}
                                    {i < STEPS.length - 1 && (
                                        <div className="flex-1 mx-2">
                                            <div
                                                className={cn(
                                                    "h-px w-full transition-all duration-500",
                                                    isComplete ? "bg-emerald-300" : "bg-slate-100"
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

            {/* Content */}
            <div className={cn(
                "mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20",
                wide ? "max-w-7xl" : "max-w-2xl"
            )}>
                {/* Title Section */}
                <div className={cn("mb-8 sm:mb-10 onboarding-fade-in", centerHeader && "text-center")}>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#191A43] tracking-tight mb-2">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className={cn(
                            "text-sm sm:text-base text-slate-500 leading-relaxed",
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
            </div>

            {/* Footer */}
            <div className="text-center pb-8 text-xs text-slate-300">
                &copy; {new Date().getFullYear()} OTracker
            </div>
        </div>
    )
}
