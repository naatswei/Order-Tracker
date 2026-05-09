import Link from "next/link";
import { ArrowLeft, Truck, Globe, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Shipping & Delivery Policy",
  description: "Learn how OTracker delivers its digital services instantly to business owners worldwide.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#191A43] flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="font-black text-slate-800 tracking-tight text-xl">OTRACKER</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-slate-500 hover:text-[#191A43]">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#191A43]/5 text-[#191A43] text-xs font-bold uppercase tracking-widest mb-4">
            <Truck className="w-3.5 h-3.5" /> Delivery Information
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Shipping & <span className="text-[#191A43]">Delivery</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            OTracker is a cloud-based Software-as-a-Service (SaaS) platform. 
            Because our products are digital, delivery is instant and global.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Main Delivery Card */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Instant Digital Delivery</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Upon successful payment of your subscription plan, your OTracker dashboard and all premium features are 
                  **activated immediately**. You will receive a confirmation email with your account details within minutes.
                </p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 italic text-sm text-slate-500">
                  No physical shipping is required. Your workspace is accessible from any device with an internet connection.
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Worldwide Availability</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our services are available to business owners globally. Whether you are in Ghana, Nigeria, 
                the UK, or the USA, you can manage your operations seamlessly.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">No Shipping Costs</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Since all our tools are delivered digitally, there are **zero shipping fees** or customs charges 
                for any of our subscription plans.
              </p>
            </div>
          </div>

          <div className="bg-[#191A43] rounded-3xl p-8 sm:p-10 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to start tracking?</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Join thousands of vendors professionalizing their brands with real-time digital tracking and management.
            </p>
            <Link href="/sign-up">
              <Button className="bg-white text-[#191A43] hover:bg-slate-100 px-8 py-6 rounded-2xl font-bold text-lg">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm italic">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </main>
    </div>
  );
}
