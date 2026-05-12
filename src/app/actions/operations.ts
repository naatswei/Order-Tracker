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

    await db.transaction(async (tx) => {
        // Update order current status
        await tx
            .update(orders)
            .set({
                currentStatus: stageName,
                updatedAt: new Date()
            })
            .where(and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId)));

        // Add to history with staff attribution
        await tx.insert(statusHistory).values({
            id: `sh_${nanoid(10)}`,
            orderId: orderId,
            status: stageName,
            location: "Production Line",
            message: message || `Moved to ${stageName}`,
            staffId: staffId, // Automatically attribute to the performing staff member
        });
    });

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
            clerkOrgId: orgId,
            businessType: data.businessType,
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
    const { orgId } = await auth();
    if (!orgId) return [];

    return await db.select().from(inventory).where(eq(inventory.clerkOrgId, orgId)).orderBy(desc(inventory.updatedAt));
}

export async function updateStock(itemId: string, type: "in" | "out" | "adjustment", quantity: string, note?: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        const items = await tx.select().from(inventory).where(and(eq(inventory.id, itemId), eq(inventory.clerkOrgId, orgId)));
        if (items.length === 0) throw new Error("Item not found");
        
        const currentQty = parseFloat(items[0].quantity);
        const changeQty = parseFloat(quantity);
        let newQty = currentQty;

        if (type === "in") newQty += changeQty;
        else if (type === "out") newQty -= changeQty;
        else if (type === "adjustment") newQty = changeQty;

        await tx.update(inventory)
            .set({ quantity: newQty.toString(), updatedAt: new Date() })
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

            // 2. Subtract from physical quantity immediately (Simpler Logic)
            await tx.update(inventory)
                .set({ 
                    quantity: sql`(${inventory.quantity}::float - ${parseFloat(item.quantity)})::text`,
                    updatedAt: new Date() 
                })
                .where(and(eq(inventory.id, item.id), eq(inventory.clerkOrgId, orgId)));

            // 3. Log transaction
            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: item.id,
                type: "out",
                quantity: item.quantity,
                note: `Direct deduction for Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function consumeReservedStock(orderId: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

        // In the simpler model, stock is already subtracted at the "Link" stage.
        // So we just leave this here for potential future status updates.
        return { success: true };

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function releaseReservedStock(orderId: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        const links = await tx.select().from(orderInventoryLinks).where(and(eq(orderInventoryLinks.orderId, orderId), eq(orderInventoryLinks.clerkOrgId, orgId)));
        
        for (const link of links) {
            const qty = parseFloat(link.quantity);

            // Re-add to quantity (Return to Stock)
            await tx.update(inventory)
                .set({ 
                    quantity: sql`(${inventory.quantity}::float + ${qty})::text`,
                    updatedAt: new Date()
                })
                .where(and(eq(inventory.id, link.inventoryId), eq(inventory.clerkOrgId, orgId)));

            await tx.insert(inventoryTransactions).values({
                id: `tr_${nanoid(10)}`,
                inventoryId: link.inventoryId,
                type: "in",
                quantity: link.quantity,
                note: `Returned to stock from Order #${orderId}`,
                clerkOrgId: orgId,
            });
        }
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}
