"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Scissors, Store, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)

    const businessTypes = [
        {
            id: "tailor",
            title: "Tailoring Shop",
            description: "I run a tailoring shop with custom orders and measurements.",
            icon: Scissors,
        },
        {
            id: "boutique",
            title: "Fashion Boutique",
            description: "I sell ready-to-wear clothing and manage inventory.",
            icon: Store,
        },
        {
            id: "freelance",
            title: "Freelance Designer",
            description: "I create custom designs for individual clients.",
            icon: Briefcase,
        },
    ]

    return (
        <div className="min-h-screen bg-background">
            <div className="lg:grid lg:grid-cols-2 min-h-screen">
                {/* Left Column - Content */}
                <div className="relative flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-muted/30">
                    <div className="mx-auto w-full max-w-lg lg:w-[420px]">
                        <div className="flex items-center gap-2 mb-8 text-sm font-semibold tracking-wide uppercase">
                            <span className="text-red-600">0</span>
                            <span className="text-foreground">-</span>
                            <span className="text-foreground">Tracker</span>
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6 text-balance">
                            What business are you in?
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 leading-relaxed text-pretty">
                            We'll customize your experience based on your specific needs and workflow.
                        </p>

                        <div className="hidden lg:block">
                            {/* Decorative element or simplified visual could go here */}
                        </div>
                    </div>
                </div>

                {/* Right Column - Selection */}
                <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
                    <div className="mx-auto w-full max-w-lg lg:w-[480px]">
                        <div className="grid gap-4">
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

                        <div className="mt-8 flex items-center justify-end gap-4">
                            <Button
                                size="lg"
                                disabled={!selectedType}
                                className="w-full sm:w-auto min-w-[140px]"
                            >
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
