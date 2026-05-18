import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

// VAPID keys should be generated and set in environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = "mailto:support@otracker.app"; // Need a valid email or URL

if (vapidPublicKey && vapidPrivateKey) {
    try {
        webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
    } catch (err: any) {
        console.error("Failed to initialize web-push VAPID details:", err?.message || err);
    }
} else {
    console.warn("Web Push VAPID keys are missing! Push notifications will fail.");
}

export async function sendWebPush(subscription: webpush.PushSubscription, payload: any) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.error("Cannot send web push without VAPID keys");
        return { success: false, error: "Missing VAPID keys" };
    }

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return { success: true };
    } catch (error) {
        console.error("Failed to send web push:", error);
        return { success: false, error };
    }
}

export async function triggerOrderStatusNotification(orderId: string, statusName: string, orderNumber: string) {
    try {
        const subscriptions = await db.query.pushSubscriptions.findMany({
            where: eq(pushSubscriptions.orderId, orderId)
        });

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for order ${orderId}`);
            return;
        }

        const payload = {
            title: `Order #${orderNumber} Updated`,
            body: `Your order is now: ${statusName}.`,
            url: `${process.env.NEXT_PUBLIC_APP_URL || "https://otracker.app"}/track/${orderId}`
        };

        const promises = subscriptions.map((sub) => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            } as any;
            return sendWebPush(pushSub, payload);
        });

        const results = await Promise.all(promises);
        console.log(`Dispatched ${results.length} web push notifications for order ${orderId}`);
    } catch (error) {
        console.error("Error triggering push notification:", error);
    }
}
