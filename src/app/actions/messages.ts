"use server"

import { db } from "@/db"
import { customerMessages, orders } from "@/db/schema"
import { eq, desc, and, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"

export async function submitCustomerMessage(data: {
    orderId: string
    subject: string
    message: string
    threadId?: string // If replying to an existing thread
}) {
    try {
        const orderRecord = await db.query.orders.findFirst({
            where: eq(orders.id, data.orderId)
        })

        if (!orderRecord) {
            throw new Error("Order not found")
        }

        if (!orderRecord.clerkOrgId) {
            throw new Error("Order is not associated with any organization")
        }

        const messageId = nanoid()

        await db.insert(customerMessages).values({
            id: messageId,
            orderId: orderRecord.id,
            clerkOrgId: orderRecord.clerkOrgId,
            threadId: data.threadId || messageId, // Use existing thread or start new one
            sender: "customer",
            customerName: orderRecord.customerName,
            customerEmail: orderRecord.customerEmail,
            customerPhone: orderRecord.customerPhone,
            subject: data.subject,
            message: data.message,
            isRead: "false"
        })

        return { success: true, messageId, threadId: data.threadId || messageId }
    } catch (error: any) {
        console.error("Error submitting customer message:", error)
        return { error: error.message || "Failed to submit message" }
    }
}

export async function submitBusinessReply(data: {
    threadId: string
    orderId: string
    message: string
}) {
    try {
        const { userId } = await auth()
        if (!userId) {
            throw new Error("Unauthorized")
        }

        const orderRecord = await db.query.orders.findFirst({
            where: eq(orders.id, data.orderId)
        })

        if (!orderRecord) {
            throw new Error("Order not found")
        }

        if (!orderRecord.clerkOrgId) {
            throw new Error("Order not associated with any organization")
        }

        const messageId = nanoid()

        await db.insert(customerMessages).values({
            id: messageId,
            orderId: orderRecord.id,
            clerkOrgId: orderRecord.clerkOrgId,
            threadId: data.threadId,
            sender: "business",
            customerName: orderRecord.customerName,
            customerEmail: orderRecord.customerEmail,
            customerPhone: orderRecord.customerPhone,
            subject: "Reply",
            message: data.message,
            isRead: "true" // Business messages are already "read" by the business
        })

        revalidatePath("/backoffice/inbox")
        return { success: true }
    } catch (error: any) {
        console.error("Error submitting business reply:", error)
        return { error: error.message || "Failed to send reply" }
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

export async function getThreadMessages(orderId: string) {
    try {
        const messages = await db.query.customerMessages.findMany({
            where: eq(customerMessages.orderId, orderId),
            orderBy: [asc(customerMessages.createdAt)],
        })

        return { messages }
    } catch (error: any) {
        console.error("Error fetching thread messages:", error)
        return { error: error.message || "Failed to fetch messages" }
    }
}

export async function getUnreadCount(orgId: string) {
    try {
        const { userId } = await auth()
        if (!userId) return 0

        const result = await db.query.customerMessages.findMany({
            where: (cm, { eq, and }) => and(
                eq(cm.clerkOrgId, orgId),
                eq(cm.isRead, "false"),
                eq(cm.sender, "customer")
            )
        })

        return result.length
    } catch (error) {
        console.error("Error getting unread count:", error)
        return 0
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

        revalidatePath("/backoffice/profile")
        return { success: true }
    } catch (error: any) {
        console.error("Error marking message as read:", error)
        return { error: error.message || "Failed to update message" }
    }
}

export async function markThreadAsRead(threadId: string) {
    try {
        const { userId } = await auth()
        if (!userId) {
            throw new Error("Unauthorized")
        }

        await db.update(customerMessages)
            .set({ isRead: "true" })
            .where(and(
                eq(customerMessages.threadId, threadId),
                eq(customerMessages.sender, "customer")
            ))

        revalidatePath("/backoffice/inbox")
        return { success: true }
    } catch (error: any) {
        console.error("Error marking thread as read:", error)
        return { error: error.message || "Failed to update thread" }
    }
}
