"use server"

import { db } from "@/db";
import { orders, staff, workflows, statusHistory, inventory, inventoryTransactions, orderInventoryLinks } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";

// --- Helpers ---

async function getCurrentStaffId(orgId: string, userId: string) {
    const s = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.clerkUserId, userId))
    });
    return s?.id || null;
}

// --- Staff Management ---

export async function addStaff(data: { name: string, role?: string, email?: string, phone?: string, department?: string, reportsToId?: string }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    await db.insert(staff).values({
        id: `staff_${nanoid(10)}`,
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        phone: data.phone || null,
        department: data.department || null,
        reportsToId: data.reportsToId || null,
        clerkOrgId: orgId,
    });

    revalidatePath("/backoffice/staff");
    return { success: true };
}

export async function updateStaff(id: string, data: Partial<{ name: string, role: string, email: string, phone: string, department: string, reportsToId: string }>) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.update(staff)
        .set({ ...data })
        .where(and(eq(staff.id, id), eq(staff.clerkOrgId, orgId)));

    revalidatePath("/backoffice/staff");
    return { success: true };
}

export async function getStaff() {
    const { orgId } = await auth();
    if (!orgId) return [];

    return await db.select().from(staff).where(eq(staff.clerkOrgId, orgId)).orderBy(desc(staff.createdAt));
}

export async function removeStaff(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.delete(staff).where(and(eq(staff.id, id), eq(staff.clerkOrgId, orgId)));
    revalidatePath("/backoffice/staff");
    return { success: true };
}

// --- Workflow Management ---

export async function addWorkflowStage(name: string, position: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // Standardize name for comparison
    const standardizedName = name.trim();

    // Check for duplicates
    const existing = await db.query.workflows.findFirst({
        where: and(
            eq(workflows.clerkOrgId, orgId), 
            eq(workflows.name, standardizedName)
        )
    });

    if (existing) {
        return { error: `The stage "${standardizedName}" already exists in your workflow.` };
    }

    await db.insert(workflows).values({
        id: `wf_${nanoid(10)}`,
        name: standardizedName,
        position,
        clerkOrgId: orgId,
    });

    revalidatePath("/backoffice/operations");
    return { success: true };
}

export async function getWorkflowStages() {
    const { orgId } = await auth();
    if (!orgId) return [];

    return await db.select().from(workflows).where(eq(workflows.clerkOrgId, orgId)).orderBy(asc(workflows.position));
}

export async function removeWorkflowStage(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.clerkOrgId, orgId)));
    revalidatePath("/backoffice/operations");
    return { success: true };
}

// --- Order Operations ---

export async function assignOrder(orderId: string, staffId: string | null) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.update(orders)
        .set({ assignedStaffId: staffId, updatedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId)));

    revalidatePath("/backoffice");
    revalidatePath("/backoffice/operations");
    return { success: true };
}

export async function updateOrderStage(orderId: string, stageName: string, message?: string) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const staffId = await getCurrentStaffId(orgId, userId);

    let orderNumber = "";

    await db.transaction(async (tx) => {
        // 1. Get the current order to see its old status
        const currentOrder = await tx.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId))
        });

        if (!currentOrder) throw new Error("Order not found");
        orderNumber = currentOrder.orderNumber;

        // 2. Update order current status
        await tx
            .update(orders)
            .set({
                currentStatus: stageName,
                updatedAt: new Date()
            })
            .where(and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId)));

        // 3. Add to history with staff attribution
        await tx.insert(statusHistory).values({
            id: `sh_${nanoid(10)}`,
            orderId: orderId,
            status: stageName,
            location: "Production Line",
            message: message || `Moved to ${stageName}`,
            staffId: staffId,
        });

        // 4. Trigger inventory logic based on status transition
        const oldStatus = (currentOrder.currentStatus || "").toLowerCase();
        const newStatus = stageName.toLowerCase();

        const isDelivered = (s: string) => s === "delivered" || s === "completed" || s === "collected";
        const isCancelled = (s: string) => s === "cancelled" || s === "voided" || s === "returned";

        if (!isDelivered(oldStatus) && isDelivered(newStatus)) {
            // Moving TO delivered - consume the reserved stock
            await consumeReservedStock(orderId, tx);
        } else if (isDelivered(oldStatus) && !isDelivered(newStatus)) {
            // Moving BACK FROM delivered - put back into reserved/physical
            await releaseReservedStock(orderId, tx);
        } else if (isCancelled(newStatus)) {
            // Cancelled - release reserved stock
            await releaseReservedStock(orderId, tx);
        }
    });

    if (orderNumber) {
        // Dynamic import to prevent potential circular dependency
        import("@/lib/web-push").then(({ triggerOrderStatusNotification }) => {
            triggerOrderStatusNotification(orderId, stageName, orderNumber).catch(console.error);
        });
    }

    revalidatePath("/backoffice");
    revalidatePath("/backoffice/operations");
    revalidatePath(`/track/${orderId}`);
    return { success: true };
}

// --- Inventory Management ---

export async function addInventoryItem(data: { name: string, quantity: string, category?: string, unit?: string, sku?: string, minStock?: string, businessType: string }) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const itemId = `inv_${nanoid(10)}`;

    await db.transaction(async (tx) => {
        await tx.insert(inventory).values({
            id: itemId,
            name: data.name,
            quantity: data.quantity,
            category: data.category || null,
            unit: data.unit || null,
            sku: data.sku || null,
            minStock: data.minStock || "0",
            reserved: "0",
            unitCost: (data as any).unitCost || "0",
            sellingPrice: (data as any).sellingPrice || "0",
            pricingTiers: (data as any).pricingTiers || null,
            totalEntered: data.quantity, // Initial entry
            totalSold: "0",
            clerkOrgId: orgId,
            businessType: data.businessType,
            branchId: (data as any).branchId,
        });

        // Add initial transaction
        await tx.insert(inventoryTransactions).values({
            id: `tr_${nanoid(10)}`,
            inventoryId: itemId,
            type: "in",
            quantity: data.quantity,
            note: "Initial stock entry",
            clerkOrgId: orgId,
        });
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function getInventory() {
    try {
        const { orgId } = await auth();
        if (!orgId) return [];

        return await db.select().from(inventory).where(eq(inventory.clerkOrgId, orgId)).orderBy(desc(inventory.updatedAt));
    } catch (error: any) {
        console.error("Failed to get inventory server-side:", error);
        return [
            {
                id: "error",
                name: "Error loading inventory",
                quantity: "0",
                businessType: "Error",
                clerkOrgId: "Error",
                createdAt: new Date(),
                updatedAt: new Date(),
                __isError: true,
                message: error?.message || String(error)
            } as any
        ];
    }
}

export async function updateStock(itemId: string, type: "in" | "out" | "adjustment", quantity: string, note?: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        const items = await tx.select().from(inventory).where(and(eq(inventory.id, itemId), eq(inventory.clerkOrgId, orgId)));
        if (items.length === 0) throw new Error("Item not found");
        
        const currentQty = parseFloat(items[0].quantity);
        const changeQty = parseFloat(quantity);
        const currentEntered = parseFloat(items[0].totalEntered || "0");
        let newQty = currentQty;
        let newEntered = currentEntered;

        if (type === "in") {
            newQty += changeQty;
            newEntered += changeQty;
        }
        else if (type === "out") newQty -= changeQty;
        else if (type === "adjustment") newQty = changeQty;

        await tx.update(inventory)
            .set({ 
                quantity: newQty.toString(), 
                totalEntered: newEntered.toString(),
                updatedAt: new Date() 
            })
            .where(and(eq(inventory.id, itemId), eq(inventory.clerkOrgId, orgId)));

        await tx.insert(inventoryTransactions).values({
            id: `tr_${nanoid(10)}`,
            inventoryId: itemId,
            type,
            quantity,
            note: note || `Stock ${type}`,
            clerkOrgId: orgId,
        });
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function getInventoryHistory(itemId: string) {
    const { orgId } = await auth();
    if (!orgId) return [];

    return await db.select()
        .from(inventoryTransactions)
        .where(and(eq(inventoryTransactions.inventoryId, itemId), eq(inventoryTransactions.clerkOrgId, orgId)))
        .orderBy(desc(inventoryTransactions.timestamp));
}

export async function removeInventoryItem(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.delete(inventory).where(and(eq(inventory.id, id), eq(inventory.clerkOrgId, orgId)));
    revalidatePath("/backoffice/inventory");
    return { success: true };
}

// --- Order & Inventory Linking ---

export async function linkOrderToInventory(orderId: string, inventoryItems: { id: string, quantity: string }[]) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        for (const item of inventoryItems) {
            // 1. Create the link
            await tx.insert(orderInventoryLinks).values({
                id: `link_${nanoid(10)}`,
                orderId,
                inventoryId: item.id,
                quantity: item.quantity,
                clerkOrgId: orgId,
            });

            // 2. Add to RESERVED instead of physical quantity deduction
            await tx.update(inventory)
                .set({ 
                    reserved: sql`(${inventory.reserved}::float + ${parseFloat(item.quantity)})::text`,
                    updatedAt: new Date() 
                })
                .where(and(eq(inventory.id, item.id), eq(inventory.clerkOrgId, orgId)));

            // 3. Log transaction
            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: item.id,
                type: "adjustment",
                quantity: item.quantity,
                note: `Stock reserved for Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function consumeReservedStock(orderId: string, providedTx?: any) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const logic = async (tx: any) => {
        const links = await tx.select().from(orderInventoryLinks).where(and(eq(orderInventoryLinks.orderId, orderId), eq(orderInventoryLinks.clerkOrgId, orgId)));
        
        for (const link of links) {
            const qty = parseFloat(link.quantity);

            // Subtract from physical quantity AND reserved, increment totalSold
            await tx.update(inventory)
                .set({ 
                    quantity: sql`(${inventory.quantity}::float - ${qty})::text`,
                    reserved: sql`(${inventory.reserved}::float - ${qty})::text`,
                    totalSold: sql`(${inventory.totalSold}::float + ${qty})::text`,
                    updatedAt: new Date()
                })
                .where(and(eq(inventory.id, link.inventoryId), eq(inventory.clerkOrgId, orgId)));

            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: link.inventoryId,
                type: "out",
                quantity: link.quantity,
                note: `Delivered: Deducted from physical stock for Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    };

    if (providedTx) {
        await logic(providedTx);
    } else {
        await db.transaction(logic);
    }

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function releaseReservedStock(orderId: string, providedTx?: any) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const logic = async (tx: any) => {
        const links = await tx.select().from(orderInventoryLinks).where(and(eq(orderInventoryLinks.orderId, orderId), eq(orderInventoryLinks.clerkOrgId, orgId)));
        
        for (const link of links) {
            // Simply subtract from reserved (stock is still there)
            await tx.update(inventory)
                .set({ 
                    reserved: sql`(${inventory.reserved}::float - ${parseFloat(link.quantity)})::text`,
                    updatedAt: new Date()
                })
                .where(and(eq(inventory.id, link.inventoryId), eq(inventory.clerkOrgId, orgId)));

            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: link.inventoryId,
                type: "adjustment",
                quantity: link.quantity,
                note: `Reservation released for Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    };

    if (providedTx) {
        await logic(providedTx);
    } else {
        await db.transaction(logic);
    }

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function syncOrderInventoryLinks(orderId: string, inventoryItems: { id: string, quantity: string }[], tx?: any) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const logic = async (currentTx: any) => {
        // 1. Release existing reservations based on old links
        await releaseReservedStock(orderId, currentTx);
        
        // 2. Delete existing links
        await currentTx.delete(orderInventoryLinks).where(and(eq(orderInventoryLinks.orderId, orderId), eq(orderInventoryLinks.clerkOrgId, orgId)));

        // 3. Create new links and reserve
        for (const item of inventoryItems) {
            await currentTx.insert(orderInventoryLinks).values({
                id: `link_${nanoid(10)}`,
                orderId,
                inventoryId: item.id,
                quantity: item.quantity,
                clerkOrgId: orgId,
            });

            await currentTx.update(inventory)
                .set({ 
                    reserved: sql`(${inventory.reserved}::float + ${parseFloat(item.quantity)})::text`,
                    updatedAt: new Date() 
                })
                .where(and(eq(inventory.id, item.id), eq(inventory.clerkOrgId, orgId)));

            await currentTx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: item.id,
                type: "adjustment",
                quantity: item.quantity,
                note: `Stock updated/reserved for Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    };

    if (tx) {
        await logic(tx);
    } else {
        await db.transaction(logic);
    }

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function bulkAddInventoryItems(items: { name: string, quantity: string, category?: string, unit?: string, sku?: string, minStock?: string, unitCost?: string, businessType: string, pricingTiers?: any }[]) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        for (const item of items) {
            const itemId = `inv_${nanoid(10)}`;
            await tx.insert(inventory).values({
                id: itemId,
                name: item.name,
                quantity: item.quantity,
                category: item.category || null,
                unit: item.unit || null,
                sku: item.sku || null,
                minStock: item.minStock || "0",
                reserved: "0",
                unitCost: item.unitCost || "0",
                sellingPrice: "0",
                pricingTiers: item.pricingTiers || null,
                totalEntered: item.quantity,
                totalSold: "0",
                clerkOrgId: orgId,
                businessType: item.businessType,
            });

            // Add initial transaction
            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: itemId,
                type: "in",
                quantity: item.quantity,
                note: "Bulk excel import entry",
                clerkOrgId: orgId,
            });
        }
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

