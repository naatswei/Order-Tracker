"use client"

import { useState, useEffect, useRef } from "react"
import { useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { updateOrgProfile } from "@/app/actions/org-metadata"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Camera, Settings } from "lucide-react"
import { getBusinessConfig } from "@/lib/business-configs"
import Link from "next/link"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { BackofficeHeader } from "@/components/backoffice-header"

export default function ProfilePage() {
    const { organization, isLoaded } = useOrganization()

    // Profile State
    const [profileLoading, setProfileLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        companyName: "",
        contact: "",
        location: "",
        email: "",
        website: ""
    })

    const [businessType, setBusinessType] = useState<string | null>(null)
    const config = getBusinessConfig(businessType)

    useEffect(() => {
        if (!isLoaded) return

        if (organization) {
            const orgBusinessType = organization.publicMetadata?.businessType as string
            setBusinessType(orgBusinessType || localStorage.getItem("businessType"))

            // Initialize form data
            setFormData({
                companyName: organization.name,
                contact: (organization.publicMetadata?.contact as string) || "",
                location: (organization.publicMetadata?.location as string) || "",
                email: (organization.publicMetadata?.secondaryEmail as string) || "",
                website: (organization.publicMetadata?.website as string) || ""
            })
            setImagePreview(organization.imageUrl)
        }
    }, [isLoaded, organization])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB")
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

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization) return
        setProfileLoading(true)
        try {
            await updateOrgProfile(organization.id, formData)
            toast.success("Profile updated successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to update profile")
        } finally {
            setProfileLoading(false)
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-muted-foreground">Loading profile...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background font-sans">
            <BackofficeHeader config={config} />

            <div className="container mx-auto px-4 py-8 max-w-[1000px] space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/backoffice">
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-slate-900 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Profile</h1>
                        <p className="text-sm text-slate-500 font-medium">Manage your business settings and preferences</p>
                    </div>
                </div>

                <div className="flex border-b border-slate-200 mb-6">
                    <div className="px-6 py-3 text-sm font-semibold text-primary relative border-b-2 border-primary">
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardContent className="p-8">
                            <form onSubmit={handleProfileSubmit} className="space-y-8">
                                {/* Logo Section */}
                                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
                                    <div
                                        onClick={triggerFileInput}
                                        className="relative h-24 w-24 rounded-2xl overflow-hidden cursor-pointer group shadow-sm ring-1 ring-slate-200"
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Logo" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full bg-slate-50 flex items-center justify-center">
                                                <Camera className="w-8 h-8 text-slate-300" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-slate-900">Business Logo</h3>
                                        <p className="text-sm text-slate-500 mb-2">This logo will appear in customer tracking pages.</p>
                                        <Button type="button" variant="outline" size="sm" onClick={triggerFileInput}>
                                            Change Logo
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-slate-700 font-semibold" htmlFor="companyName">Company Name</Label>
                                        <Input
                                            id="companyName"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-semibold" htmlFor="contact">Contact Number</Label>
                                        <Input
                                            id="contact"
                                            name="contact"
                                            value={formData.contact}
                                            onChange={handleInputChange}
                                            className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-semibold" htmlFor="email">Public Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-slate-700 font-semibold" htmlFor="location">Business Address</Label>
                                        <Input
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-slate-700 font-semibold" htmlFor="website">Website URL (Optional)</Label>
                                        <Input
                                            id="website"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleInputChange}
                                            className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        type="submit"
                                        disabled={profileLoading}
                                        style={{ backgroundColor: config.theme.primary }}
                                        className="min-w-[140px] shadow-sm hover:opacity-90 transition-opacity"
                                    >
                                        {profileLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : null}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
