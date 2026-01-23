import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold text-balance">Tailoring Order Tracking System</h1>
          <p className="text-xl text-muted-foreground text-pretty leading-relaxed">
            Streamline your tailoring business with real-time order tracking. Create orders, generate tracking links,
            and keep customers informed every step of the way.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/admin">
              <Button size="lg" className="w-full sm:w-auto">
                Admin Dashboard
              </Button>
            </Link>
            <Link href="/track">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                Track Order
              </Button>
            </Link>
          </div>

          <div className="pt-16 grid md:grid-cols-3 gap-8 text-left">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Easy Order Entry</h3>
              <p className="text-muted-foreground leading-relaxed">
                Quickly add new orders with customer details and generate unique tracking links instantly.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Real-Time Updates</h3>
              <p className="text-muted-foreground leading-relaxed">
                Update order status instantly and customers see changes immediately on their tracking page.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Customer Transparency</h3>
              <p className="text-muted-foreground leading-relaxed">
                Keep customers informed with a beautiful timeline view of their order progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
