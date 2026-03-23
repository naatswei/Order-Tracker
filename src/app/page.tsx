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
    <section className="py-24 md:py-40 bg-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-[#CE0003]/5 blur-[100px] rounded-full" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative group lg:p-1"
        >
          {/* Main Card */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-[#CE0003]/20 to-indigo-500/20 rounded-[3rem] blur-sm opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative bg-[#191A43] rounded-[3rem] overflow-hidden">
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            <div className="relative p-10 md:p-24 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#CE0003] animate-pulse" />
                Global Expansion
              </motion.div>

              <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight max-w-3xl mx-auto">
                Scale your business from <span className="text-indigo-400">anywhere</span> in the world.
              </h2>
              
              <p className="text-white/60 text-base md:text-xl mb-14 max-w-2xl mx-auto font-medium leading-relaxed">
                Join 1,000+ diaspora business owners who are professionalizing their local brands and building radical trust with OTracker.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/sign-up">
                  <Button className="w-full sm:w-auto bg-white text-[#191A43] hover:bg-slate-50 rounded-2xl h-16 md:h-20 px-10 md:px-14 text-lg md:text-xl font-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-3 group/btn">
                    Start Your 7-Day Free Trial
                    <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Accent Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          </div>
        </motion.div>
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
        transition={{ duration: 0.2 }}
      >
        <LandingHero />
        <div id="features">
          <LandingFeatures />
        </div>
        <div id="pricing">
          <LandingPricing />
        </div>
        <LandingCTA />
        <LandingFooter />
      </motion.div>
    </main>
  )
}
