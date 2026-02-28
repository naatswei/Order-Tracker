"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, Shirt, Sparkles, Warehouse, Laptop, LucideIcon, Loader2 } from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgBusinessType } from "@/app/actions/org-metadata"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { cn } from "@/lib/utils"

interface BusinessType {
    id: string
    title: string
    description: string
    icon: LucideIcon
}

// Custom Hair Icon component compatible with LucideIcon
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
        {/* Scissors */}
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />

        {/* Comb (angled to fit) */}
        <path d="M14 6c.5 0 .9.3.9.8v10.4c0 .5-.4.8-.9.8h-1.8c-.5 0-.9-.3-.9-.8V6.8c0-.5.4-.8.9-.8h1.8z" transform="rotate(-45 13.1 11.2)" />
        <path d="M18 6v9" transform="rotate(-45 18 10.5)" />
    </svg>
)

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()

    useEffect(() => {
        if (!isLoaded) return
        if (organization?.publicMetadata?.businessType) {
            router.replace("/onboarding/profile")
        }
    }, [isLoaded, organization, router])

    const businessTypes: BusinessType[] = [
        {
            id: "tailoring",
            title: "Tailoring",
            description: "Custom clothing and Production",
            icon: Shirt,
        },
        {
            id: "hair-retail",
            title: "Hair Retail",
            description: "Pre-orders and Delivery",
            icon: HairIcon as unknown as LucideIcon, // Cast directly to LucideIcon 
        },
        {
            id: "logistics",
            title: "Logistics",
            description: "Pre-orders and delivery",
            icon: Warehouse,
        },
        {
            id: "online-business",
            title: "Online Business",
            description: "E-commerce and Digital Services",
            icon: Laptop,
        },
    ]

    const handleNext = async () => {
        if (selectedType) {
            setIsLoading(true)
            try {
                // If the user is in an organization, save the business type to its metadata
                if (organization?.id) {
                    await updateOrgBusinessType(organization.id, selectedType)
                }

                // Store in localStorage as fallback/cache
                localStorage.setItem("businessType", selectedType)
                router.push("/onboarding/profile")
            } catch (error) {
                console.error("Failed to update business type:", error)
                // Even if metadata sync fails, we proceed with localStorage
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

                {/* Right Column - Business Type Selection */}
                <div className="relative lg:col-span-2 flex flex-col min-h-screen px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
                    {/* Header - Logo */}
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8 lg:right-12">
                        <div className="flex items-center text-xl font-bold tracking-tight">
                            <span className="text-red-600 font-black">O</span>
                            <span className="text-[#191A43] font-bold">Tracker</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full pt-20">
                        <div className="mb-12">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#191A43] mb-3">
                                Enter your Business Type
                            </h1>
                            <p className="text-base text-gray-400 font-medium">
                                Easy Order Entry, Real-Time Customer Update, Customer Transparency and Trust.
                            </p>
                        </div>

                        {/* Business Type Cards - 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-4">
                            {businessTypes.map((type) => (
                                <SelectionCard
                                    key={type.id}
                                    title={type.title}
                                    description={type.description}
                                    icon={type.icon}
                                    selected={selectedType === type.id}
                                    onClick={() => setSelectedType(type.id)}
                                />
                            ))}
                        </div>

                        {/* Next Button */}
                        <div className="flex justify-end mt-2">
                            <Button
                                onClick={handleNext}
                                disabled={!selectedType || isLoading}
                                className="bg-[#191A43] hover:bg-[#191A43]/90 text-white w-48 h-12 rounded-lg font-medium transition-all disabled:opacity-100 disabled:bg-gray-200 disabled:text-gray-400 text-base"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Next
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
