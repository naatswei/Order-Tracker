"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowRight,
    ArrowLeft,
    Truck,
    ShoppingBag,
    LucideIcon,
    Loader2,
    UtensilsCrossed,
    Ship,
    Check
} from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgBusinessType, LogisticsSubType } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { OnboardingLayout } from "@/components/onboarding-layout"
import { cn } from "@/lib/utils"

interface BusinessType {
    id: string
    title: string
    description: string
    icon: LucideIcon
    colorTheme: "violet" | "gold" | "emerald" | "blue"
}

// Custom Tailoring Needle & Thread Icon
const TailoringIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="m5 19 14-14" />
        <circle cx="18" cy="6" r="1.5" />
        <path d="M18 6c2-2 4 1 2 3-3 3-8 8-8 8s-2 2-4 1" />
    </svg>
)

// Custom Hair Bundle Icon
const HairIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <rect x="9" y="3" width="6" height="2.5" rx="0.5" fill="currentColor" />
        <path d="M10 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
        <path d="M12 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
        <path d="M14 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
    </svg>
)

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [selectedLogisticsType, setSelectedLogisticsType] = useState<LogisticsSubType>("restaurant")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()

    useEffect(() => {
        if (!isLoaded) return
        if (!organization) {
            router.replace("/onboarding/organization")
            return
        }
        
        // Pre-select saved business type if available
        const savedType = (organization?.publicMetadata?.businessType as string) || (typeof window !== 'undefined' ? localStorage.getItem("businessType") : null)
        const savedLogistics = (organization?.publicMetadata?.logisticsType as LogisticsSubType) || (typeof window !== 'undefined' ? (localStorage.getItem("logisticsType") as LogisticsSubType) : null)
        
        if (savedType && !selectedType) {
            setSelectedType(savedType)
        }
        if (savedLogistics) {
            setSelectedLogisticsType(savedLogistics)
        }
    }, [isLoaded, organization, router, selectedType])

    if (!isLoaded) {
        return <AppLoader message="Loading business types..." />
    }

    const businessTypes: BusinessType[] = [
        {
            id: "tailoring",
            title: "Tailoring Hub",
            description: "Track clothing orders, customer sizing, and assign tailors.",
            icon: TailoringIcon as unknown as LucideIcon,
            colorTheme: "violet",
        },
        {
            id: "hair-retail",
            title: "Hair Retail Hub",
            description: "Track hair bundles, wig bookings, and inventory levels.",
            icon: HairIcon as unknown as LucideIcon,
            colorTheme: "gold",
        },
        {
            id: "logistics",
            title: "Logistics Hub",
            description: "Manage shipping waybills, deliveries, and driver assignments.",
            icon: Truck,
            colorTheme: "emerald",
        },
        {
            id: "online-business",
            title: "Online Retail Hub",
            description: "Manage online client orders, pre-orders, and shipping logs.",
            icon: ShoppingBag,
            colorTheme: "blue",
        },
    ]

    const logisticsSubtypes: { id: LogisticsSubType; title: string; desc: string; icon: LucideIcon }[] = [
        {
            id: "restaurant",
            title: "Restaurant Delivery",
            desc: "Food orders, kitchen menu items, and rider dispatch",
            icon: UtensilsCrossed
        },
        {
            id: "delivery",
            title: "Courier Service",
            desc: "Package delivery, dispatch hubs, and waybill tracking",
            icon: Truck
        },
        {
            id: "shipping",
            title: "Freight & Shipping",
            desc: "Port origin terminals, customs fees, and kg rates",
            icon: Ship
        }
    ]

    const handleNext = async () => {
        if (selectedType) {
            setIsLoading(true)
            try {
                const subType = selectedType === "logistics" ? selectedLogisticsType : undefined
                if (organization?.id) {
                    await updateOrgBusinessType(organization.id, selectedType, subType)
                }
                localStorage.setItem("businessType", selectedType)
                if (selectedType === "logistics" && subType) {
                    localStorage.setItem("logisticsType", subType)
                }
                router.push("/onboarding/profile")
            } catch (error) {
                console.error("Failed to update business type:", error)
                router.push("/onboarding/profile")
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <OnboardingLayout
            currentStep={2}
            title="What type of business do you run?"
            subtitle="We'll customize your dashboard and workflow to match your industry."
            backUrl="/onboarding/organization"
        >
            {/* Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                {businessTypes.map((type) => (
                    <SelectionCard
                        key={type.id}
                        title={type.title}
                        description={type.description}
                        icon={type.icon}
                        colorTheme={type.colorTheme}
                        selected={selectedType === type.id}
                        onClick={() => setSelectedType(type.id)}
                    />
                ))}
            </div>

            {/* If Logistics Hub is selected, pick the exact 1 operational model */}
            {selectedType === "logistics" && (
                <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in-50 duration-200">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Select your logistics operational model</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Select the single workflow that matches your daily operations.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {logisticsSubtypes.map((sub) => {
                            const Icon = sub.icon
                            const isSelected = selectedLogisticsType === sub.id
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setSelectedLogisticsType(sub.id)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 relative bg-white",
                                        isSelected
                                            ? "border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs"
                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center border",
                                            isSelected ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-600 border-slate-200"
                                        )}>
                                            <Icon className="w-4.5 h-4.5" />
                                        </div>
                                        {isSelected && (
                                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                                <Check className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs sm:text-sm font-bold text-slate-900">{sub.title}</div>
                                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{sub.desc}</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                    onClick={handleNext}
                    disabled={!selectedType || isLoading}
                    className="w-full sm:w-auto bg-[#191A43] hover:bg-[#25275e] text-white h-12 sm:h-11 px-8 rounded-xl font-semibold text-sm shadow-md shadow-[#191A43]/15 transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none cursor-pointer ml-auto"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            Continue
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    )}
                </Button>
            </div>
        </OnboardingLayout>
    )
}
