"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    ArrowRight,
    Truck,
    ShoppingBag,
    LucideIcon,
    Loader2
} from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgBusinessType } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { OnboardingLayout } from "@/components/onboarding-layout"

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
        {/* Needle diagonal */}
        <path d="m5 19 14-14" />
        {/* Needle eye */}
        <circle cx="18" cy="6" r="1.5" />
        {/* Thread loop through eye */}
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
        {/* Tied bundle band at top */}
        <rect x="9" y="3" width="6" height="2.5" rx="0.5" fill="currentColor" />
        {/* Flowing wavy locks coming down */}
        <path d="M10 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
        <path d="M12 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
        <path d="M14 5.5c-1 3 1 7-1 11-1 3.5 0 5 1 7" />
    </svg>
)

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()

    useEffect(() => {
        if (!isLoaded) return
        if (!organization) {
            router.replace("/onboarding/organization")
            return
        }
        if (organization?.publicMetadata?.businessType) {
            router.replace("/onboarding/profile")
        }
    }, [isLoaded, organization, router])

    if (!isLoaded || organization?.publicMetadata?.businessType) {
        return <AppLoader message="Checking business setup..." />
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

    const handleNext = async () => {
        if (selectedType) {
            setIsLoading(true)
            try {
                if (organization?.id) {
                    await updateOrgBusinessType(organization.id, selectedType)
                }
                localStorage.setItem("businessType", selectedType)
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
            subtitle="We'll customize your dashboard and workflow to match."
        >
            {/* Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
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

            {/* Confirm Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                    onClick={handleNext}
                    disabled={!selectedType || isLoading}
                    className="w-full sm:w-auto bg-[#191A43] hover:bg-[#25275e] text-white h-12 sm:h-11 px-8 rounded-xl font-semibold text-sm shadow-md shadow-[#191A43]/15 transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
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
