import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { subscriptions } from "@/db/schema"
import { eq } from "drizzle-orm"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get("reference")

    if (!reference) {
        return NextResponse.redirect(new URL("/onboarding/subscription?error=missing_reference", request.url))
    }

    if (!PAYSTACK_SECRET_KEY) {
        return NextResponse.redirect(new URL("/onboarding/subscription?error=config_missing", request.url))
    }

    try {
        // 1. Verify with Paystack
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        })

        const data = await response.json()

        if (!data.status || data.data.status !== "success") {
            return NextResponse.redirect(new URL("/onboarding/subscription?error=payment_failed", request.url))
        }

        const { metadata, amount, customer } = data.data
        const { planName, orgId, userId } = metadata

        // 2. Update/Insert Subscription in DB
        // We use nanoid for DB compatibility if needed, or stick to the Paystack reference as ID
        // For simplicity, we'll use a new record each time or upsert based on orgId

        const expiresAt = new Date()
        if (planName === "2 weeks") expiresAt.setDate(expiresAt.getDate() + 14)
        else if (planName === "Month") expiresAt.setMonth(expiresAt.getMonth() + 1)
        else if (planName === "Yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        // Check for existing sub to update or just add new
        await db.insert(subscriptions).values({
            id: reference,
            clerkOrgId: orgId,
            clerkUserId: userId,
            planType: planName.toLowerCase().replace(" ", ""),
            status: "active",
            amount: (amount / 100).toString(),
            expiresAt,
        })

        // 3. Redirect to Backoffice
        return NextResponse.redirect(new URL("/backoffice?success=true", request.url))

    } catch (error) {
        console.error("Verification Error:", error)
        return NextResponse.redirect(new URL("/onboarding/subscription?error=verification_error", request.url))
    }
}
