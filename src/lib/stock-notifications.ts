"use server"

import { db } from "@/db"
import { orders, orderInventoryLinks, inventory, stockNotificationLog } from "@/db/schema"
import { eq, and, sql, gt } from "drizzle-orm"
import { nanoid } from "nanoid"
import { clerkClient } from "@clerk/nextjs/server"

const BULKCLIX_API_KEY = process.env.BULKCLIX_API_KEY
const BULKCLIX_SENDER_ID = process.env.BULKCLIX_SENDER_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.otracker.net"

// 7-day cooldown in milliseconds
const NOTIFICATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

// Minimum orders required for a customer to receive a restock alert.
// Reverted to 3 (loyal customers who ordered 3+ times).
// Can be customized via RESTOCK_MIN_ORDERS env variable.
const MIN_ORDERS_THRESHOLD = parseInt(process.env.RESTOCK_MIN_ORDERS || "3", 10) || 3

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
 * Ensures the stock_notification_log table exists in PostgreSQL without requiring manual migration pushes.
 */
export async function ensureNotificationTable() {
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "stock_notification_log" (
                "id" text PRIMARY KEY NOT NULL,
                "inventory_id" text NOT NULL,
                "clerk_org_id" text NOT NULL,
                "customer_phone" text NOT NULL,
                "customer_name" text,
                "sent_at" timestamp DEFAULT now() NOT NULL
            );
        `)
    } catch (e) {
        console.warn("Could not ensure stock_notification_log table exists:", e)
    }
}

/**
 * Finds customers who have ordered a specific inventory item 3+ times,
 * either through formal orderInventoryLinks or matching by itemType name.
 * Excludes customers already notified within the 7-day cooldown window.
 */
export async function getEligibleCustomers(
    inventoryId: string,
    orgId: string
): Promise<{ customers: { phone: string; name: string }[]; maxOrdersFound: number }> {
    await ensureNotificationTable()

    // 1. Get the inventory item to also allow matching on item name
    const item = await db.query.inventory.findFirst({
        where: and(eq(inventory.id, inventoryId), eq(inventory.clerkOrgId, orgId)),
    })

    // 2. Fetch orders linked through orderInventoryLinks
    const linkedOrders = await db
        .select({
            customerPhone: orders.customerPhone,
            customerName: orders.customerName,
            orderId: orders.id,
        })
        .from(orderInventoryLinks)
        .innerJoin(orders, eq(orderInventoryLinks.orderId, orders.id))
        .where(
            and(
                eq(orderInventoryLinks.inventoryId, inventoryId),
                eq(orderInventoryLinks.clerkOrgId, orgId)
            )
        )

    // 3. Fetch orders matching item name directly (in case vendor typed item into order without inventory linking)
    let namedOrders: { customerPhone: string; customerName: string; orderId: string }[] = []
    if (item?.name) {
        namedOrders = await db
            .select({
                customerPhone: orders.customerPhone,
                customerName: orders.customerName,
                orderId: orders.id,
            })
            .from(orders)
            .where(
                and(
                    eq(orders.clerkOrgId, orgId),
                    sql`lower(${orders.itemType}) = lower(${item.name})`
                )
            )
    }

    // 4. Group and count distinct orders per formatted phone number
    const phoneOrderMap = new Map<string, { name: string; orderIds: Set<string> }>()

    for (const ord of [...linkedOrders, ...namedOrders]) {
        if (!ord.customerPhone) continue
        const formatted = formatGhanaPhoneNumber(ord.customerPhone)
        if (!formatted) continue

        if (!phoneOrderMap.has(formatted)) {
            phoneOrderMap.set(formatted, {
                name: ord.customerName || "Customer",
                orderIds: new Set<string>(),
            })
        }
        phoneOrderMap.get(formatted)!.orderIds.add(ord.orderId)
    }

    let maxOrdersFound = 0
    for (const val of phoneOrderMap.values()) {
        if (val.orderIds.size > maxOrdersFound) {
            maxOrdersFound = val.orderIds.size
        }
    }

    // Filter to customers with at least MIN_ORDERS_THRESHOLD order(s)
    const qualifiedPhones: { phone: string; name: string }[] = []
    for (const [phone, data] of phoneOrderMap.entries()) {
        if (data.orderIds.size >= MIN_ORDERS_THRESHOLD) {
            qualifiedPhones.push({ phone, name: data.name })
        }
    }

    if (qualifiedPhones.length === 0) {
        return { customers: [], maxOrdersFound }
    }

    // 5. Exclude customers notified within the cooldown period
    let notifiedSet = new Set<string>()
    try {
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
        notifiedSet = new Set(recentlyNotified.map((r) => r.customerPhone))
    } catch (e) {
        console.warn("Could not query cooldown table; proceeding without cooldown check:", e)
    }

    const filtered = qualifiedPhones.filter((c) => !notifiedSet.has(c.phone))
    return { customers: filtered, maxOrdersFound }
}

/**
 * Returns the count of eligible customers waiting for a restock notification.
 * Used by the backoffice UI to show the "📲 X waiting" indicator.
 */
export async function getWaitingCustomerCount(
    inventoryId: string,
    orgId: string
): Promise<number> {
    const { customers } = await getEligibleCustomers(inventoryId, orgId)
    return customers.length
}

/**
 * Sends restock SMS notifications to all eligible customers for a given inventory item.
 * Called when stock transitions from 0 → positive.
 */
export async function sendRestockNotificationSMS(
    inventoryId: string,
    orgId: string
): Promise<{ success: boolean; sent: number; errors: number; eligible: number; reason?: string }> {
    if (!BULKCLIX_API_KEY || !BULKCLIX_SENDER_ID) {
        console.warn("BulkClix credentials missing. Restock notifications skipped.")
        return {
            success: false,
            sent: 0,
            errors: 0,
            eligible: 0,
            reason: "BulkClix credentials not configured in environment variables",
        }
    }

    try {
        const item = await db.query.inventory.findFirst({
            where: and(eq(inventory.id, inventoryId), eq(inventory.clerkOrgId, orgId)),
        })

        if (!item) {
            return {
                success: false,
                sent: 0,
                errors: 0,
                eligible: 0,
                reason: "Inventory item not found",
            }
        }

        const { customers, maxOrdersFound } = await getEligibleCustomers(inventoryId, orgId)

        if (customers.length === 0) {
            let reason = `No customers with ${MIN_ORDERS_THRESHOLD}+ order(s) found for this item.`
            if (maxOrdersFound > 0) {
                reason = `Customers found for this item, but highest order count is ${maxOrdersFound} (requires ${MIN_ORDERS_THRESHOLD}+ order(s) to trigger).`
            }
            console.log(`[Restock SMS] ${reason}`)
            return {
                success: true,
                sent: 0,
                errors: 0,
                eligible: 0,
                reason,
            }
        }

        console.log(`[Restock SMS] Sending for "${item.name}" to ${customers.length} eligible customer(s)...`)

        let storeName = "our store"
        try {
            const client = await clerkClient()
            const org = await client.organizations.getOrganization({ organizationId: orgId })
            if (org?.name) {
                storeName = org.name
            }
        } catch (e) {
            console.warn("Could not fetch store name from Clerk:", e)
        }

        let sent = 0
        let errors = 0

        for (const customer of customers) {
            try {
                const message = `Hi ${customer.name}, great news! ${item.name} is back in stock from your favorite store ${storeName}.`

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
                    try {
                        await db.insert(stockNotificationLog).values({
                            id: `sn_${nanoid(10)}`,
                            inventoryId: inventoryId,
                            clerkOrgId: orgId,
                            customerPhone: customer.phone,
                            customerName: customer.name,
                        })
                    } catch (dbErr) {
                        console.warn("Could not log sent notification to DB:", dbErr)
                    }
                    sent++
                    console.log(`[Restock SMS] ✓ Sent to ${customer.phone} (${customer.name})`)
                } else {
                    console.error(`[Restock SMS] ✗ Failed for ${customer.phone}:`, data)
                    errors++
                }
            } catch (smsError) {
                console.error(`[Restock SMS] ✗ Error for ${customer.phone}:`, smsError)
                errors++
            }
        }

        return {
            success: sent > 0,
            sent,
            errors,
            eligible: customers.length,
            reason: sent > 0 ? `Sent to ${sent} customer(s)` : "Failed to deliver SMS via BulkClix",
        }
    } catch (error: any) {
        console.error("Failed to send restock notifications:", error)
        return {
            success: false,
            sent: 0,
            errors: 0,
            eligible: 0,
            reason: error?.message || "Internal error sending notifications",
        }
    }
}
