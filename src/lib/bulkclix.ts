import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"

const BULKCLIX_API_KEY = process.env.BULKCLIX_API_KEY
const BULKCLIX_SENDER_ID = process.env.BULKCLIX_SENDER_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://otracker.app"

function formatGhanaPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "")

    // BulkClix requires local format or standard digits (e.g. 0541088285 or 233...)
    // Let's keep it as standard 10 digit local format (024...) or standard digits based on input
    if (cleaned.startsWith("233") && cleaned.length === 12) {
        return "0" + cleaned.substring(3)
    }
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        return cleaned
    }
    return cleaned
}

export async function sendOrderTrackingSMS(orderId: string): Promise<{ success: boolean; error?: string }> {
    if (!BULKCLIX_API_KEY || !BULKCLIX_SENDER_ID) {
        console.warn("BulkClix API Key or Sender ID is not set. SMS skipped.")
        return { success: false, error: "BulkClix credentials missing" }
    }

    try {
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId)
        })

        if (!order) {
            return { success: false, error: "Order not found" }
        }

        const formattedPhone = formatGhanaPhoneNumber(order.customerPhone)
        if (!formattedPhone) {
            return { success: false, error: "Invalid phone number" }
        }

        const trackingLink = `${APP_URL}/track/${orderId}`
        
        // Build professional SMS message
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} (${order.itemType}) has been registered. Track its real-time progress here: ${trackingLink}`

        const response = await fetch("https://api.bulkclix.com/api/v1/sms-api/send", {
            method: "POST",
            headers: {
                "x-api-key": BULKCLIX_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sender_id: BULKCLIX_SENDER_ID,
                message: message,
                recipients: [formattedPhone]
            })
        })

        const data = await response.json()

        if (response.ok && (data.message === "Request Sent" || data.status === "success" || data.status === "Pending")) {
            console.log(`BulkClix SMS sent to ${formattedPhone} for order ${order.orderNumber}`)
            return { success: true }
        } else {
            console.error("BulkClix SMS API failure:", data)
            return { success: false, error: data.message || "BulkClix API error" }
        }
    } catch (error: any) {
        console.error("Failed to send BulkClix tracking SMS:", error)
        return { success: false, error: error?.message || "Internal SMS sending error" }
    }
}
