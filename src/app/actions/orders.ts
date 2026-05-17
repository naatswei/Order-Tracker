"use server"

import { db } from "@/db";
import { orders, statusHistory, inventory } from "@/db/schema";
import { eq, desc, and, or, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getPlanLimits } from "@/lib/plan-config";
import { linkOrderToInventory, consumeReservedStock, releaseReservedStock, syncOrderInventoryLinks } from "./operations";
import { triggerOrderStatusNotification } from "@/lib/web-push";

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
    inventoryItems?: { id: string, quantity: string }[];
}

async function validateSubscription(orgId: string) {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const planName = (org.publicMetadata as any)?.subscriptionPlan;
    const subscriptionStatus = (org.publicMetadata as any)?.subscriptionStatus;
    const subscriptionExpiry = (org.publicMetadata as any)?.subscriptionExpiry;

    // 1. Check Status
    if (!subscriptionStatus || (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing')) {
        throw new Error("Your subscription is inactive. Please upgrade your plan to continue.");
    }

    // 2. Check Expiry
    if (subscriptionExpiry) {
        const expiryDate = new Date(subscriptionExpiry);
        if (new Date() > expiryDate) {
            throw new Error("Your subscription has expired. Please renew your plan to continue.");
        }
    }

    return { planName, orgName: org.name };
}

export async function createOrder(data: OrderInput) {
    const { userId, orgId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    let orgName = "Order";

    // Enforce subscription check and order limit
    if (orgId) {
        const { planName, orgName: validatedOrgName } = await validateSubscription(orgId);
        orgName = validatedOrgName;

        const limits = getPlanLimits(planName);

        if (limits.maxOrders !== Infinity) {
            const [result] = await db.select({ value: count() }).from(orders).where(eq(orders.clerkOrgId, orgId));
            if (result.value >= limits.maxOrders) {
                throw new Error(`Order limit reached (${limits.maxOrders}). Please upgrade your plan to create more orders.`);
            }
        }
    }

    // Auto-generate order number
    let initials = "ORD";
    if (orgName) {
        const words = orgName.split(/\s+/);
        if (words.length > 1) {
            initials = words.map(w => w[0]).join("").toUpperCase().substring(0, 3);
        } else {
            initials = orgName.substring(0, 2).toUpperCase();
        }
    }

    const [countResult] = await db.select({ value: count() })
        .from(orders)
        .where(eq(orders.clerkOrgId, orgId || "unknown"));

    const sequenceNumber = (countResult?.value || 0) + 1;
    const paddedSequence = String(sequenceNumber).padStart(5, '0');
    const generatedOrderNumber = `${initials}-${paddedSequence}`;

    const orderId = data.id || Math.random().toString(36).substring(2, 9).toUpperCase();

    await db.insert(orders).values({
        id: orderId,
        orderNumber: generatedOrderNumber,
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
    // Link inventory items if any
    if (data.inventoryItems && data.inventoryItems.length > 0) {
        await linkOrderToInventory(orderId, data.inventoryItems);
    }

    revalidatePath("/backoffice");
    return { success: true, orderId };
}

export async function updateOrderStatus(orderId: string, status: string, location: string, message: string) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (orgId) {
        await validateSubscription(orgId);
    }

    let orderNumber = "";

    await db.transaction(async (tx) => {
        const orderData = await tx.query.orders.findFirst({
            where: eq(orders.id, orderId)
        });
        if (orderData) {
            orderNumber = orderData.orderNumber;
        }

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

        // Trigger inventory logic based on status
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === "delivered" || lowerStatus === "completed" || lowerStatus === "collected") {
            await consumeReservedStock(orderId, tx);
        } else if (lowerStatus === "cancelled" || lowerStatus === "voided") {
            await releaseReservedStock(orderId, tx);
        }
    });

    if (orderNumber) {
        triggerOrderStatusNotification(orderId, status, orderNumber).catch(console.error);
    }

    revalidatePath("/backoffice");
    revalidatePath(`/track/${orderId}`);
    return { success: true };
}

export async function getOrders() {
    try {
        const { orgId } = await auth();

        const query = db.select().from(orders);

        if (orgId) {
            query.where(eq(orders.clerkOrgId, orgId));
        }

        return await query.orderBy(desc(orders.createdAt));
    } catch (error: any) {
        console.error("Failed to get orders server-side:", error);
        return [
            {
                id: "error",
                orderNumber: "ERR",
                customerName: "Error",
                customerPhone: "Error",
                itemType: "Error",
                businessType: "Error",
                currentStatus: "Error",
                createdAt: new Date(),
                updatedAt: new Date(),
                __isError: true,
                message: error?.message || String(error)
            } as any
        ];
    }
}

export async function getOrderCount() {
    const { orgId } = await auth();
    if (!orgId) return 0;

    const [result] = await db.select({ value: count() }).from(orders).where(eq(orders.clerkOrgId, orgId));
    return result.value;
}

export async function getOrderById(id: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
    });
    return order;
}

export async function updateOrder(id: string, data: Partial<OrderInput>) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (orgId) {
        await validateSubscription(orgId);
    }

    await db.transaction(async (tx) => {
        await tx.update(orders)
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

        // Sync inventory links if provided
        if (data.inventoryItems) {
            await syncOrderInventoryLinks(id, data.inventoryItems, tx);
        }
    });

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
            inventoryLinks: {
                with: {
                    inventoryItem: true
                }
            }
        },
    });

    if (!order) return null;

    // Fetch business details from Clerk if available
    let businessDetails: any = null;
    let messagingEnabled = true;

    if (order.clerkOrgId) {
        try {
            const client = await clerkClient()
            const org = await client.organizations.getOrganization({ organizationId: order.clerkOrgId })
            businessDetails = {
                name: org.name,
                imageUrl: org.hasImage ? org.imageUrl : null,
                ...org.publicMetadata
            }

            // Check messaging plan limit
            const planName = org.publicMetadata?.subscriptionPlan as string | undefined
            const limits = getPlanLimits(planName)
            messagingEnabled = limits.messaging
        } catch (e) {
            console.error("Failed to fetch org details from Clerk", e)
        }
    }

    // Fetch all inventory items for this business to show public availability
    let allBusinessInventory: any[] = [];
    if (order.clerkOrgId) {
        allBusinessInventory = await db.select()
            .from(inventory)
            .where(eq(inventory.clerkOrgId, order.clerkOrgId))
            .orderBy(desc(inventory.updatedAt));
    }

    return {
        ...order,
        businessDetails,
        messagingEnabled,
        allBusinessInventory
    };
}

export async function bulkUpdateOrderStatus(orderIds: string[], status: string, location: string, message: string) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (orgId) {
        await validateSubscription(orgId);
    }

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
            // Trigger inventory logic based on status
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === "delivered" || lowerStatus === "completed" || lowerStatus === "collected") {
                await consumeReservedStock(orderId, tx);
            } else if (lowerStatus === "cancelled" || lowerStatus === "voided") {
                await releaseReservedStock(orderId, tx);
            }
        }
    });

    revalidatePath("/backoffice");
    return { success: true };
}
