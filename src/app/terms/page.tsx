"use client"

import { LandingNavbar } from "@/components/landing/navbar"
import { LandingFooter } from "@/components/landing/footer"
import { motion } from "framer-motion"

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-slate-50 selection:bg-[#CE0003]/30 selection:text-[#CE0003]">
            <LandingNavbar />
            <div className="pt-32 pb-20 max-w-4xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-sm border border-slate-100"
                >
                    <h1 className="text-4xl font-black text-[#191A43] mb-8">Terms of Service</h1>
                    <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
                        <p>Welcome to OTracker. By using our services, you agree to these terms.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">1. Service Description</h2>
                        <p>OTracker provides order tracking and customer engagement tools for merchants and order-based businesses globally. We facilitate professional communication between sellers and buyers through branded tracking pages and automated updates.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">2. Account Responsibility</h2>
                        <p>You are responsible for maintaining the security of your account and ensuring that all order data uploaded to our platform is accurate and complies with local regulations in your operating jurisdictions.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">3. Subscription & Payments</h2>
                        <p>OTracker is a subscription-based service. Payments are processed securely via international payment gateways. Failure to maintain an active subscription may result in limited access to business tracking and team management features.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">4. Acceptable Use</h2>
                        <p>Users must not use OTracker for fraudulent activities, phishing, or the distribution of prohibited goods. We reserve the right to suspend accounts that violate our community standards or pose a security risk.</p>

                        <h2 className="text-2xl font-bold text-[#191A43] pt-4">5. Limitation of Liability</h2>
                        <p>OTracker is provided "as is". While we strive for 100% uptime, we are not liable for business disruptions caused by carrier delays, third-party API failures, or network interruptions.</p>
                    </div>
                </motion.div>
            </div>
            <LandingFooter />
        </main>
    )
}
