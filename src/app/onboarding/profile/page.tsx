"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Camera, Loader2, Search, ChevronDown, Check, MapPin } from "lucide-react"
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
        
        // Initialize form data from existing organization / metadata
        if (formData.companyName === "") {
            setFormData({
                companyName: organization.name || "",
                contact: metadata?.contact || "",
                location: metadata?.location || "",
                email: metadata?.secondaryEmail || "",
                website: metadata?.website || ""
            })

            if (metadata?.contact) {
                const matchedCountry = COUNTRIES.find(c => metadata.contact.startsWith(c.code))
                if (matchedCountry) {
                    setCountryCode(matchedCountry.code)
                    setPhoneLocal(metadata.contact.replace(matchedCountry.code, "").trim())
                } else {
                    setPhoneLocal(metadata.contact.replace(/\D/g, ""))
                }
            }

            if (organization.imageUrl && !imagePreview) {
                setImagePreview(organization.imageUrl)
            }
        }

        // Only redirect to dashboard if subscription is ALREADY completed
        const subscriptionStatus = metadata?.subscriptionStatus as string
        const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
        const isEditing = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === 'true'

        if (isSubscribed && metadata?.location && metadata?.contact && !isEditing) {
            router.replace("/backoffice")
        }
    }, [isLoaded, organization, router, formData.companyName, imagePreview])

    if (!isLoaded) {
        return <AppLoader message="Loading profile..." />
    }

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
            subtitle="Add your business details. You can change these anytime in your backoffice."
            backUrl="/onboarding/business-type"
            backLabel="Back to Business Type"
        >
            <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>

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
                            "h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden relative group",
                            imagePreview
                                ? "border-[#191A43]/30 ring-2 ring-[#191A43]/10"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                        )}
                    >
                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Logo preview"
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-5 w-5 text-white" />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                <Camera className="h-6 w-6 stroke-[1.5]" />
                            </div>
                        )}
                    </button>
                    <span className="text-xs font-semibold text-slate-500 mt-2">
                        {imagePreview ? "Change Logo" : "Upload Business Logo"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                        PNG or JPG up to 5MB
                    </span>
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-xs sm:text-sm font-semibold text-slate-700">
                        Business Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="companyName"
                        name="companyName"
                        placeholder="e.g. Royal Stitch Tailors"
                        required
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className="h-11 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200"
                    />
                </div>

                {/* Contact Phone (International Selector) */}
                <div className="space-y-2">
                    <Label htmlFor="contact" className="text-xs sm:text-sm font-semibold text-slate-700">
                        Business Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                        {/* Country Code Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="h-11 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 shrink-0 text-sm font-medium cursor-pointer"
                            >
                                <span className="text-base leading-none">{selectedCountry.flag}</span>
                                <span className="text-xs text-slate-600 font-mono">{selectedCountry.code}</span>
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
                                    phoneLocal && isPhoneValid && "border-emerald-500 focus-visible:ring-emerald-500"
                                )}
                            />
                            {phoneLocal && isPhoneValid && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">✓</span>
                            )}
                        </div>
                    </div>
                    {phoneLocal && !isPhoneValid && (
                        <p className="text-[11px] text-red-500 mt-1">
                            Please enter a valid {selectedCountry.name} phone number ({selectedCountry.minLength} digits)
                        </p>
                    )}
                </div>

                {/* Location / Landmark */}
                <div className="space-y-2 relative" ref={locationDropdownRef}>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="location" className="text-xs sm:text-sm font-semibold text-slate-700">
                            Shop / Pickup Location <span className="text-red-500">*</span>
                        </Label>
                        {formData.location && isLocationValid && (
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" /> Validated
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            id="location"
                            name="location"
                            placeholder="e.g. Osu Oxford Street, near Danmorton House"
                            required
                            value={formData.location}
                            onChange={(e) => {
                                handleInputChange(e)
                                setIsLocationDropdownOpen(true)
                            }}
                            onFocus={() => setIsLocationDropdownOpen(true)}
                            className={cn(
                                "h-11 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200",
                                formData.location && !isLocationValid && "border-amber-400 focus-visible:ring-amber-400",
                                formData.location && isLocationValid && "border-emerald-500 focus-visible:ring-emerald-500"
                            )}
                        />
                    </div>

                    {/* Suggestions Dropdown */}
                    {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 p-1.5 rounded-xl shadow-lg border border-slate-100 bg-white z-50 animate-in fade-in-50 duration-150">
                            <p className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
                                Suggested areas:
                            </p>
                            {locationSuggestions.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, location: loc }))
                                        setIsLocationDropdownOpen(false)
                                    }}
                                    className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{loc}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {formData.location && !isLocationValid && locationValidation.reason && (
                        <p className="text-[11px] text-amber-600 mt-1">
                            {locationValidation.reason}
                        </p>
                    )}
                </div>

                {/* Optional Website */}
                <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs sm:text-sm font-semibold text-slate-700">
                        Website or Instagram URL <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🌐</span>
                        <Input
                            id="website"
                            name="website"
                            placeholder="https://www.instagram.com/yourbusiness"
                            value={formData.website}
                            onChange={handleInputChange}
                            className="h-11 pl-9 text-sm rounded-xl border-slate-200 bg-white focus-visible:ring-[#191A43] transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <Link
                        href="/onboarding/business-type"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-slate-200 transition-all duration-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Business Type
                    </Link>

                    <Button
                        type="submit"
                        disabled={isLoading || !isFormValid}
                        className={cn(
                            "w-full sm:w-auto h-12 sm:h-11 px-8 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                            isFormValid
                                ? "bg-[#191A43] hover:bg-[#25275e] text-white shadow-md shadow-[#191A43]/15"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100 shadow-none"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                Continue to Plans
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </OnboardingLayout>
    )
}
