"use server"

import { db } from "@/db"
import { customerMessages, orders } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"

export async function submitCustomerMessage(data: {
    orderId: string
    subject: string
    message: string
}) {
    try {
        // Find the order to get the necessary organization context
        const orderRecord = await db.query.orders.findFirst({
            where: eq(orders.id, data.orderId)
        })

        if (!orderRecord) {
            throw new Error("Order not found")
        }

        if (!orderRecord.clerkOrgId) {
            throw new Error("Order is not associated with any organization")
        }

        await db.insert(customerMessages).values({
            id: nanoid(),
            orderId: orderRecord.id,
            clerkOrgId: orderRecord.clerkOrgId,
            customerName: orderRecord.customerName,
            customerEmail: orderRecord.customerEmail,
            customerPhone: orderRecord.customerPhone,
            subject: data.subject,
            message: data.message,
            isRead: "false"
        })

        return { success: true }
    } catch (error: any) {
        console.error("Error submitting customer message:", error)
        return { error: error.message || "Failed to submit message" }
    }
}

export async function getInboxMessages(orgId: string) {
    try {
        const { userId } = await auth()
        if (!userId) {
            throw new Error("Unauthorized")
        }

        const messages = await db.query.customerMessages.findMany({
            where: eq(customerMessages.clerkOrgId, orgId),
            orderBy: [desc(customerMessages.createdAt)],
            with: {
                order: true
            }
        })

        return { messages }
    } catch (error: any) {
        console.error("Error fetching inbox messages:", error)
        return { error: error.message || "Failed to fetch messages" }
    }
}

export async function markMessageAsRead(messageId: string) {
    try {
        const { userId } = await auth()
        if (!userId) {
            throw new Error("Unauthorized")
        }

        await db.update(customerMessages)
            .set({ isRead: "true" })
            .where(eq(customerMessages.id, messageId))

        revalidatePath("/backoffice/inbox")
        return { success: true }
    } catch (error: any) {
        console.error("Error marking message as read:", error)
        return { error: error.message || "Failed to update message" }
    }
}
