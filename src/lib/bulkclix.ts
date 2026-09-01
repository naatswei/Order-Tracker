import { db } from "@/db"
import { orders, staff } from "@/db/schema"
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

export async function sendRiderAssignmentSMS(
    orderId: string, 
    staffId: string, 
    orgId?: string
): Promise<{ success: boolean; error?: string }> {
    if (!BULKCLIX_API_KEY || !BULKCLIX_SENDER_ID) {
        console.warn("BulkClix API Key or Sender ID is not set. Rider SMS skipped.")
        return { success: false, error: "BulkClix credentials missing" }
    }

    try {
        const [order, staffMember] = await Promise.all([
            db.query.orders.findFirst({
                where: eq(orders.id, orderId),
            }),
            db.query.staff.findFirst({
                where: eq(staff.id, staffId),
            })
        ])

        if (!order || !staffMember) {
            return { success: false, error: "Order or staff member not found" }
        }

        if (!staffMember.phone) {
            console.warn(`Staff member ${staffMember.name} has no phone number recorded. SMS skipped.`)
            return { success: false, error: "Staff phone number not found" }
        }

        const formattedRiderPhone = formatGhanaPhoneNumber(staffMember.phone)
        if (!formattedRiderPhone) {
            return { success: false, error: "Invalid staff phone number" }
        }

        const trackingLink = `${APP_URL}/track/${orderId}`.replace(/^https?:\/\//, "")
        
        // Parse metadata for pickup and delivery locations
        const orderMeta = (typeof order.metadata === "object" && order.metadata !== null) ? order.metadata as Record<string, unknown> : {}
        const pickupLoc = (orderMeta.pickupLocation as string) || ""
        const deliveryLoc = (orderMeta.deliveryLocation as string) || order.measurements || ""

        // Pickup location if present (with map link)
        const pickup = pickupLoc 
            ? `\nPickup: ${pickupLoc}\nPickup Map: https://maps.google.com/?q=${encodeURIComponent(pickupLoc)}`
            : ""
        // Destination and Map Directions link if present
        const destination = deliveryLoc 
            ? `\nDestination: ${deliveryLoc}\nDest Map: https://maps.google.com/?q=${encodeURIComponent(deliveryLoc)}`
            : ""

        // SMS formatted for rider with customer phone number and map directions
        const message = `Hi ${staffMember.name}, new delivery assigned!\n\nWaybill: #${order.orderNumber}\nPackage: ${order.itemType || "Shipment"}\nCustomer: ${order.customerName} (${order.customerPhone})${pickup}${destination}\n\nTrack: ${trackingLink}`

        const response = await fetch("https://api.bulkclix.com/api/v1/sms-api/send", {
            method: "POST",
            headers: {
                "x-api-key": BULKCLIX_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sender_id: BULKCLIX_SENDER_ID,
                message: message,
                recipients: [formattedRiderPhone]
            })
        })

        const data = await response.json()

        if (response.ok && (data.message === "Request Sent" || data.status === "success" || data.status === "Pending")) {
            console.log(`BulkClix Rider Assignment SMS sent to ${formattedRiderPhone} (${staffMember.name}) for order ${order.orderNumber}`)
            return { success: true }
        } else {
            console.error("BulkClix Rider SMS API failure:", data)
            return { success: false, error: data.message || "BulkClix API error" }
        }
    } catch (error: any) {
        console.error("Failed to send BulkClix rider assignment SMS:", error)
        return { success: false, error: error?.message || "Internal SMS sending error" }
    }
}

