"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { subscriptions } from "@/db/schema"

export async function initializeSubscription(planName: string) {
    console.log(`[SUBSCRIPTION] Starting for plan: ${planName}`);

    try {
        const { userId, orgId } = await auth();

        if (!userId) {
            console.error("[SUBSCRIPTION] No userId found");
            throw new Error("Unauthorized: Please sign in again.");
        }

        // Use orgId if available, fallback to userId to satisfy NOT NULL constraint
        // This handles users on personal accounts or if org sync is delayed
        const finalOrgId = orgId || `user_${userId}`;

        console.log(`[SUBSCRIPTION] Auth verified. User: ${userId}, Org: ${finalOrgId}`);

        const id = `sub_${Math.random().toString(36).substring(2, 12)}`;
        const expiresAt = new Date();

        if (planName === "2 weeks") {
            expiresAt.setDate(expiresAt.getDate() + 14);
        } else if (planName === "Month") {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (planName === "Yearly") {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
            // Default: 7 day trial
            expiresAt.setDate(expiresAt.getDate() + 7);
        }

        console.log(`[SUBSCRIPTION] Saving to database: ${id}`);

        await db.insert(subscriptions).values({
            id,
            clerkOrgId: finalOrgId,
            clerkUserId: userId,
            planType: planName.toLowerCase().replace(/\s+/g, ""),
            status: "active",
            expiresAt,
            amount: "0"
        });

        console.log("[SUBSCRIPTION] Database save successful");

        return {
            success: true,
            redirect: "/backoffice",
            message: planName === "Free Trial"
                ? undefined
                : `Testing Mode: We've simulated your ${planName} activation.`
        };

    } catch (error: any) {
        console.error("[SUBSCRIPTION] Fatal error:", error);
        return {
            success: false,
            message: error.message || "Failed to initialize subscription. Please try again."
        };
    }
}
