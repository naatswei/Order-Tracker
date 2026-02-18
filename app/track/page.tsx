"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getBusinessConfig } from "@/lib/business-configs"
import { Footer } from "@/components/footer"

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("")
  const [businessType, setBusinessType] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setBusinessType(localStorage.getItem("businessType"))
  }, [])

  const config = getBusinessConfig(businessType)
  const isGeneric = !businessType

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackingId.trim()) {
      router.push(`/track/${trackingId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: config.theme.primary }}>Track Your {isGeneric ? "Order" : config.orderLabel.split(" ")[0]}</h1>
          <Link href="/">
            <Button variant="outline" style={{ borderColor: config.theme.primary, color: config.theme.primary }}>Home</Button>
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle style={{ color: config.theme.primary }}>Enter {config.orderLabel}</CardTitle>
              <CardDescription>Enter your unique identification to view your status</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trackingId" style={{ color: config.theme.primary }}>{config.orderLabel}</Label>
                  <Input
                    id="trackingId"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g., ABC1234"
                    className="uppercase h-12 rounded-lg border-slate-200"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white h-12 rounded-lg font-bold border-0"
                  size="lg"
                  style={{ backgroundColor: config.theme.primary }}
                >
                  Track {isGeneric ? "Order" : config.orderLabel.split(" ")[0]}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Your tracking ID was sent to you via email or SMS.
              <br />
              If you can't find it, please contact us.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
