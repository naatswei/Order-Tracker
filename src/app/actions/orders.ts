"use server"

import { db } from "@/db";
import { orders, statusHistory, inventory } from "@/db/schema";
import { eq, desc, and, or, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getPlanLimits } from "@/lib/plan-config";
import { linkOrderToInventory, consumeReservedStock, releaseReservedStock, syncOrderInventoryLinks, getCurrentStaffId } from "./operations";
import { triggerOrderStatusNotification } from "@/lib/web-push";
import { sendOrderTrackingSMS, sendOrderStatusSMS } from "@/lib/bulkclix";

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
    paymentMethod?: "online" | "cash";
    invoiceItems?: { name: string; quantity: number; price: number }[];
    tax?: number;
    deliveryFee?: number;
    discount?: number;
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

export async function createOrder(data: OrderInput): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
        const { userId, orgId } = await auth();

        if (!userId) {
            return { success: false, error: "Unauthorized" };
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
                    return { success: false, error: `Order limit reached (${limits.maxOrders}). Please upgrade your plan to create more orders.` };
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
        const staffId = orgId ? await getCurrentStaffId(orgId, userId) : null;
        await db.insert(statusHistory).values({
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            orderId: orderId,
            status: data.currentStatus || "Order Received",
            location: "Main Office",
            message: "Order created successfully",
            staffId: staffId,
        });
        // Link inventory items if any
        if (data.inventoryItems && data.inventoryItems.length > 0) {
            await linkOrderToInventory(orderId, data.inventoryItems);
        }

        // Generate invoice if paymentMethod is provided
        if (data.paymentMethod) {
            const { generateInvoice, markInvoiceAsPaid } = await import("./invoice");
            try {
                // Fetch defaults from Clerk organization metadata
                let defaultTax = data.tax || 0;
                let defaultDelivery = data.deliveryFee || 0;
                let defaultDiscount = data.discount || 0;

                if (orgId) {
                    const client = await clerkClient();
                    const org = await client.organizations.getOrganization({ organizationId: orgId });
                    const metadata = org.publicMetadata as any || {};
                    
                    const subtotal = (data.invoiceItems || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const taxPercent = parseFloat(metadata.defaultTaxRate || "0");
                    
                    defaultTax = data.tax !== undefined ? data.tax : ((subtotal * taxPercent) / 100);
                    defaultDelivery = data.deliveryFee !== undefined ? data.deliveryFee : parseFloat(metadata.defaultDeliveryFee || "0");
                    defaultDiscount = data.discount !== undefined ? data.discount : parseFloat(metadata.defaultDiscount || "0");
                }

                await generateInvoice(orderId, {
                    items: data.invoiceItems || [],
                    paymentMethod: data.paymentMethod,
                    tax: defaultTax,
                    deliveryFee: defaultDelivery,
                    discount: defaultDiscount
                });

                if (data.paymentMethod === "cash") {
                    await markInvoiceAsPaid(orderId, true); // silent = true
                }
            } catch (invoiceErr) {
                console.error("Error generating/paying invoice inside createOrder server action:", invoiceErr);
            }
        }

        // Trigger Hubtel/BulkClix SMS notification to customer in the background
        sendOrderTrackingSMS(orderId).catch(err => console.error("Error triggering tracking SMS:", err));

        revalidatePath("/backoffice");
        return { success: true, orderId };
    } catch (error: any) {
        console.error("Server Action Error (createOrder):", error);
        return { success: false, error: error?.message || "Failed to create order" };
    }
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

        const staffId = orgId ? await getCurrentStaffId(orgId, userId) : null;

        // Add to history
        await tx.insert(statusHistory).values({
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            orderId: orderId,
            status: status,
            location: location,
            message: message,
            staffId: staffId,
        });

        // Trigger inventory logic based on status
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === "delivered" || lowerStatus === "completed" || lowerStatus === "collected" || lowerStatus === "payment confirmed" || lowerStatus === "paid") {
            await consumeReservedStock(orderId, tx);
        } else if (lowerStatus === "cancelled" || lowerStatus === "voided") {
            await releaseReservedStock(orderId, tx);
        }
    });

    if (orderNumber) {
        triggerOrderStatusNotification(orderId, status, orderNumber).catch(console.error);
        sendOrderStatusSMS(orderId, status).catch(err => console.error("Error triggering status SMS:", err));
    }

    revalidatePath("/backoffice");
    revalidatePath(`/track/${orderId}`);
    return { success: true };
}

export async function getOrders() {
    try {
        const { orgId } = await auth();

        const allOrders = await db.query.orders.findMany({
            where: orgId ? eq(orders.clerkOrgId, orgId) : undefined,
            orderBy: desc(orders.createdAt),
            with: {
                inventoryLinks: {
                    with: {
                        inventoryItem: true
                    }
                }
            }
        });

        return allOrders;
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

export async function updateOrder(id: string, data: Partial<OrderInput>): Promise<{ success: boolean; error?: string }> {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

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
    } catch (error: any) {
        console.error("Server Action Error (updateOrder):", error);
        return { success: false, error: error?.message || "Failed to update order" };
    }
}

export async function getOrderWithHistory(id: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
            statusHistory: {
                orderBy: desc(statusHistory.timestamp),
                with: {
                    performer: true
                }
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

    // Fetch all inventory items for this business to show public availability (skip for logistics)
    let allBusinessInventory: any[] = [];
    if (order.clerkOrgId && order.businessType !== "logistics") {
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
            sendOrderStatusSMS(orderId, status).catch(err => console.error("Error triggering status SMS:", err));
        }
    });

    revalidatePath("/backoffice");
    return { success: true };
}

// --- Public Rider Status Update (No auth required — for rider SMS action links) ---

const ALLOWED_RIDER_STATUSES = [
    "Picked Up",
    "In Transit", 
    "Dispatched",
    "Delivered",
] as const;

export async function riderUpdateStatus(
    orderId: string, 
    status: string,
    verificationCode?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate the status is one of the allowed rider actions
        if (!ALLOWED_RIDER_STATUSES.includes(status as any)) {
            return { success: false, error: "Invalid status for rider update" };
        }

        // Fetch order to verify it exists
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        // Only allow updates for logistics orders
        if (order.businessType !== "logistics") {
            return { success: false, error: "Rider updates are only available for logistics orders" };
        }

        // Prevent updating already delivered or cancelled orders
        const currentLower = order.currentStatus.toLowerCase();
        if (currentLower === "delivered" || currentLower === "cancelled" || currentLower === "returned to sender") {
            return { success: false, error: `Order is already ${order.currentStatus}` };
        }

        // Proof of Delivery: Validate customer's Ref number on delivery handover
        if (status === "Delivered") {
            if (!verificationCode || verificationCode.trim() === "") {
                return { success: false, error: "Please enter the customer's Ref number to confirm delivery." };
            }
            const cleanEntered = verificationCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
            const expectedRef = order.id.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
            const cleanOrderNumber = order.orderNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

            const isMatch = cleanEntered === expectedRef || 
                            cleanEntered === cleanOrderNumber || 
                            order.id.toUpperCase().startsWith(cleanEntered);

            if (!isMatch) {
                return { 
                    success: false, 
                    error: "Incorrect code. Please ask the customer for the Ref number shown on their tracking link." 
                };
            }
        }

        await db.transaction(async (tx) => {
            // Update order status
            await tx
                .update(orders)
                .set({
                    currentStatus: status,
                    updatedAt: new Date(),
                })
                .where(eq(orders.id, orderId));

            // Add status history entry
            await tx.insert(statusHistory).values({
                id: Math.random().toString(36).substring(2, 9).toUpperCase(),
                orderId: orderId,
                status: status,
                location: "Rider Update",
                message: `Status updated by rider: ${status}`,
                staffId: order.assignedStaffId,
            });

            // Consume stock on delivery for inventory-tracked businesses (skip for logistics)
            if (status === "Delivered" && order.businessType !== "logistics") {
                await consumeReservedStock(orderId, tx, order.clerkOrgId || undefined);
            }
        });

        // Trigger notifications in background
        triggerOrderStatusNotification(orderId, status, order.orderNumber).catch(console.error);
        sendOrderStatusSMS(orderId, status).catch(err => console.error("Error triggering status SMS:", err));

        revalidatePath("/backoffice");
        revalidatePath(`/track/${orderId}`);
        revalidatePath(`/rider/${orderId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Rider status update error:", error);
        return { success: false, error: error?.message || "Failed to update status" };
    }
}
