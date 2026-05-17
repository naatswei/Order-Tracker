"use server"

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

export async function savePushSubscription(orderId: string, subscription: any) {
    if (!orderId || !subscription || !subscription.endpoint) {
        return { success: false, error: "Invalid subscription data" };
    }

    try {
        // Check if this endpoint already exists for this order
        const existing = await db.query.pushSubscriptions.findFirst({
            where: and(
                eq(pushSubscriptions.orderId, orderId),
                eq(pushSubscriptions.endpoint, subscription.endpoint)
            )
        });

        if (existing) {
            return { success: true, message: "Subscription already exists" };
        }

        await db.insert(pushSubscriptions).values({
            id: `ps_${nanoid(10)}`,
            orderId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to save push subscription:", error);
        return { success: false, error: "Database error" };
    }
}
