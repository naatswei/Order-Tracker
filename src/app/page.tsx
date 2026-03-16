"use client"

import { LandingNavbar } from "@/components/landing/navbar"
import { LandingHero } from "@/components/landing/hero"
import { LandingFeatures } from "@/components/landing/features"
import { LandingPricing } from "@/components/landing/pricing"
import { LandingFooter } from "@/components/landing/footer"
import { motion, useScroll, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

function LandingCTA() {
  return (
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[#191A43] skew-y-3 origin-bottom-right translate-y-20 hidden md:block" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="bg-[#CE0003] rounded-[2rem] md:rounded-[3rem] p-10 md:p-20 text-center shadow-2xl transform hover:scale-[1.01] transition-transform duration-500">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-6 md:mb-8 leading-tight"> Scale your business from anywhere in the world.</h2>
          <p className="text-white/95 text-base md:text-lg mb-10 md:mb-12 max-w-2xl mx-auto font-medium">
            Join 1,000+ diaspora business owners who are professionalizing their local brands with OTracker.
          </p>
          <Link href="/sign-up">
            <Button className="w-full sm:w-auto bg-white text-[#CE0003] hover:bg-slate-50 rounded-2xl h-14 md:h-16 px-10 md:px-12 text-base md:text-lg font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center mx-auto gap-3">
              Start your 7 days free trial today <ArrowRight className="w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <main className="min-h-screen bg-slate-50 selection:bg-[#CE0003]/30 selection:text-[#CE0003]">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#CE0003] origin-left z-[60]"
        style={{ scaleX }}
      />

      <LandingNavbar />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingCTA />
        <LandingFooter />
      </motion.div>
    </main>
  )
}
