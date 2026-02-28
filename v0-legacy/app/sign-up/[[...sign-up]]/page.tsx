"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center bg-[#191A43] text-white p-12 relative overflow-hidden">
                <div className="max-w-md mx-auto w-full z-10 space-y-6">
                    <div className="flex items-center text-5xl font-bold tracking-tighter">
                        <span className="text-[#CE0003]">O</span>
                        <span>Tracker</span>
                    </div>

                    <p className="text-white/60 text-lg font-light leading-relaxed">
                        Streamline your business with real-time order tracking.
                    </p>
                </div>

                {/* Decorative element (optional) */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Right Panel - Sign Up Form */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Branding (only visible on small screens) */}
                    <div className="flex lg:hidden justify-center mb-8">
                        <div className="flex items-center text-3xl sm:text-4xl font-bold tracking-tighter text-[#191A43]">
                            <span className="text-[#CE0003]">O</span>
                            <span>Tracker</span>
                        </div>
                    </div>

                    <div className="flex justify-center w-full">
                        <SignUp
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
