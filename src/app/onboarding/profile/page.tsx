"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Camera, Sparkles, Loader2 } from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgProfile } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { OnboardingHeader } from "@/components/onboarding-header"

const COUNTRIES = [
    { name: "Ghana", code: "+233", flag: "🇬🇭", minLength: 9, maxLength: 9, placeholder: "e.g. 54 870 6430" },
    { name: "Nigeria", code: "+234", flag: "🇳🇬", minLength: 10, maxLength: 10, placeholder: "e.g. 80 1234 5678" },
    { name: "United States", code: "+1", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "e.g. 202 555 0199" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", minLength: 10, maxLength: 10, placeholder: "e.g. 7911 123456" },
    { name: "Kenya", code: "+254", flag: "🇰🇪", minLength: 9, maxLength: 9, placeholder: "e.g. 712 345678" },
    { name: "South Africa", code: "+27", flag: "🇿🇦", minLength: 9, maxLength: 9, placeholder: "e.g. 82 123 4567" },
    { name: "Canada", code: "+1", flag: "🇨🇦", minLength: 10, maxLength: 10, placeholder: "e.g. 416 555 0199" },
];

export default function BusinessProfilePage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const [isLoading, setIsLoading] = useState(false)
    
    const [countryCode, setCountryCode] = useState("+233")
    const [phoneLocal, setPhoneLocal] = useState("")

    useEffect(() => {
        if (!isLoaded) return
        if (!organization) {
            router.replace("/onboarding/organization")
            return
        }
        const metadata = organization?.publicMetadata as any
        if (metadata?.location && metadata?.contact && metadata?.businessType) {
            router.replace("/backoffice")
        }
    }, [isLoaded, organization, router])

    if (!isLoaded || (organization?.publicMetadata as any)?.location) {
        return <AppLoader message="Syncing profile..." />
    }
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        companyName: "",
        contact: "",
        location: "",
        email: "",
        website: ""
    })

    useEffect(() => {
        if (isLoaded && organization && formData.companyName === "") {
            setFormData(prev => ({
                ...prev,
                companyName: organization.name
            }))
            if (organization.imageUrl && !imagePreview) {
                setImagePreview(organization.imageUrl)
            }
        }
    }, [isLoaded, organization, formData.companyName, imagePreview])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size must be less than 5MB")
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization) {
            alert("Please select or create an organization first.")
            return
        }

        setIsLoading(true)

        try {
            const cleanPhone = phoneLocal.replace(/^0+/, "").replace(/\D/g, "")
            const finalContact = `${countryCode} ${cleanPhone}`
            const finalPayload = { ...formData, contact: finalContact }

            await updateOrgProfile(organization.id, finalPayload)
            // Note: Logo upload to Clerk would typically happen via organization.setLogo()
            // but for parity with current flow, we'll keep the imagePreview in localStorage for local UI only
            // or we can rely on organization.imageUrl once it hits Clerk.
            localStorage.setItem("businessProfile", JSON.stringify({ ...finalPayload, imagePreview }))

            router.push("/onboarding/subscription")
        } catch (error) {
            console.error("Failed to update org profile", error)
            alert("Failed to save profile. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
    const cleanPhone = phoneLocal.replace(/^0+/, "").replace(/\D/g, "");
    const isPhoneValid = cleanPhone.length === selectedCountry.minLength;

    const isFormValid = formData.companyName.trim() !== "" &&
        isPhoneValid &&
        formData.location.trim() !== ""

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <OnboardingHeader />

            <div className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white py-12 px-6 shadow-sm border border-border/50 sm:rounded-2xl sm:px-12 backdrop-blur-sm bg-white/95">
                        <div className="mb-10 text-center">
                            <h1 className="text-3xl font-bold text-[#191A43] mb-3 tracking-tight">
                                Welcome to your Business Journey
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Let&apos;s set up your business profile in just a few steps.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100 animate-pulse">
                                <Sparkles className="w-3.5 h-3.5" />
                                We&apos;ve pre-filled some details from your business account
                            </div>
                        </div>

                        <form className="space-y-10" onSubmit={handleSubmit}>

                            {/* Business Logo Section */}
                            <div className="space-y-4">
                                <Label className="text-primary font-semibold text-base block">
                                    Business Logo
                                </Label>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg"
                                        onChange={handleImageUpload}
                                    />

                                    <div
                                        onClick={triggerFileInput}
                                        className={cn(
                                            "h-32 w-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden relative group shadow-sm",
                                            imagePreview
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50"
                                        )}
                                    >
                                        {imagePreview ? (
                                            <div className="w-full h-full relative">
                                                <img src={imagePreview} alt="Logo preview" className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="h-6 w-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-background rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                    <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">Upload</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-col gap-2">
                                            <h4 className="font-medium text-primary">Upload your logo</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                                                Recommended size: 512x512px. <br />
                                                Formats: PNG, JPG up to 5MB.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="text-primary border-border hover:bg-secondary hover:text-primary mt-2"
                                            onClick={triggerFileInput}
                                        >
                                            Choose File
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="border-t border-border/50 pt-6">
                                    <h3 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                                        Business Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                        {/* Company Name */}
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="companyName" className="text-primary font-medium">
                                                Company Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="companyName"
                                                name="companyName"
                                                placeholder="e.g. Acme Corporation"
                                                required
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                className="h-12 text-base border-input bg-background/50 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                                            />
                                        </div>

                                        {/* Company Contact */}
                                        <div className="space-y-2">
                                            <Label htmlFor="contact" className="text-primary font-medium">
                                                Contact Number <span className="text-destructive">*</span>
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="relative shrink-0">
                                                    <select
                                                        value={countryCode}
                                                        onChange={(e) => setCountryCode(e.target.value)}
                                                        className="h-12 px-3 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 cursor-pointer pr-8"
                                                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                                                    >
                                                        {COUNTRIES.map((c) => (
                                                            <option key={`${c.name}-${c.code}`} value={c.code} className="text-slate-800 bg-white">
                                                                {c.flag} {c.code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[8px]">
                                                        ▼
                                                    </div>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <Input
                                                        id="contact"
                                                        name="contact"
                                                        type="tel"
                                                        placeholder={selectedCountry.placeholder}
                                                        required
                                                        value={phoneLocal}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, "");
                                                            setPhoneLocal(val);
                                                        }}
                                                        className={cn(
                                                            "h-12 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200 pr-10",
                                                            phoneLocal && !isPhoneValid && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive",
                                                            phoneLocal && isPhoneValid && "border-emerald-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                                        )}
                                                    />
                                                    {phoneLocal && (
                                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none">
                                                            {isPhoneValid ? (
                                                                <span className="text-emerald-500 text-sm font-bold">✓</span>
                                                            ) : (
                                                                <span className="text-destructive text-sm font-bold">✗</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {phoneLocal && !isPhoneValid && (
                                                <p className="text-[10px] font-medium text-destructive mt-1.5 ml-1">
                                                    Please enter a valid subscriber number ({selectedCountry.minLength} digits).
                                                </p>
                                            )}
                                        </div>

                                        {/* Email Address */}
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-primary font-medium">
                                                Email Address
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="e.g. contact@acme.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="h-12 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200"
                                            />
                                        </div>

                                        {/* Location */}
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="location" className="text-primary font-medium">
                                                Location / Address <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="location"
                                                name="location"
                                                placeholder="e.g. 123 Business Avenue, Accra"
                                                required
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                className="h-12 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200"
                                            />
                                        </div>

                                        {/* Website URL */}
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="website" className="text-primary font-medium">
                                                Website URL <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm z-10 w-4 h-4 flex items-center justify-center">🌐</span>
                                                <Input
                                                    id="website"
                                                    name="website"
                                                    placeholder="https://www.yourbusiness.com"
                                                    value={formData.website}
                                                    onChange={handleInputChange}
                                                    className="h-12 pl-9 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                                <p className="text-sm text-muted-foreground hidden sm:block">
                                    Next: Dashboard Setup
                                </p>
                                <Button
                                    type="submit"
                                    disabled={isLoading || !isFormValid}
                                    className={cn(
                                        "min-w-[160px] h-12 text-base font-medium transition-all duration-300",
                                        isFormValid
                                            ? "bg-primary hover:bg-highlight text-white shadow-lg shadow-primary/20 hover:shadow-highlight/30 hover:-translate-y-0.5"
                                            : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                                    )}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        <>
                                            Complete Setup
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-sm text-muted-foreground/60">
                        &copy; {new Date().getFullYear()} OTracker. All rights reserved.
                    </div>
                </div>
            </div>
        </div >
    )
}
