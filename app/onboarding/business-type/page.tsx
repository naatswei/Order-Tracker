"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, Shirt, Sparkles, Warehouse, Laptop, LucideIcon } from "lucide-react"

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
    const router = useRouter()

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
            id: "warehousing",
            title: "Warehousing",
            description: "Pre-orders and Logistics Services",
            icon: Warehouse,
        },
        {
            id: "online-business",
            title: "Online Business",
            description: "E-commerce and Digital Services",
            icon: Laptop,
        },
    ]

    const handleNext = () => {
        if (selectedType) {
            // Store the selection and navigate to profile setup
            localStorage.setItem("businessType", selectedType)
            router.push("/onboarding/profile")
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
                                src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1600&q=80"
                                alt="Tailoring shop"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 2: Warehouse */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&q=80"
                                alt="Warehouse logistics"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 3: Fashion/Wigs */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1595475207225-428b62bda831?w=1600&q=80"
                                alt="Hair retail"
                                fill
                                style={{ objectFit: 'cover' }}
                                className="opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Image 4: Delivery */}
                        <div className="relative h-1/4 w-full overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=1600&q=80"
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
                            <span className="text-[#191A43] font-bold uppercase ml-1"> - Tracker</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full pt-20">
                        <div className="mb-12">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#191A43] mb-3">
                                Enter your Business Type
                            </h1>
                            <p className="text-base text-gray-400 font-medium">
                                Easy Order Entry, Real-Time Customer Update, Customer Transparency and Trust.
                            </p>
                        </div>

                        {/* Business Type Cards - 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-6 mb-10">
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
                        <div className="flex justify-end mt-8">
                            <Button
                                onClick={handleNext}
                                disabled={!selectedType}
                                className="bg-[#191A43] hover:bg-[#191A43]/90 text-white px-8 h-12 rounded-lg font-medium transition-all disabled:opacity-50 text-base"
                            >
                                Next
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
