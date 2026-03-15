"use client"

import { LandingNavbar } from "@/components/landing/navbar"
import { LandingFooter } from "@/components/landing/footer"
import { motion } from "framer-motion"

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-slate-50 selection:bg-[#CE0003]/30 selection:text-[#CE0003]">
            <LandingNavbar />
            <div className="pt-32 pb-20 max-w-4xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-sm border border-slate-100"
                >
                    <h1 className="text-4xl font-black text-[#191A43] mb-8">Privacy Policy</h1>
                    <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
                        <p>OTracker is committed to protecting your business and your customers' privacy. This policy outlines how we handle data.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">1. Data We Collect</h2>
                        <p>We collect business information (name, logo, account credentials) and order data (customer contact info, delivery address, order status) provided by you to enable professional tracking services.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">2. How We Use Data</h2>
                        <p>Data is used exclusively for service delivery—generating tracking pages, sending automated updates, and providing business analytics. We do not sell your business or customer data to third-party advertisers.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">3. Customer Privacy</h2>
                        <p>End-customer data uploaded to OTracker is only visible to the relevant business owner and their authorized team members. We use industry-standard encryption to protect this information during transit and at rest.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">4. International Data Transfers</h2>
                        <p>By using OTracker globally, you consent to the processing of data across our international cloud infrastructure. We maintain strict compliance with data protection laws wherever we operate.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">5. Your Rights</h2>
                        <p>You have the right to export your data or delete your account and its associated order history at any time through your dashboard settings.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">6. Security</h2>
                        <p>We implement advanced security measures, including multi-factor authentication (via Clerk) and secure payment processing (via Paystack), to ensure your account remains safe from unauthorized access.</p>
                    </div>
                </motion.div>
            </div>
            <LandingFooter />
        </main>
    )
}
