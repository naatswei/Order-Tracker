import Link from "next/link";
import { ArrowLeft, ShieldCheck, Clock, CreditCard, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Return & Refund Policy",
  description: "Learn about OTracker's refund and cancellation policies for our business management tools.",
};

export default function ReturnPolicyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5" /> Trust & Transparency
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Return & Refund <span className="text-[#191A43]">Policy</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            At OTracker, we are committed to building radical trust with our vendors. 
            Here is how we handle cancellations and refunds for our digital services.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Policy Cards */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">14-Day Refund Window</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We offer a full **14-day money-back guarantee** for all new subscription plans. 
                  If OTracker doesn't fit your business workflow within the first two weeks, 
                  you are eligible for a full refund—no questions asked.
                </p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 italic text-sm text-slate-500">
                  Note: Refund requests made after the 14-day window will be evaluated on a case-by-case basis.
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-6">
                <RefreshCcw className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Subscription Cancellation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                You can cancel your OTracker subscription at any time through your dashboard settings. 
                Your access will remain active until the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Processing Refunds</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Once approved, refunds are processed back to your original payment method (Mobile Money, Card, etc.) 
                within 5-10 business days.
              </p>
            </div>
          </div>

          <div className="bg-[#191A43] rounded-3xl p-8 sm:p-10 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Have questions about a refund?</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Our support team is here to help you resolve any issues with your account or billing. 
              Contact us anytime and we'll get it sorted.
            </p>
            <Link href="mailto:support@otracker.net">
              <Button className="bg-white text-[#191A43] hover:bg-slate-100 px-8 py-6 rounded-2xl font-bold text-lg">
                Contact Support
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
