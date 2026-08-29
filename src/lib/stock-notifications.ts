"use server"

import { db } from "@/db"
import { orders, orderInventoryLinks, inventory, stockNotificationLog } from "@/db/schema"
import { eq, and, sql, gt } from "drizzle-orm"
import { nanoid } from "nanoid"

const BULKCLIX_API_KEY = process.env.BULKCLIX_API_KEY
const BULKCLIX_SENDER_ID = process.env.BULKCLIX_SENDER_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.otracker.net"

// 7-day cooldown in milliseconds
const NOTIFICATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function formatGhanaPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "")
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        return "233" + cleaned.substring(1)
    }
    if (cleaned.startsWith("233") && cleaned.length === 12) {
        return cleaned
    }
    return cleaned
}

/**
 * Finds customers who have ordered a specific inventory item 3+ times,
 * excluding those already notified within the 7-day cooldown window.
 */
export async function getEligibleCustomers(
    inventoryId: string,
    orgId: string
): Promise<{ phone: string; name: string }[]> {
    // 1. Get all orders linked to this inventory item, grouped by customer phone
    const customerOrders = await db
        .select({
            customerPhone: orders.customerPhone,
            customerName: orders.customerName,
            orderCount: sql<number>`count(DISTINCT ${orders.id})`.as("order_count"),
        })
        .from(orderInventoryLinks)
        .innerJoin(orders, eq(orderInventoryLinks.orderId, orders.id))
        .where(
            and(
                eq(orderInventoryLinks.inventoryId, inventoryId),
                eq(orderInventoryLinks.clerkOrgId, orgId)
            )
        )
        .groupBy(orders.customerPhone, orders.customerName)
        .having(sql`count(DISTINCT ${orders.id}) >= 3`)

    if (customerOrders.length === 0) return []

    // 2. Filter out customers notified within the cooldown period
    const cooldownDate = new Date(Date.now() - NOTIFICATION_COOLDOWN_MS)

    const recentlyNotified = await db
        .select({ customerPhone: stockNotificationLog.customerPhone })
        .from(stockNotificationLog)
        .where(
            and(
                eq(stockNotificationLog.inventoryId, inventoryId),
                eq(stockNotificationLog.clerkOrgId, orgId),
                gt(stockNotificationLog.sentAt, cooldownDate)
            )
        )

    const notifiedSet = new Set(recentlyNotified.map((r) => r.customerPhone))

    // 3. Deduplicate by phone number and exclude recently notified
    const phoneMap = new Map<string, string>()
    for (const c of customerOrders) {
        const formatted = formatGhanaPhoneNumber(c.customerPhone)
        if (!notifiedSet.has(formatted) && !notifiedSet.has(c.customerPhone) && !phoneMap.has(formatted)) {
            phoneMap.set(formatted, c.customerName)
        }
    }

    return Array.from(phoneMap.entries()).map(([phone, name]) => ({ phone, name }))
}

/**
 * Returns the count of eligible customers waiting for a restock notification.
 * Used by the backoffice UI to show the "📲 X customers waiting" indicator.
 */
export async function getWaitingCustomerCount(
    inventoryId: string,
    orgId: string
): Promise<number> {
    const customers = await getEligibleCustomers(inventoryId, orgId)
    return customers.length
}

/**
 * Sends restock SMS notifications to all eligible customers for a given inventory item.
 * This should only be called when stock transitions from 0 → positive.
 * Runs as fire-and-forget to avoid blocking the vendor's stock-in action.
 */
export async function sendRestockNotificationSMS(
    inventoryId: string,
    orgId: string
): Promise<{ success: boolean; sent: number; errors: number }> {
    if (!BULKCLIX_API_KEY || !BULKCLIX_SENDER_ID) {
        console.warn("BulkClix credentials missing. Restock notifications skipped.")
        return { success: false, sent: 0, errors: 0 }
    }

    try {
        // 1. Get the inventory item details
        const item = await db.query.inventory.findFirst({
            where: and(eq(inventory.id, inventoryId), eq(inventory.clerkOrgId, orgId)),
        })

        if (!item) {
            console.error(`Inventory item ${inventoryId} not found for restock notification.`)
            return { success: false, sent: 0, errors: 0 }
        }

        // 2. Get eligible customers
        const customers = await getEligibleCustomers(inventoryId, orgId)

        if (customers.length === 0) {
            console.log(`No eligible customers for restock notification on "${item.name}".`)
            return { success: true, sent: 0, errors: 0 }
        }

        console.log(`Sending restock SMS for "${item.name}" to ${customers.length} customers...`)

        let sent = 0
        let errors = 0

        // 3. Send SMS to each customer and log the notification
        for (const customer of customers) {
            try {
                const message = `Hi ${customer.name}, great news! ${item.name} is back in stock. Order now: ${APP_URL.replace(/^https?:\/\//, "")}`

                const response = await fetch("https://api.bulkclix.com/api/v1/sms-api/send", {
                    method: "POST",
                    headers: {
                        "x-api-key": BULKCLIX_API_KEY,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sender_id: BULKCLIX_SENDER_ID,
                        message: message,
                        recipients: [customer.phone],
                    }),
                })

                const data = await response.json()

                if (
                    response.ok &&
                    (data.message === "Request Sent" || data.status === "success" || data.status === "Pending")
                ) {
                    // Log successful notification
                    await db.insert(stockNotificationLog).values({
                        id: `sn_${nanoid(10)}`,
                        inventoryId: inventoryId,
                        clerkOrgId: orgId,
                        customerPhone: customer.phone,
                        customerName: customer.name,
                    })
                    sent++
                    console.log(`  ✓ SMS sent to ${customer.phone} (${customer.name})`)
                } else {
                    console.error(`  ✗ SMS failed for ${customer.phone}:`, data)
                    errors++
                }
            } catch (smsError) {
                console.error(`  ✗ SMS error for ${customer.phone}:`, smsError)
                errors++
            }
        }

        console.log(`Restock notification complete for "${item.name}": ${sent} sent, ${errors} failed.`)
        return { success: true, sent, errors }
    } catch (error) {
        console.error("Failed to send restock notifications:", error)
        return { success: false, sent: 0, errors: 0 }
    }
}
