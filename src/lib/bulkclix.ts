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

        // Strip https:// to help prevent large rich link previews
        const trackingLink = `${APP_URL}/track/${orderId}`.replace(/^https?:\/\//, "")
        
        let itemsList = ""
        if (order.inventoryLinks && order.inventoryLinks.length > 0) {
            itemsList = "\n" + order.inventoryLinks.map((link: any) => `- ${link.quantity}x ${link.inventoryItem.name}`).join("\n")
        } else if (order.itemType && order.itemType.trim() !== "") {
            itemsList = "\n- " + order.itemType
        }

        // Query invoice from metadata if exists
        const invoice = (order.metadata as any)?.invoice
        let paymentInfo = ""
        if (invoice) {
            const amount = parseFloat(invoice.amountDue || "0").toFixed(2)
            if (invoice.invoiceStatus === "paid") {
                paymentInfo = `\nTotal Paid: GH₵ ${amount} (Cash)`
            } else {
                paymentInfo = `\nTotal Due: GH₵ ${amount}`
            }
        }

        // Build professional SMS message
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} has been received!\n\nItems:${itemsList}${paymentInfo}\n\nTrack progress and view invoice details here:\n${trackingLink}`

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

        // Strip https:// to help prevent large rich link previews
        const trackingLink = `${APP_URL}/track/${orderId}`.replace(/^https?:\/\//, "")
        
        // Build status update SMS message
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} status is now: ${status}.\n\nTrack progress and view available store items here:\n${trackingLink}`

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

