import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"

const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET
const HUBTEL_SENDER_ID = process.env.HUBTEL_SENDER_ID || "OTracker"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.otracker.net"

function formatGhanaPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "")

    // Handle standard Ghanaian number mapping
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        return "233" + cleaned.substring(1)
    }
    if (cleaned.startsWith("233") && cleaned.length === 12) {
        return cleaned
    }
    // Return original cleaned if it doesn't match standard patterns
    return cleaned
}

export async function sendOrderTrackingSMS(orderId: string): Promise<{ success: boolean; error?: string }> {
    if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
        console.warn("Hubtel Client ID or Client Secret is not set. SMS skipped.")
        return { success: false, error: "Hubtel credentials missing" }
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

        // Build a professional SMS body
        const message = `Hello ${order.customerName}, your order #${order.orderNumber} (${itemsStr}) has been received! Track its real-time progress here: ${trackingLink}`

        const authStr = `${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`
        const encodedAuth = Buffer.from(authStr).toString("base64")

        const response = await fetch("https://smsc.hubtel.com/v1/messages/send", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${encodedAuth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                From: HUBTEL_SENDER_ID.substring(0, 11), // Hubtel Sender ID max 11 chars
                To: formattedPhone,
                Content: message
            })
        })

        const data = await response.json()

        if (response.ok && data.status === "Pending" || data.status === "Success") {
            console.log(`Hubtel SMS sent to ${formattedPhone} for order ${order.orderNumber}`)
            return { success: true }
        } else {
            console.error("Hubtel SMS API failure:", data)
            return { success: false, error: data.message || "Hubtel API error" }
        }
    } catch (error: any) {
        console.error("Failed to send tracking SMS:", error)
        return { success: false, error: error?.message || "Internal SMS sending error" }
    }
}
