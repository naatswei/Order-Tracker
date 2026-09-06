"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Camera, Loader2, Search, ChevronDown, Check, MapPin } from "lucide-react"
import { useOrganization } from "@clerk/nextjs"
import { updateOrgProfile } from "@/app/actions/org-metadata"
import { AppLoader } from "@/components/app-loader"
import { validateLocation, getLocationSuggestions } from "@/lib/location-validator"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { OnboardingLayout } from "@/components/onboarding-layout"

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
        <OnboardingLayout
            currentStep={3}
            title="Set up your profile"
            subtitle="Add your business details. You can change these anytime."
        >
            <form className="space-y-8" onSubmit={handleSubmit}>

                {/* Logo Upload — Centered circle */}
                <div className="flex flex-col items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handleImageUpload}
                    />

                    <button
                        type="button"
                        onClick={triggerFileInput}
                        className={cn(
                            "h-24 w-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden relative group",
                            imagePreview
                                ? "border-[#191A43]/30 ring-2 ring-[#191A43]/10"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                        )}
                    >
                        {imagePreview ? (
                            <div className="w-full h-full relative">
                                <img src={imagePreview} alt="Logo preview" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                    <Camera className="h-5 w-5 text-white drop-shadow-md" />
                                </div>
                            </div>
                        ) : (
                            <Camera className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Upload logo (optional)</p>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                        Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="companyName"
                        name="companyName"
                        placeholder="e.g. Acme Corporation"
                        required
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className="h-11 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] focus-visible:border-[#191A43] transition-all duration-200"
                    />
                </div>

                {/* Phone + Email — side by side on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Contact Number */}
                    <div className="space-y-2">
                        <Label htmlFor="contact" className="text-sm font-medium text-slate-700">
                            Contact Number <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative shrink-0" ref={dropdownRef}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="h-11 px-3 rounded-xl border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-all duration-200 cursor-pointer text-slate-700"
                                >
                                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                                    <span className="text-xs">{selectedCountry.code}</span>
                                    <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                                </Button>
                                {isDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 p-1.5 w-64 rounded-xl shadow-xl border border-slate-100 bg-white z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                                        <div className="flex items-center gap-2 px-2.5 pb-2 pt-1 border-b border-slate-100">
                                            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <input
                                                type="text"
                                                placeholder="Search country..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none placeholder:text-slate-400 text-slate-800"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-52 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar">
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
                                                                "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-sm transition-all duration-150 cursor-pointer",
                                                                isSelected
                                                                    ? "bg-slate-100 font-semibold text-slate-900"
                                                                    : "hover:bg-slate-50 text-slate-700"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base leading-none">{c.flag}</span>
                                                                <span className="truncate max-w-[120px] text-sm">{c.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="text-xs text-slate-400 font-mono">{c.code}</span>
                                                                {isSelected && <Check className="h-3.5 w-3.5 text-[#191A43] shrink-0" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="py-4 text-center text-xs text-slate-400">
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
                                        "h-11 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200 pr-8",
                                        phoneLocal && !isPhoneValid && "border-red-400 focus-visible:ring-red-400",
                                        phoneLocal && isPhoneValid && "border-emerald-400 focus-visible:ring-emerald-400"
                                    )}
                                />
                                {phoneLocal && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {isPhoneValid ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                            <span className="text-red-400 text-xs font-bold">✗</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {phoneLocal && !isPhoneValid && (
                            <p className="text-xs text-red-500 mt-1">
                                Enter a valid number ({selectedCountry.minLength === selectedCountry.maxLength ? `${selectedCountry.minLength}` : `${selectedCountry.minLength}-${selectedCountry.maxLength}`} digits).
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="e.g. contact@acme.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="h-11 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Location */}
                <div className="space-y-2 relative" ref={locationDropdownRef}>
                    <Label htmlFor="location" className="text-sm font-medium text-slate-700">
                        Location / Address <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                        <Input
                            id="location"
                            name="location"
                            placeholder="e.g. East Legon, Accra"
                            required
                            value={formData.location}
                            onChange={(e) => {
                                handleInputChange(e)
                                setIsLocationDropdownOpen(true)
                            }}
                            onFocus={() => setIsLocationDropdownOpen(true)}
                            className={cn(
                                "h-11 pl-10 pr-8 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200",
                                formData.location && !isLocationValid && "border-red-400 focus-visible:ring-red-400",
                                formData.location && isLocationValid && "border-emerald-400 focus-visible:ring-emerald-400"
                            )}
                        />
                        {formData.location && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {isLocationValid ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                    <span className="text-red-400 text-xs font-bold">✗</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Location Suggestions */}
                    {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 p-1.5 rounded-xl shadow-xl border border-slate-100 bg-white z-50 animate-in fade-in-50 slide-in-from-top-1 max-h-48 overflow-y-auto custom-scrollbar">
                            <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Suggestions
                            </div>
                            {locationSuggestions.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, location: loc }))
                                        setIsLocationDropdownOpen(false)
                                    }}
                                    className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{loc}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {formData.location && !isLocationValid && locationValidation.reason && (
                        <p className="text-xs text-red-500 mt-1">
                            {locationValidation.reason}
                        </p>
                    )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-slate-700">
                        Website URL <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🌐</span>
                        <Input
                            id="website"
                            name="website"
                            placeholder="https://www.yourbusiness.com"
                            value={formData.website}
                            onChange={handleInputChange}
                            className="h-11 pl-9 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 hidden sm:block">
                        Next: Choose your plan
                    </p>
                    <Button
                        type="submit"
                        disabled={isLoading || !isFormValid}
                        className={cn(
                            "w-full sm:w-auto h-12 sm:h-11 px-8 rounded-xl text-sm font-semibold transition-all duration-200 sm:ml-auto cursor-pointer",
                            isFormValid
                                ? "bg-[#191A43] hover:bg-[#25275e] text-white shadow-md shadow-[#191A43]/15"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100 shadow-none"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                Complete Setup
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </OnboardingLayout>
    )
}
