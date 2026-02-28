"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { subscriptions } from "@/db/schema"
import { eq } from "drizzle-orm"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function initializeSubscription(planName: string) {
    console.log(`Starting subscription initialization for ${planName}...`)

    const { userId, orgId } = await auth()
    const user = await currentUser()

    if (!userId || !orgId || !user) {
        console.error("Auth failed: No userId, orgId or user")
        throw new Error("Unauthorized")
    }

    const email = user.emailAddresses[0]?.emailAddress
    if (!email) {
        console.error("Auth failed: No email for user")
        throw new Error("User email not found")
    }

    console.log(`User auth verified: ${email} (Org: ${orgId})`)

    const planAmounts: Record<string, number> = {
        "Free Trial": 0,
        "2 weeks": 199 * 100,
        "Month": 350 * 100,
        "Yearly": 1500 * 100,
    }

    const amount = planAmounts[planName]
    if (amount === undefined) {
        console.error(`Invalid plan: ${planName}`)
        throw new Error("Invalid plan selected")
    }

    try {
        // SIMULATION MODE (GLOBAL)
        const id = `idx_${Math.random().toString(36).substring(2, 11)}`
        const expiresAt = new Date()

        if (planName === "2 weeks") expiresAt.setDate(expiresAt.getDate() + 14)
        else if (planName === "Month") expiresAt.setMonth(expiresAt.getMonth() + 1)
        else if (planName === "Yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        else expiresAt.setDate(expiresAt.getDate() + 7)

        console.log(`Inserting subscription into DB: ${id} for ${planName}`)

        await db.insert(subscriptions).values({
            id,
            clerkOrgId: orgId,
            clerkUserId: userId,
            planType: planName.toLowerCase().replace(" ", ""),
            status: "active",
            expiresAt,
        })

        console.log(`Subscription created successfully. Redirecting...`)

        return {
            success: true,
            redirect: "/backoffice",
            isSimulated: true,
            message: planName === "Free Trial"
                ? undefined
                : `Testing Mode: We've simulated your ${planName} activation.`
        }

    } catch (e: any) {
        console.error("DB/Simulation Error:", e)
        throw new Error("Failed to activate subscription. Please try again.")
    }

    const planAmounts: Record<string, number> = {
        "2 weeks": 199 * 100, // Gh199 in pesewas
        "Month": 350 * 100,   // Gh350 in pesewas
        "Yearly": 1500 * 100, // Gh1500 in pesewas
    }

    const amount = planAmounts[planName]
    if (!amount && planName !== "Free Trial") {
        throw new Error("Invalid plan selected")
    }

    // SIMULATION MODE (GLOBAL): Redirect all plans to dashboard for now
    // This allows the user to test the flow without a Paystack account.
    // To enable real payments, remove this block and use the logic below.
    const id = `sim_${nanoid()}`
    const expiresAt = new Date()
    if (planName === "2 weeks") expiresAt.setDate(expiresAt.getDate() + 14)
    else if (planName === "Month") expiresAt.setMonth(expiresAt.getMonth() + 1)
    else if (planName === "Yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    else expiresAt.setDate(expiresAt.getDate() + 7) // Default trial

    await db.insert(subscriptions).values({
        id,
        clerkOrgId: orgId,
        clerkUserId: userId,
        planType: planName.toLowerCase().replace(" ", ""),
        status: "active",
        expiresAt,
    })

    return {
        success: true,
        redirect: "/backoffice",
        isSimulated: true,
        message: planName === "Free Trial"
            ? undefined
            : `Testing Mode: We've simulated your ${planName} activation so you can explore the dashboard.`
    }

    /* 
    // REAL PAYSTACK LOGIC (Disabled until ready)
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error("Payment provider not configured")
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
                metadata: { planName, orgId, userId },
            }),
        })
        const data = await response.json()
        if (!data.status) throw new Error(data.message || "Failed to initialize payment")
        return { success: true, authorization_url: data.data.authorization_url }
    } catch (error) {
        console.error("Paystack Error:", error)
        throw new Error("Failed to connect to payment provider")
    }
    */
}
