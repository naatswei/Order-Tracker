"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
    ArrowRight, 
    Shirt, 
    Warehouse, 
    Laptop, 
    LucideIcon, 
    Layers, 
    FileText, 
    TrendingUp, 
    Users, 
    Clock, 
    Calendar,
    Ship,
    MapPin,
    DollarSign,
    Percent,
    ShoppingBag,
    PackageCheck
} from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgBusinessType } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { SelectionCard } from "@/components/selection-card"
import { OnboardingHeader } from "@/components/onboarding-header"

interface BusinessType {
    id: string
    title: string
    description: string
    icon: LucideIcon
    colorTheme: "violet" | "gold" | "emerald" | "blue"
    tagline: string
}

// Custom Hair Icon
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
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
        <path d="M14 6c.5 0 .9.3.9.8v10.4c0 .5-.4.8-.9.8h-1.8c-.5 0-.9-.3-.9-.8V6.8c0-.5.4-.8.9-.8h1.8z" transform="rotate(-45 13.1 11.2)" />
        <path d="M18 6v9" transform="rotate(-45 18 10.5)" />
    </svg>
)

export default function BusinessTypePage() {
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [hoveredType, setHoveredType] = useState<string | null>(null)
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
            description: "Production pipelines, custom sizing, and tailor assignments.",
            icon: Shirt,
            colorTheme: "violet",
            tagline: "Stitch work order stages, oversee sewing benches, and hit delivery deadlines."
        },
        {
            id: "hair-retail",
            title: "Hair Retail Hub",
            description: "High-value bundles, reservation books, and retail status logs.",
            icon: HairIcon as unknown as LucideIcon,
            colorTheme: "gold",
            tagline: "Secure client wig reservations, auto-calculate lengths, and control high-value stock."
        },
        {
            id: "logistics",
            title: "Logistics Hub",
            description: "Supply chain milestones, waybills, and dispatch control.",
            icon: Warehouse,
            colorTheme: "emerald",
            tagline: "Monitor containers, clear cargo, track waybills, and dispatch drivers."
        },
        {
            id: "online-business",
            title: "Online Retail Hub",
            description: "Pre-orders, e-commerce drops, and client order logs.",
            icon: Laptop,
            colorTheme: "blue",
            tagline: "Organize digital drops, process custom pre-orders, and monitor customer packages."
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

    const activePreview = hoveredType || selectedType || "tailoring"

    // Dashboard Mockup Content Renderers
    const renderPreviewMockup = () => {
        switch (activePreview) {
            case "tailoring":
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full bg-[#13142e]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-5"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]" />
                                <span className="text-xs font-black text-white/90 uppercase tracking-widest">Tailoring Workflow Board</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-semibold bg-white/5 px-2 py-0.5 rounded-md">4 Orders Active</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">1. Cutting</div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 space-y-1.5 shadow-sm">
                                    <div className="text-[10px] font-black text-white/90">Kente Dress #482</div>
                                    <div className="text-[9px] text-white/45 flex items-center gap-1 font-semibold">
                                        <Users className="w-2.5 h-2.5 text-white/30" /> Yaw Mensah
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">2. Sewing</div>
                                <div className="bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-xl p-2.5 space-y-1.5 shadow-lg shadow-[#a78bfa]/5">
                                    <div className="text-[10px] font-black text-[#c084fc]">Satin Suit #481</div>
                                    <div className="text-[9px] text-[#e9d5ff] flex items-center gap-1 font-semibold">
                                        <Clock className="w-2.5 h-2.5 text-[#c084fc]/50" /> Sewing stage
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">3. Fitting</div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 space-y-1.5 opacity-60">
                                    <div className="text-[10px] font-black text-white/90">Lace Gown #479</div>
                                    <div className="text-[9px] text-white/40 font-semibold">Ready for test</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
            case "hair-retail":
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full bg-[#13142e]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                                <span className="text-xs font-black text-white/90 uppercase tracking-widest">Hair Stock Intelligence</span>
                            </div>
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Wig Catalog</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.04] transition-all">
                                <div>
                                    <h4 className="text-xs font-black text-white">Bone Straight (30")</h4>
                                    <p className="text-[10px] text-white/40 font-semibold mt-0.5">Category: Premium Double Drawn</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-amber-400">GH₵ 4,800</div>
                                    <div className="text-[9px] text-white/60 font-semibold">12 units available</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <div>
                                    <h4 className="text-xs font-black text-white">Peruvian Wavy Wig (24")</h4>
                                    <p className="text-[10px] text-white/40 font-semibold mt-0.5">Category: Lace Frontals</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-amber-400">GH₵ 3,200</div>
                                    <div className="text-[9px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/25">Low: 1 left</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
            case "logistics":
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full bg-[#13142e]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                                <span className="text-xs font-black text-white/90 uppercase tracking-widest">Global Logistics Route</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">Waybill Tracking</span>
                        </div>
                        <div className="relative pl-5 border-l border-white/10 space-y-4 py-1">
                            <div className="relative">
                                <div className="absolute -left-[25px] top-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                                <div className="text-xs font-black text-white">Accra Hub - Customs Cleared</div>
                                <div className="text-[9px] text-white/40 font-semibold">Today, 2:30 PM • Performing agent: K. Addo</div>
                            </div>
                            <div className="relative opacity-60">
                                <div className="absolute -left-[25px] top-0.5 w-2 h-2 rounded-full bg-blue-400" />
                                <div className="text-xs font-black text-white">Guangzhou Airport - Departed Port</div>
                                <div className="text-[9px] text-white/45 font-semibold">May 25, 10:15 AM • Flight ET902</div>
                            </div>
                        </div>
                    </motion.div>
                )
            case "online-business":
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full bg-[#13142e]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                                <span className="text-xs font-black text-white/90 uppercase tracking-widest">Storefront Insights</span>
                            </div>
                            <span className="text-[10px] text-white/50 font-semibold">Live Analytics</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">Total Sales</div>
                                <div className="text-lg font-black text-white mt-1">GH₵ 78,400</div>
                                <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
                                    <TrendingUp className="w-2.5 h-2.5" /> +14.2%
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">Conversion</div>
                                <div className="text-lg font-black text-white mt-1">4.65%</div>
                                <div className="text-[9px] text-blue-400 font-semibold mt-0.5">Avg Order: GH₵ 620</div>
                            </div>
                        </div>
                    </motion.div>
                )
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/20">
            <div className="lg:grid lg:grid-cols-12 min-h-screen">
                {/* Left Column - Showcase Mockups */}
                <div className="hidden lg:flex lg:col-span-5 relative bg-[#0b0c21] overflow-hidden flex-col justify-between p-12 shrink-0">
                    {/* Background Images with AnimatePresence */}
                    <div className="absolute inset-0 z-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePreview}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.25 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={
                                        activePreview === "tailoring"
                                            ? "/images/tailoring.jpg"
                                            : activePreview === "hair-retail"
                                            ? "/images/hair.jpg"
                                            : activePreview === "logistics"
                                            ? "/images/logistics.png"
                                            : "/images/online.jpg"
                                    }
                                    alt="Business showcase"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className="mix-blend-luminosity filter grayscale"
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0c21] via-[#0b0c21]/95 to-[#0b0c21]/70" />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Glowing Orbs background */}
                    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-600/5 blur-[100px] z-0" />
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-600/5 blur-[100px] z-0" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[120px] z-0" />

                    {/* Logo & Brand branding */}
                    <div className="relative z-10 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#3b82f6] flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30 text-sm">
                            O
                        </div>
                        <span className="font-black text-white text-lg tracking-tight uppercase">OTracker</span>
                    </div>

                    {/* Center Animated Preview panel */}
                    <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm mx-auto gap-6 my-auto">
                        <div className="w-full flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {renderPreviewMockup()}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Dynamic tagline matching active hover state */}
                    <div className="relative z-10 space-y-2 mt-auto">
                        <span className="text-[10px] font-black uppercase text-blue-400/80 tracking-[0.2em]">Operational Insight</span>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={activePreview}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className="text-white/80 font-bold leading-relaxed text-sm"
                            >
                                {businessTypes.find(t => t.id === activePreview)?.tagline}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Column - Selection list */}
                <div className="relative lg:col-span-7 flex flex-col min-h-screen bg-white">
                    <OnboardingHeader />

                    <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
                        <div className="max-w-xl mx-auto w-full">
                            <div className="mb-10 text-left">
                                <h1 className="text-2xl sm:text-3xl font-black text-[#191A43] tracking-tight mb-2.5">
                                    Select your Business Type
                                </h1>
                                <p className="text-xs sm:text-sm font-semibold text-slate-400 leading-relaxed uppercase tracking-wider">
                                    Choose the pipeline config that best aligns with your daily operations.
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
                                        colorTheme={type.colorTheme}
                                        selected={selectedType === type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        onMouseEnter={() => setHoveredType(type.id)}
                                        onMouseLeave={() => setHoveredType(null)}
                                    />
                                ))}
                            </div>

                            {/* Next Button wrapper */}
                            <div className="flex justify-end pt-2 border-t border-slate-50">
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
