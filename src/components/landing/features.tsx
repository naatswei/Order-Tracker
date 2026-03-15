"use client"

import { motion } from "framer-motion"
import { MessageSquare, LayoutDashboard, Bell, BarChart3, Clock, Users } from "lucide-react"

const features = [
    {
        title: "Inquiry Automation",
        description: "Stop answering 'Where is my order?'. Let OTracker handle the status updates automatically.",
        icon: MessageSquare,
        color: "bg-blue-500"
    },
    {
        title: "Unified Inbox",
        description: "Respond to customers from Instagram, WhatsApp, and TikTok in one single, organized place.",
        icon: LayoutDashboard,
        color: "bg-[#CE0003]"
    },
    {
        title: "Real-time Tracking",
        description: "Branded tracking pages that give your customers peace of mind and professional updates.",
        icon: Bell,
        color: "bg-[#191A43]"
    },
    {
        title: "Business Insights",
        description: "Track your growth, top customers, and logistics performance with intuitive analytics.",
        icon: BarChart3,
        color: "bg-green-500"
    },
    {
        title: "24/7 Availability",
        description: "Your tracking dashboard never sleeps. Customers can check their status anytime, anywhere.",
        icon: Clock,
        color: "bg-orange-500"
    },
    {
        title: "Team Collaboration",
        description: "Invite your team members to help manage orders and customer inquiries efficiently.",
        icon: Users,
        color: "bg-purple-500"
    }
]

export function LandingFeatures() {
    return (
        <section id="features" className="py-32 md:py-48 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-2xl md:text-3xl font-bold text-[#191A43] mb-6 tracking-tight"
                    >
                        Built For The Modern <span className="text-[#CE0003]">Service Merchant</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto font-medium"
                    >
                        Everything you need to scale your independent business into a global brand without the manual headache.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-8 rounded-[2rem] bg-white border border-slate-100 hover:border-slate-200 transition-all group hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
                        >
                            <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-10 shadow-lg`}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-[#191A43] mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
