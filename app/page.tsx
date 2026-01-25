'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Package, Smartphone, Zap } from "lucide-react";

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 }
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 font-sans selection:bg-primary/10">
      <div className="container mx-auto px-4 py-8 md:py-12">

        {/* Header */}
        <header className="flex justify-between items-center mb-16 md:mb-24">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="text-primary w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight">OTracker</span>
          </div>

          <div className="flex items-center gap-3">
            <SignedIn>
              <Link href="/backoffice">
                <Button variant="outline" className="rounded-full">
                  Dashboard
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="rounded-full">
                  Sign In
                </Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button className="rounded-full px-6 shadow-sm">
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </header>

        {/* Hero Section */}
        <motion.main
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <motion.div variants={fadeInUp} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance text-foreground">
              Simplifying Orders for <span className="text-primary">Tailors</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed max-w-2xl mx-auto">
              OTracker streamlines your business with real-time tracking. Create orders, generate links, and keep customers informed beautifully.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/track" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 group">
                Track Order
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base rounded-full bg-background/50 backdrop-blur-sm">
                  Create Account
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/backoffice" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base rounded-full bg-background/50 backdrop-blur-sm">
                  Backoffice
                </Button>
              </Link>
            </SignedIn>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={fadeInUp}
            className="pt-24 grid md:grid-cols-3 gap-8 text-left"
          >
            {[
              {
                icon: <Smartphone className="w-6 h-6 text-primary" />,
                title: "Mobile First",
                desc: "Manage your entire business from your phone. Built for on-the-go tailors."
              },
              {
                icon: <Zap className="w-6 h-6 text-primary" />,
                title: "Instant Updates",
                desc: "Status changes populate immediately. No refreshing needed."
              },
              {
                icon: <CheckCircle2 className="w-6 h-6 text-primary" />,
                title: "Customer Trust",
                desc: "Give your customers peace of mind with a professional tracking page."
              }
            ].map((feature, idx) => (
              <div key={idx} className="space-y-3 p-6 rounded-2xl bg-white/40 border border-white/50 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </motion.div>

        </motion.main>
      </div>
    </div>
  );
}
