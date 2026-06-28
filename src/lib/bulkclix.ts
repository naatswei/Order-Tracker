import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"

const BULKCLIX_API_KEY = process.env.BULKCLIX_API_KEY
const BULKCLIX_SENDER_ID = process.env.BULKCLIX_SENDER_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.otracker.net"

function formatGhanaPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "")

    // BulkClix requires standard international format (233...) for reliable routing
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        return "233" + cleaned.substring(1)
    }
    if (cleaned.startsWith("233") && cleaned.length === 12) {
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
            where: eq(orders.id, orderId),
            with: {
                inventoryLinks: {
                    with: {
                        inventoryItem: true
                    }
                }
            }
        })

        if (!order) {
            return { success: false, error: "Order not found" }
        }

        const formattedPhone = formatGhanaPhoneNumber(order.customerPhone)
        if (!formattedPhone) {
            return { success: false, error: "Invalid phone number" }
        }

        const trackingLink = `${APP_URL}/track/${orderId}`
        
        let itemsStr = order.itemType || "Items"
        if (order.inventoryLinks && order.inventoryLinks.length > 0) {
            const stockItems = order.inventoryLinks.map((link: any) => `${link.quantity}x ${link.inventoryItem.name}`).join(", ")
            if (order.itemType && order.itemType.trim() !== "" && order.itemType.toLowerCase() !== "stock items") {
                itemsStr = `${order.itemType} & ${stockItems}`
            } else {
                itemsStr = stockItems
            }
            if (itemsStr.length > 60) {
                itemsStr = itemsStr.substring(0, 57) + "..."
            }
        }

        // Build professional SMS message
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} (${itemsStr}) has been received! Track its real-time progress here: ${trackingLink}`

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

export async function sendOrderStatusSMS(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
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
        
        // Build status update SMS message
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} status is now: ${status}. Track progress here: ${trackingLink}`

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
            console.log(`BulkClix Status SMS sent to ${formattedPhone} for order ${order.orderNumber} (${status})`)
            return { success: true }
        } else {
            console.error("BulkClix SMS API failure:", data)
            return { success: false, error: data.message || "BulkClix API error" }
        }
    } catch (error: any) {
        console.error("Failed to send BulkClix status SMS:", error)
        return { success: false, error: error?.message || "Internal SMS sending error" }
    }
}

