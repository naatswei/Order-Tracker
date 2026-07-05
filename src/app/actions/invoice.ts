"use server"

import { db } from "@/db"
import { orders, statusHistory } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { getCurrentStaffId } from "./operations"
import { sendOrderStatusSMS } from "@/lib/bulkclix"

export async function generateInvoice(
    orderId: string,
    data: {
        items?: { name: string; quantity: number; price: number }[]
        tax?: number
        deliveryFee?: number
        discount?: number
        dueDate?: string
        paymentMethod?: "online" | "cash"
    }
) {
    const { userId, orgId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
    })

    if (!order) throw new Error("Order not found")

    // Generate invoice number
    const invoiceNumber = `INV-${order.orderNumber.replace(/^[^-]+-/, "")}-${Math.floor(100 + Math.random() * 900)}`
    
    // Calculate totals
    const items = data.items || []
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const tax = data.tax || 0
    const deliveryFee = data.deliveryFee || 0
    const discount = data.discount || 0
    const amountDue = subtotal + tax + deliveryFee - discount

    const currentMetadata = (order.metadata as any) || {}
    const updatedMetadata = {
        ...currentMetadata,
        invoice: {
            invoiceNumber,
            invoiceStatus: "unpaid",
            paymentMethod: data.paymentMethod || "online",
            dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items,
            subtotal,
            tax,
            deliveryFee,
            discount,
            amountDue,
            amountPaid: 0,
            createdAt: new Date().toISOString()
        }
    }

    await db.update(orders)
        .set({
            metadata: updatedMetadata,
            updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

    const staffId = orgId ? await getCurrentStaffId(orgId, userId) : null
    await db.insert(statusHistory).values({
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        orderId: orderId,
        status: order.currentStatus,
        location: "Main Office",
        message: `Invoice ${invoiceNumber} generated for total amount of GH₵ ${amountDue}`,
        staffId: staffId,
    })

    revalidatePath("/backoffice")
    revalidatePath(`/backoffice/order/${orderId}`)
    revalidatePath(`/track/${orderId}`)

    return { success: true }
}

export async function markInvoiceAsPaid(orderId: string, silent: boolean = false) {
    const { userId, orgId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
    })

    if (!order) throw new Error("Order not found")

    const currentMetadata = (order.metadata as any) || {}
    if (!currentMetadata.invoice) throw new Error("No invoice generated for this order")

    const updatedMetadata = {
        ...currentMetadata,
        invoice: {
            ...currentMetadata.invoice,
            invoiceStatus: "paid",
            amountPaid: currentMetadata.invoice.amountDue,
            paidAt: new Date().toISOString()
        }
    }

    await db.update(orders)
        .set({
            metadata: updatedMetadata,
            updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

    const staffId = orgId ? await getCurrentStaffId(orgId, userId) : null
    await db.insert(statusHistory).values({
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        orderId: orderId,
        status: "Payment Confirmed",
        location: "Main Office",
        message: `Invoice ${currentMetadata.invoice.invoiceNumber} marked as paid manually`,
        staffId: staffId,
    })

    await db.update(orders)
        .set({
            currentStatus: "Payment Confirmed",
            updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

    if (!silent) {
        sendOrderStatusSMS(orderId, "Payment Confirmed").catch(err => console.error("Error triggering status SMS:", err));
    }

    revalidatePath("/backoffice")
    revalidatePath(`/backoffice/order/${orderId}`)
    revalidatePath(`/track/${orderId}`)

    return { success: true }
}

export async function updateOrgPaymentSettings(orgId: string, settings: { paystackPublicKey: string; paystackSecretKey: string }) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            ...(org.publicMetadata || {}),
            paystackPublicKey: settings.paystackPublicKey,
            paystackSecretKey: settings.paystackSecretKey
        }
    })

    return { success: true }
}

export async function confirmInvoicePayment(orderId: string, reference: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
    })

    if (!order) throw new Error("Order not found")

    const currentMetadata = (order.metadata as any) || {}
    if (!currentMetadata.invoice) throw new Error("No invoice generated for this order")

    const updatedMetadata = {
        ...currentMetadata,
        invoice: {
            ...currentMetadata.invoice,
            invoiceStatus: "paid",
            amountPaid: currentMetadata.invoice.amountDue,
            paystackReference: reference,
            paidAt: new Date().toISOString()
        }
    }

    await db.update(orders)
        .set({
            metadata: updatedMetadata,
            currentStatus: "Payment Confirmed",
            updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

    sendOrderStatusSMS(orderId, "Payment Confirmed").catch(err => console.error("Error triggering status SMS:", err));

    await db.insert(statusHistory).values({
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        orderId: orderId,
        status: "Payment Confirmed",
        location: "Online",
        message: `Invoice ${currentMetadata.invoice.invoiceNumber} paid successfully online via Paystack`,
        timestamp: new Date()
    })

    revalidatePath(`/track/${orderId}`)
    return { success: true }
}
