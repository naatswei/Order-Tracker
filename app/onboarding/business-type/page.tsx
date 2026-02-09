"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, Scissors, ShoppingBag, Warehouse, Globe, LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { cn } from "@/lib/utils"

interface BusinessType {
    id: string
    title: string
    description: string
    icon: LucideIcon
}

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const router = useRouter()

    const businessTypes: BusinessType[] = [
        {
            id: "tailoring",
            title: "Tailoring",
            description: "Custom clothing and Production",
            icon: Scissors,
        },
        {
            id: "hair-retail",
            title: "Hair Retail",
            description: "Pre-orders and Delivery",
            icon: ShoppingBag,
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
            icon: Globe,
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
            <div className="lg:grid lg:grid-cols-2 min-h-screen">
                {/* Left Column - Hero Images */}
                <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-2 p-4">
                        {/* Top-left: Tailoring shop - tall image */}
                        <div className="relative rounded-2xl overflow-hidden row-span-2">
                            <Image
                                src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80"
                                alt="Tailoring shop"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Top-right: Colorful wigs display */}
                        <div className="relative rounded-2xl overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1595475207225-428b62bda831?w=600&q=80"
                                alt="Hair retail wigs"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Middle-right: Fashion mannequins */}
                        <div className="relative rounded-2xl overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"
                                alt="Fashion mannequins"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Bottom-left: Warehouse */}
                        <div className="relative rounded-2xl overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80"
                                alt="Warehouse logistics"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Bottom-right: Delivery scooter */}
                        <div className="relative rounded-2xl overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=600&q=80"
                                alt="Delivery rider"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                    </div>
                </div>

                {/* Right Column - Business Type Selection */}
                <div className="relative flex flex-col min-h-screen px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
                    {/* Header - Logo */}
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8 lg:right-12">
                        <div className="flex items-center text-xl font-bold tracking-tight">
                            <span className="text-red-600">O</span>
                            <span className="text-[#191A43]">Tracker</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
                        <div className="mb-8">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#191A43] mb-3">
                                Enter your Business Type
                            </h1>
                            <p className="text-sm text-gray-500">
                                Easy Order Entry, Real-Time Customer Update, Customer Transparency and Trust.
                            </p>
                        </div>

                        {/* Business Type Cards - 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
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
                        <div className="flex justify-end">
                            <Button
                                onClick={handleNext}
                                disabled={!selectedType}
                                className="bg-[#191A43] hover:bg-[#191A43]/90 text-white px-8 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                            >
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
