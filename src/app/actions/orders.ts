"use server"

import { db } from "@/db";
import { orders, statusHistory } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";

interface OrderInput {
    id?: string;
    orderNumber: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone: string;
    garmentType?: string;
    itemType?: string;
    pickupDate?: string | null;
    measurements?: string | null;
    metadata?: Record<string, unknown> | null;
    businessType: string;
    currentStatus?: string;
}

export async function createOrder(data: OrderInput) {
    const { userId, orgId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    const orderId = data.id || Math.random().toString(36).substring(2, 9).toUpperCase();

    await db.insert(orders).values({
        id: orderId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        itemType: data.itemType || data.garmentType || "Other",
        pickupDate: data.pickupDate || null,
        measurements: data.measurements || null,
        metadata: data.metadata || {},
        businessType: data.businessType,
        currentStatus: data.currentStatus || "Order Received",
        clerkOrgId: orgId || null,
        userId: userId || null,
    });

    // Add initial status history
    await db.insert(statusHistory).values({
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        orderId: orderId,
        status: data.currentStatus || "Order Received",
        location: "Main Office",
        message: "Order created successfully",
    });

    revalidatePath("/backoffice");
    return { success: true, orderId };
}

export async function updateOrderStatus(orderId: string, status: string, location: string, message: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        // Update order current status
        await tx
            .update(orders)
            .set({
                currentStatus: status,
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // Add to history
        await tx.insert(statusHistory).values({
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            orderId: orderId,
            status: status,
            location: location,
            message: message,
        });
    });

    revalidatePath("/backoffice");
    revalidatePath(`/track/${orderId}`);
    return { success: true };
}

export async function getOrders() {
    const { orgId } = await auth();

    const query = db.select().from(orders);

    if (orgId) {
        query.where(eq(orders.clerkOrgId, orgId));
    }

    return await query.orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
    });
    return order;
}

export async function updateOrder(id: string, data: Partial<OrderInput>) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.update(orders)
        .set({
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            customerEmail: data.customerEmail || null,
            customerPhone: data.customerPhone,
            itemType: data.itemType || data.garmentType,
            pickupDate: data.pickupDate || null,
            measurements: data.measurements || null,
            metadata: data.metadata || {},
            updatedAt: new Date(),
        })
        .where(eq(orders.id, id));

    revalidatePath("/backoffice");
    revalidatePath(`/track/${id}`);
    return { success: true };
}

export async function getOrderWithHistory(id: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
            statusHistory: {
                orderBy: desc(statusHistory.timestamp),
            },
        },
    });

    if (!order) return null;

    // Fetch business details from Clerk if available
    let businessDetails = null;
    if (order.clerkOrgId) {
        try {
            const client = await clerkClient()
            const org = await client.organizations.getOrganization({ organizationId: order.clerkOrgId })
            businessDetails = {
                name: org.name,
                imageUrl: org.imageUrl,
                ...org.publicMetadata
            }
        } catch (e) {
            console.error("Failed to fetch org details from Clerk", e)
        }
    }

    return {
        ...order,
        businessDetails
    };
}

export async function bulkUpdateOrderStatus(orderIds: string[], status: string, location: string, message: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        for (const orderId of orderIds) {
            // Update order current status
            await tx
                .update(orders)
                .set({
                    currentStatus: status,
                    updatedAt: new Date()
                })
                .where(eq(orders.id, orderId));

            // Add to history
            await tx.insert(statusHistory).values({
                id: Math.random().toString(36).substring(2, 9).toUpperCase(),
                orderId: orderId,
                status: status,
                location: location,
                message: message,
            });
        }
    });

    revalidatePath("/backoffice");
    return { success: true };
}
