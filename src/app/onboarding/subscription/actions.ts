"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { subscriptions } from "@/db/schema"
import { nanoid } from "nanoid"
import { eq } from "drizzle-orm"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function initializeSubscription(planName: string) {
    const { userId, orgId } = await auth()
    const user = await currentUser()

    if (!userId || !orgId || !user) {
        throw new Error("Unauthorized")
    }

    const email = user.emailAddresses[0]?.emailAddress
    if (!email) {
        throw new Error("User email not found")
    }

    // 1. Handle Free Trial (Instant)
    if (planName === "Free Trial") {
        const id = nanoid()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await db.insert(subscriptions).values({
            id,
            clerkOrgId: orgId,
            clerkUserId: userId,
            planType: "trial",
            status: "active",
            expiresAt,
        })

        return { success: true, redirect: "/backoffice" }
    }

    // 2. Handle Paid Plans (Paystack)
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error("Payment provider not configured")
    }

    const planAmounts: Record<string, number> = {
        "2 weeks": 199 * 100, // Gh199 in pesewas
        "Month": 350 * 100,   // Gh350 in pesewas
        "Yearly": 1500 * 100, // Gh1500 in pesewas
    }

    const amount = planAmounts[planName]
    if (!amount) {
        throw new Error("Invalid plan selected")
    }

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/verify`

    try {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                amount,
                callback_url: callbackUrl,
                metadata: {
                    planName,
                    orgId,
                    userId,
                },
            }),
        })

        const data = await response.json()

        if (!data.status) {
            throw new Error(data.message || "Failed to initialize payment")
        }

        return { success: true, authorization_url: data.data.authorization_url }
    } catch (error) {
        console.error("Paystack Error:", error)
        throw new Error("Failed to connect to payment provider")
    }
}
