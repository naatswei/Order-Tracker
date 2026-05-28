"use client"

import { SignIn } from "@clerk/nextjs"
import { Layers, Boxes, ShieldCheck } from "lucide-react"

export default function SignInPage() {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center bg-gradient-to-br from-[#0F1026] via-[#191A43] to-[#2E2F75] text-white p-16 relative overflow-hidden">
                {/* Glowing Orbs */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/4 -right-12 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-md mx-auto w-full z-10 space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center text-5xl font-extrabold tracking-tight">
                            <span className="text-[#CE0003]">O</span>
                            <span className="text-white">Tracker</span>
                        </div>
                        <p className="text-white/70 text-base font-medium leading-relaxed">
                            Complete visibility over your store's inventory, operations, and total control over your business.
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-white/90">Private Team Workflows</h3>
                                <p className="text-xs text-white/50 mt-1 leading-normal">Track your team's internal work steps while keeping customer order updates clean and simple.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <Boxes className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-white/90">Smart Stock Monitoring</h3>
                                <p className="text-xs text-white/50 mt-1 leading-normal">Monitor your inventory, set low-stock alerts, and manage prices in local GH₵.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-white/90">Staff Activity & Security</h3>
                                <p className="text-xs text-white/50 mt-1 leading-normal">Assign tasks to your staff and track their work history safely inside your dashboard.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Sign In Form */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Branding (only visible on small screens) */}
                    <div className="flex lg:hidden justify-center mb-8">
                        <div className="flex items-center text-3xl sm:text-4xl font-bold tracking-tight text-[#191A43]">
                            <span className="text-[#CE0003]">O</span>
                            <span className="text-[#191A43]">Tracker</span>
                        </div>
                    </div>

                    <div className="flex justify-center w-full">
                        <SignIn
                            fallbackRedirectUrl="/backoffice"
                            forceRedirectUrl="/backoffice"
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "shadow-none border-none p-0 w-full bg-transparent",
                                    headerTitle: "text-2xl font-bold text-[#191A43]",
                                    headerSubtitle: "text-gray-500",
                                    socialButtonsBlockButton: "border-gray-200 text-gray-600 hover:bg-gray-50",
                                    formButtonPrimary: "bg-[#191A43] hover:bg-[#191A43]/90 text-white",
                                    footerActionLink: "text-[#191A43] hover:text-[#191A43]/80",
                                    formFieldInput: "border-gray-200 focus:border-[#191A43] focus:ring-[#191A43]",
                                    formFieldLabel: "text-gray-700"
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

