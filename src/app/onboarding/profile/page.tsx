"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Camera, Sparkles, Loader2, Search, ChevronDown, Check, MapPin } from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgProfile } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"
import { validateLocation, getLocationSuggestions } from "@/lib/location-validator"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { OnboardingHeader } from "@/components/onboarding-header"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const COUNTRIES = [
    { name: "Ghana", code: "+233", flag: "🇬🇭", minLength: 9, maxLength: 9, placeholder: "e.g. 54 870 6430" },
    { name: "Nigeria", code: "+234", flag: "🇳🇬", minLength: 10, maxLength: 10, placeholder: "e.g. 80 1234 5678" },
    { name: "United States", code: "+1", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "e.g. 202 555 0199" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", minLength: 10, maxLength: 10, placeholder: "e.g. 7911 123456" },
    { name: "Kenya", code: "+254", flag: "🇰🇪", minLength: 9, maxLength: 9, placeholder: "e.g. 712 345678" },
    { name: "South Africa", code: "+27", flag: "🇿🇦", minLength: 9, maxLength: 9, placeholder: "e.g. 82 123 4567" },
    { name: "Canada", code: "+1", flag: "🇨🇦", minLength: 10, maxLength: 10, placeholder: "e.g. 416 555 0199" },
    { name: "Germany", code: "+49", flag: "🇩🇪", minLength: 10, maxLength: 11, placeholder: "e.g. 170 1234567" },
    { name: "France", code: "+33", flag: "🇫🇷", minLength: 9, maxLength: 9, placeholder: "e.g. 6 1234 5678" },
    { name: "India", code: "+91", flag: "🇮🇳", minLength: 10, maxLength: 10, placeholder: "e.g. 98765 43210" },
    { name: "China", code: "+86", flag: "🇨🇳", minLength: 11, maxLength: 11, placeholder: "e.g. 138 1234 5678" },
    { name: "Japan", code: "+81", flag: "🇯🇵", minLength: 10, maxLength: 10, placeholder: "e.g. 90 1234 5678" },
    { name: "Australia", code: "+61", flag: "🇦🇺", minLength: 9, maxLength: 9, placeholder: "e.g. 412 345 678" },
    { name: "Brazil", code: "+55", flag: "🇧🇷", minLength: 11, maxLength: 11, placeholder: "e.g. 11 98765 4321" },
    { name: "United Arab Emirates", code: "+971", flag: "🇦🇪", minLength: 9, maxLength: 9, placeholder: "e.g. 50 123 4567" },
    { name: "Saudi Arabia", code: "+966", flag: "🇸🇦", minLength: 9, maxLength: 9, placeholder: "e.g. 50 123 4567" },
    { name: "Singapore", code: "+65", flag: "🇸🇬", minLength: 8, maxLength: 8, placeholder: "e.g. 8123 4567" },
];

export default function BusinessProfilePage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const [isLoading, setIsLoading] = useState(false)
    
    const [countryCode, setCountryCode] = useState("+233")
    const [phoneLocal, setPhoneLocal] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false)
    const locationDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setIsLocationDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

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
    const isPhoneValid = cleanPhone.length >= selectedCountry.minLength && cleanPhone.length <= selectedCountry.maxLength;

    const locationValidation = validateLocation(formData.location, formData.companyName);
    const isLocationValid = locationValidation.isValid;
    const locationSuggestions = getLocationSuggestions(formData.location);

    const isFormValid = formData.companyName.trim() !== "" &&
        isPhoneValid &&
        isLocationValid;

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    )

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
                                                <div className="relative shrink-0" ref={dropdownRef}>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        className="h-12 px-4 rounded-xl border border-input bg-background/50 text-sm font-semibold flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer text-slate-800 dark:text-slate-200 shadow-sm"
                                                    >
                                                        <span className="text-lg leading-none">{selectedCountry.flag}</span>
                                                        <span>{selectedCountry.code}</span>
                                                        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                                                    </Button>
                                                    {isDropdownOpen && (
                                                        <div className="absolute left-0 mt-2 p-2 w-72 rounded-2xl shadow-xl border border-slate-100 bg-white z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                                                            <div className="flex items-center gap-2 px-2.5 pb-2 pt-1 border-b border-slate-100">
                                                                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search country or code..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    className="w-full bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70 text-slate-800"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="max-h-60 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar">
                                                                {filteredCountries.length > 0 ? (
                                                                    filteredCountries.map((c) => {
                                                                        const isSelected = c.code === countryCode && c.name === selectedCountry.name;
                                                                        return (
                                                                            <button
                                                                                key={`${c.name}-${c.code}`}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setCountryCode(c.code)
                                                                                    setPhoneLocal("")
                                                                                    setIsDropdownOpen(false)
                                                                                    setSearchQuery("")
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-150 cursor-pointer",
                                                                                    isSelected
                                                                                        ? "bg-slate-100 font-semibold text-slate-900"
                                                                                        : "hover:bg-slate-50 text-slate-700"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <span className="text-lg leading-none" role="img" aria-label={c.name}>{c.flag}</span>
                                                                                    <span className="truncate max-w-[130px] font-medium text-slate-800">{c.name}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                                    <span className="text-xs text-muted-foreground/80 font-mono">{c.code}</span>
                                                                                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="py-6 text-center text-xs text-muted-foreground">
                                                                        No countries found
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
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
                                                    Please enter a valid subscriber number ({selectedCountry.minLength === selectedCountry.maxLength ? `${selectedCountry.minLength}` : `${selectedCountry.minLength}-${selectedCountry.maxLength}`} digits).
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

                                        {/* Location / Address with Interactive Inspection & Suggestions */}
                                        <div className="space-y-2 md:col-span-2 relative" ref={locationDropdownRef}>
                                            <Label htmlFor="location" className="text-primary font-medium">
                                                Location / Address <span className="text-destructive">*</span>
                                            </Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                                <Input
                                                    id="location"
                                                    name="location"
                                                    placeholder="e.g. East Legon, Accra or 123 Business Avenue"
                                                    required
                                                    value={formData.location}
                                                    onChange={(e) => {
                                                        handleInputChange(e)
                                                        setIsLocationDropdownOpen(true)
                                                    }}
                                                    onFocus={() => setIsLocationDropdownOpen(true)}
                                                    className={cn(
                                                        "h-12 pl-10 pr-10 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200",
                                                        formData.location && !isLocationValid && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive",
                                                        formData.location && isLocationValid && "border-emerald-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                                    )}
                                                />
                                                {formData.location && (
                                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none">
                                                        {isLocationValid ? (
                                                            <span className="text-emerald-500 text-sm font-bold">✓</span>
                                                        ) : (
                                                            <span className="text-destructive text-sm font-bold">✗</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Location Auto-Suggest Dropdown */}
                                            {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 p-2 rounded-2xl shadow-xl border border-slate-100 bg-white z-50 animate-in fade-in-50 slide-in-from-top-1 max-h-56 overflow-y-auto custom-scrollbar">
                                                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Recognized Locations & Hubs
                                                    </div>
                                                    {locationSuggestions.map((loc) => (
                                                        <button
                                                            key={loc}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, location: loc }))
                                                                setIsLocationDropdownOpen(false)
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                            <span>{loc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Error reason text when invalid */}
                                            {formData.location && !isLocationValid && locationValidation.reason && (
                                                <p className="text-[10px] font-medium text-destructive mt-1.5 ml-1">
                                                    {locationValidation.reason}
                                                </p>
                                            )}
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
