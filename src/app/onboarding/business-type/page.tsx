"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
    ArrowRight, 
    Truck, 
    ShoppingBag, 
    LucideIcon
} from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgBusinessType } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { OnboardingHeader } from "@/components/onboarding-header"

interface BusinessType {
    id: string
    title: string
    description: string
    icon: LucideIcon
    colorTheme: "violet" | "gold" | "emerald" | "blue"
    imageSrc: string
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
    const confirmButtonRef = useRef<HTMLDivElement>(null)

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
            imageSrc: "/images/tailoring.jpg",
        },
        {
            id: "hair-retail",
            title: "Hair Retail Hub",
            description: "Track hair bundles, wig bookings, and inventory levels.",
            icon: HairIcon as unknown as LucideIcon,
            colorTheme: "gold",
            imageSrc: "/images/hair.jpg",
        },
        {
            id: "logistics",
            title: "Logistics Hub",
            description: "Manage shipping waybills, deliveries, and driver assignments.",
            icon: Truck,
            colorTheme: "emerald",
            imageSrc: "/images/logistics.png",
        },
        {
            id: "online-business",
            title: "Online Retail Hub",
            description: "Manage online client orders, pre-orders, and shipping logs.",
            icon: ShoppingBag,
            colorTheme: "blue",
            imageSrc: "/images/online.jpg",
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
        <div className="min-h-screen bg-white">
            <div className="lg:grid lg:grid-cols-3 min-h-screen">
                {/* Left Column - Hero Images */}
                <div className="hidden lg:block lg:col-span-1 relative bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 flex flex-col">
                        {/* Image 1: Tailoring */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="/images/tailoring.jpg"
                                alt="Tailoring shop"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 2: Hair Retail */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="/images/hair.jpg"
                                alt="Hair retail"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 3: Logistics */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="/images/logistics.png"
                                alt="Logistics and Shipping"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 4: Online Business */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="/images/online.jpg"
                                alt="Delivery"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>
                    </div>
                </div>

                {/* Right Column - Selection list */}
                <div className="relative lg:col-span-2 flex flex-col min-h-screen bg-white">
                    <OnboardingHeader />

                    <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
                        <div className="max-w-xl mx-auto w-full">
                            <div className="mb-10 text-left">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191A43] tracking-tight mb-2.5">
                                    Select your business type
                                </h1>
                                <p className="text-sm sm:text-base font-normal text-slate-500 leading-relaxed">
                                    Choose the option that best fits your daily business setup.
                                </p>
                            </div>

                            {/* Selection Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {businessTypes.map((type) => (
                                    <SelectionCard
                                        key={type.id}
                                        title={type.title}
                                        description={type.description}
                                        icon={type.icon}
                                        imageSrc={type.imageSrc}
                                        colorTheme={type.colorTheme}
                                        selected={selectedType === type.id}
                                        onClick={() => {
                                            setSelectedType(type.id)
                                            setTimeout(() => {
                                                confirmButtonRef.current?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "nearest"
                                                })
                                            }, 100)
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Next Button wrapper */}
                            <div ref={confirmButtonRef} className="flex justify-end pt-2 border-t border-slate-50">
                                <Button
                                    onClick={handleNext}
                                    disabled={!selectedType || isLoading}
                                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 w-44 h-12 rounded-xl font-black uppercase tracking-wider text-xs transition-all duration-300 disabled:opacity-100 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    {isLoading ? (
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            Confirm
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
