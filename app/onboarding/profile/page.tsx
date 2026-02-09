"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Camera } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function BusinessProfilePage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Save to local storage for now (or submit to API in real app)
        localStorage.setItem("businessProfile", JSON.stringify(formData))

        router.push("/backoffice")
        setIsLoading(false)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-[#191A43] mb-2">
                            Welcome to your Business Journey
                        </h1>
                        <p className="text-gray-500">
                            Let's set up your business profile in just a few steps.
                        </p>
                    </div>

                    <form className="space-y-8" onSubmit={handleSubmit}>
                        {/* Section Header */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-[#191A43]">
                                Basic Business Information
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Enter your business information
                            </p>
                        </div>

                        <div className="bg-white border rounded-xl p-6 space-y-6">
                            {/* Logo Upload */}
                            <div>
                                <Label className="text-[#191A43] font-medium mb-3 block">Business Logo</Label>
                                <div className="flex items-center gap-6">
                                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer">
                                        <Camera className="h-8 w-8 mb-1" />
                                    </div>
                                    <div>
                                        <Button type="button" variant="outline" className="text-[#191A43] border-gray-200">
                                            Upload Image
                                        </Button>
                                        <p className="mt-2 text-xs text-gray-500">PNG, JPG up to 5MG</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="companyName" className="text-[#191A43] font-medium">
                                        Company Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="companyName"
                                        name="companyName"
                                        placeholder="Kenneth Tetteh"
                                        required
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>

                                {/* Company Contact */}
                                <div className="space-y-2">
                                    <Label htmlFor="contact" className="text-[#191A43] font-medium">
                                        Company Contact <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="contact"
                                        name="contact"
                                        placeholder="05487064301"
                                        required
                                        value={formData.contact}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-[#191A43] font-medium">
                                        Location <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        placeholder="Chairman Odeghe Yellow apartment"
                                        required
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>

                                {/* Email Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[#191A43] font-medium">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="kennethtetteh@gmail.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>

                                {/* Website URL - Full Width on Desktop usually, but grid spans 2 cols? Let's keep it in grid or span 2 */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="website" className="text-[#191A43] font-medium">
                                        Website URL
                                    </Label>
                                    <Input
                                        id="website"
                                        name="website"
                                        placeholder="https://www.yourbusiness.com"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-[#191A43] hover:bg-[#191A43]/90 text-white min-w-[140px] h-11"
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
