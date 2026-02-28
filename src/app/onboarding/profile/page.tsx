"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Camera } from "lucide-react"
import { useOrganization, SignOutButton } from "@clerk/nextjs"
import { updateOrgProfile } from "@/app/actions/org-metadata"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function BusinessProfilePage() {
    const router = useRouter()
    const { organization, isLoaded } = useOrganization()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!isLoaded) return
        const metadata = organization?.publicMetadata as any
        if (metadata?.location && metadata?.contact) {
            router.replace("/onboarding/subscription")
        }
    }, [isLoaded, organization, router])
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        companyName: "",
        contact: "",
        location: "",
        email: "",
        website: ""
    })

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
            await updateOrgProfile(organization.id, formData)
            // Note: Logo upload to Clerk would typically happen via organization.setLogo()
            // but for parity with current flow, we'll keep the imagePreview in localStorage for local UI only
            // or we can rely on organization.imageUrl once it hits Clerk.
            localStorage.setItem("businessProfile", JSON.stringify({ ...formData, imagePreview }))

            router.push("/onboarding/subscription")
        } catch (error) {
            console.error("Failed to update org profile", error)
            alert("Failed to save profile. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const isFormValid = formData.companyName.trim() !== "" &&
        formData.contact.trim() !== "" &&
        formData.location.trim() !== ""

    return (
                        </h1 >
        <p className="text-muted-foreground text-lg">
            Let&apos;s set up your business profile in just a few steps.
        </p>
                    </div >

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
                            <Input
                                id="contact"
                                name="contact"
                                placeholder="e.g. 054 870 64301"
                                required
                                value={formData.contact}
                                onChange={handleInputChange}
                                className="h-12 border-input bg-background/50 focus-visible:ring-primary transition-all duration-200"
                            />
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
                </div >

        <div className="mt-8 text-center text-sm text-muted-foreground/60">
            &copy; {new Date().getFullYear()} OTracker. All rights reserved.
        </div>
            </div >
        </div >
    )

}
