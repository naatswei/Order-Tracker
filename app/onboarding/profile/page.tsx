"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Camera } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function BusinessProfilePage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
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
        setIsLoading(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Save to local storage for now (or submit to API in real app)
        localStorage.setItem("businessProfile", JSON.stringify({ ...formData, imagePreview }))

        router.push("/backoffice")
        setIsLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="bg-white py-8 px-4 shadow-sm border border-border sm:rounded-lg sm:px-10">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-primary mb-2">
                            Welcome to your Business Journey
                        </h1>
                        <p className="text-muted-foreground">
                            Let&apos;s set up your business profile in just a few steps.
                        </p>
                    </div>

                    <form className="space-y-8" onSubmit={handleSubmit}>
                        {/* Section Header */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-primary">
                                Basic Business Information
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter your business information
                            </p>
                        </div>

                        <div className="bg-white border border-border rounded-xl p-6 space-y-6">
                            {/* Logo Upload */}
                            <div>
                                <Label className="text-primary font-medium mb-3 block">Business Logo</Label>
                                <div className="flex items-center gap-6">
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
                                            "h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden relative",
                                            imagePreview ? "border-primary" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                                        )}
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Logo preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <Camera className="h-8 w-8 mb-1 text-gray-400" />
                                        )}
                                    </div>

                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="text-primary border-border hover:bg-secondary"
                                            onClick={triggerFileInput}
                                        >
                                            Upload Image
                                        </Button>
                                        <p className="mt-2 text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="companyName" className="text-primary font-medium">
                                        Company Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="companyName"
                                        name="companyName"
                                        placeholder="Kenneth Tetteh"
                                        required
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                        className="h-11 border-input focus-visible:ring-primary"
                                    />
                                </div>

                                {/* Company Contact */}
                                <div className="space-y-2">
                                    <Label htmlFor="contact" className="text-primary font-medium">
                                        Company Contact <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="contact"
                                        name="contact"
                                        placeholder="05487064301"
                                        required
                                        value={formData.contact}
                                        onChange={handleInputChange}
                                        className="h-11 border-input focus-visible:ring-primary"
                                    />
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-primary font-medium">
                                        Location <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        placeholder="Chairman Odeghe Yellow apartment"
                                        required
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="h-11 border-input focus-visible:ring-primary"
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
                                        placeholder="kennethtetteh@gmail.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="h-11 border-input focus-visible:ring-primary"
                                    />
                                </div>

                                {/* Website URL - Full Width on Desktop usually, but grid spans 2 cols? Let's keep it in grid or span 2 */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="website" className="text-primary font-medium">
                                        Website URL
                                    </Label>
                                    <Input
                                        id="website"
                                        name="website"
                                        placeholder="https://www.yourbusiness.com"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="h-11 border-input focus-visible:ring-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px] h-11"
                            >
                                {isLoading ? "Saving..." : "Complete"}
                                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
