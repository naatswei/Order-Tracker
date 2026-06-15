"use server"

import { db } from "@/db";
import { orders, staff, staffAttendance, workflows, statusHistory, inventory, inventoryTransactions, orderInventoryLinks, clientOrganizations, clientPricingOverrides } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { getBusinessConfig } from "@/lib/business-configs";
import { nanoid } from "nanoid";

// --- Helpers ---

export async function getCurrentStaffId(orgId: string, userId: string) {
    const s = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.clerkUserId, userId))
    });
    return s?.id || null;
}

export async function syncCurrentUserStaff() {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) return null;

    // 1. Try to find by clerkUserId
    let s = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.clerkUserId, userId))
    });
    if (s) return s;

    // 2. Try to find by email and link
    try {
        const user = await currentUser();
        if (user && user.emailAddresses.length > 0) {
            const emails = user.emailAddresses.map(e => e.emailAddress.toLowerCase());
            for (const emailVal of emails) {
                const matchedStaff = await db.query.staff.findFirst({
                    where: and(
                        eq(staff.clerkOrgId, orgId),
                        sql`lower(${staff.email}) = ${emailVal}`
                    )
                });
                if (matchedStaff) {
                    await db.update(staff)
                        .set({ clerkUserId: userId })
                        .where(eq(staff.id, matchedStaff.id));
                    
                    revalidatePath("/backoffice/staff");
                    const updated = await db.query.staff.findFirst({
                        where: eq(staff.id, matchedStaff.id)
                    });
                    return updated || null;
                }
            }
            
            // 3. Auto-create if not found by email
            const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Team Member";
            const primaryEmail = user.emailAddresses[0]?.emailAddress || null;
            
            // Determine role based on orgRole
            const staffRole = orgRole === "org:admin" ? "Business Owner" : "Team Member";
            const newStaffId = `staff_${nanoid(10)}`;
            
            await db.insert(staff).values({
                id: newStaffId,
                name: name,
                role: staffRole,
                email: primaryEmail,
                clerkUserId: userId,
                clerkOrgId: orgId,
            });

            revalidatePath("/backoffice/staff");
            
            const newStaff = await db.query.staff.findFirst({
                where: eq(staff.id, newStaffId)
            });
            return newStaff || null;
        }
    } catch (err) {
        console.error("Error auto-linking/creating staff:", err);
    }
    return null;
}


// --- Staff Management ---

export async function addStaff(data: { name: string, role?: string, email?: string, phone?: string, department?: string, reportsToId?: string, pinCode?: string }) {
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
        pinCode: data.pinCode || null,
        clerkOrgId: orgId,
    });

    revalidatePath("/backoffice/staff");
    return { success: true };
}

export async function updateStaff(id: string, data: Partial<{ name: string, role: string, email: string, phone: string, department: string, reportsToId: string, pinCode: string }>) {
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

import { setStaffSession, clearStaffSession } from "@/lib/session";

export async function clockIn(pinCode: string) {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const matchedStaff = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.pinCode, pinCode))
    });

    if (!matchedStaff) return { success: false, error: "Invalid PIN code" };

    await db.insert(staffAttendance).values({
        id: `att_${nanoid(10)}`,
        staffId: matchedStaff.id,
        clerkOrgId: orgId,
        type: "clock_in"
    });

    await setStaffSession(matchedStaff.id, matchedStaff.name);

    return { success: true, staffName: matchedStaff.name };
}

export async function clockOut(pinCode: string) {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const matchedStaff = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.pinCode, pinCode))
    });

    if (!matchedStaff) return { success: false, error: "Invalid PIN code" };

    await db.insert(staffAttendance).values({
        id: `att_${nanoid(10)}`,
        staffId: matchedStaff.id,
        clerkOrgId: orgId,
        type: "clock_out"
    });

    await clearStaffSession();

    return { success: true, staffName: matchedStaff.name };
}

export async function unlockTerminal(pinCode: string) {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const matchedStaff = await db.query.staff.findFirst({
        where: and(eq(staff.clerkOrgId, orgId), eq(staff.pinCode, pinCode))
    });

    if (!matchedStaff) return { success: false, error: "Invalid PIN code" };

    await setStaffSession(matchedStaff.id, matchedStaff.name);
    return { success: true, staffName: matchedStaff.name };
}

export async function lockTerminal() {
    await clearStaffSession();
    return { success: true };
}

// --- Workflow Management ---

async function initializeDefaultWorkflowStagesIfNeeded(orgId: string) {
    const existingStages = await db.select().from(workflows).where(eq(workflows.clerkOrgId, orgId));
    if (existingStages.length > 0) {
        return;
    }

    // Fetch organization businessType from Clerk
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const businessType = org.publicMetadata?.businessType as string || "tailoring";

    const config = getBusinessConfig(businessType);
    const activeStatuses = config.statuses.filter(status => 
        status !== "Completed" && 
        status !== "Delivered" && 
        status !== "Pending" && 
        status !== "Refunded" && 
        status !== "Cancelled" && 
        status !== "Order Cancelled" && 
        status !== "Order Delayed" &&
        status !== "Delayed" &&
        status !== "Returned" &&
        status !== "Returned to Sender" &&
        status !== "On Hold"
    );

    // Insert fallback stages
    for (let i = 0; i < activeStatuses.length; i++) {
        await db.insert(workflows).values({
            id: `wf_${nanoid(10)}`,
            name: activeStatuses[i],
            position: String(i + 1),
            clerkOrgId: orgId,
        });
    }
}

export async function addWorkflowStage(name: string, position: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // Standardize name for comparison
    const standardizedName = name.trim();

    // Initialize default stages if they don't exist in database
    await initializeDefaultWorkflowStagesIfNeeded(orgId);

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

export async function removeWorkflowStage(id: string, name?: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // Initialize default stages if they don't exist in database
    await initializeDefaultWorkflowStagesIfNeeded(orgId);

    if (id && id.startsWith("wf_")) {
        await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.clerkOrgId, orgId)));
    } else if (name) {
        await db.delete(workflows).where(and(eq(workflows.name, name), eq(workflows.clerkOrgId, orgId)));
    }

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
        // 1. Get the current order
        const currentOrder = await tx.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId))
        });

        if (!currentOrder) throw new Error("Order not found");

        // 2. Fetch staff name for audit log
        let performerName = "System";
        if (staffId) {
            const s = await tx.query.staff.findFirst({
                where: eq(staff.id, staffId)
            });
            if (s) performerName = s.name;
        }

        // 3. Update order metadata (internalStage & internalHistory)
        const metadata = (currentOrder.metadata as Record<string, any>) || {};
        const internalHistory = metadata.internalHistory || [];
        
        const historyEntry = {
            stage: stageName,
            timestamp: new Date().toISOString(),
            performerId: staffId,
            performerName: performerName,
            message: message || `Moved to ${stageName}`
        };

        const updatedMetadata = {
            ...metadata,
            internalStage: stageName,
            internalHistory: [...internalHistory, historyEntry]
        };

        await tx
            .update(orders)
            .set({
                metadata: updatedMetadata,
                updatedAt: new Date()
            })
            .where(and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId)));
    });

    revalidatePath("/backoffice");
    revalidatePath("/backoffice/operations");
    return { success: true };
}

// --- Inventory Management ---

export async function addInventoryItem(data: { name: string, quantity: string, category?: string, unit?: string, sku?: string, minStock?: string, businessType: string, saleType?: string }) {
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
            saleType: data.saleType || "unit",
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

        return await db.query.inventory.findMany({
            where: eq(inventory.clerkOrgId, orgId),
            orderBy: desc(inventory.updatedAt),
            with: {
                clientOverrides: {
                    with: {
                        client: true
                    }
                }
            }
        });
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
        const currentSold = parseFloat(items[0].totalSold || "0");
        let newQty = currentQty;
        let newEntered = currentEntered;
        let newSold = currentSold;

        if (type === "in") {
            newQty += changeQty;
            newEntered += changeQty;
        }
        else if (type === "out") {
            newQty -= changeQty;
            newSold += changeQty; // Manual stock out represents a sale in small retail/wholesale shops
        }
        else if (type === "adjustment") {
            newQty = changeQty;
        }

        await tx.update(inventory)
            .set({ 
                quantity: newQty.toString(), 
                totalEntered: newEntered.toString(),
                totalSold: newSold.toString(),
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
    const { orgId, orgRole } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    if (orgRole !== "org:admin") throw new Error("Only organization administrators can delete inventory items.");

    await db.delete(inventory).where(and(eq(inventory.id, id), eq(inventory.clerkOrgId, orgId)));
    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function bulkRemoveInventoryItems(ids: string[]): Promise<{ success: boolean; blocked: { id: string; name: string }[] }> {
    const { orgId, orgRole } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    if (orgRole !== "org:admin") throw new Error("Only organization administrators can delete inventory items.");
    if (!ids || ids.length === 0) throw new Error("No items selected.");

    // Fetch the items to check for reserved stock
    const itemsToDelete = await db.query.inventory.findMany({
        where: and(
            eq(inventory.clerkOrgId, orgId),
            sql`${inventory.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::text[])`
        )
    });

    // Block items with active reservations
    const blocked = itemsToDelete
        .filter(item => parseFloat(item.reserved || "0") > 0)
        .map(item => ({ id: item.id, name: item.name }));

    if (blocked.length > 0) {
        return { success: false, blocked };
    }

    // Safe to delete — none have reserved stock
    await db.delete(inventory).where(
        and(
            eq(inventory.clerkOrgId, orgId),
            sql`${inventory.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::text[])`
        )
    );

    revalidatePath("/backoffice/inventory");
    return { success: true, blocked: [] };
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

export async function bulkAddInventoryItems(items: { name: string, quantity: string, category?: string, unit?: string, sku?: string, minStock?: string, unitCost?: string, totalSold?: string, businessType: string, pricingTiers?: any, saleType?: string }[]) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const inserted: { name: string; id: string; pricingTiers: any }[] = [];

    await db.transaction(async (tx) => {
        for (const item of items) {
            const itemId = `inv_${nanoid(10)}`;
            const soldVal = item.totalSold || "0";
            const currentQty = parseFloat(item.quantity);
            // If they are importing pre-existing sold history, ensure totalEntered includes the sold items
            const totalEnteredVal = (currentQty + parseFloat(soldVal)).toString();

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
                totalEntered: totalEnteredVal,
                totalSold: soldVal,
                clerkOrgId: orgId,
                businessType: item.businessType,
                saleType: item.saleType || "unit",
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

            inserted.push({ name: item.name, id: itemId, pricingTiers: item.pricingTiers });
        }
    });

    revalidatePath("/backoffice/inventory");
    return { success: true, inserted };
}

// --- B2B Client & Pricing Overrides Management ---

export async function addClientOrganization(data: { name: string; email?: string; phone?: string }) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.insert(clientOrganizations).values({
        id: `client_${nanoid(10)}`,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        vendorOrgId: orgId,
    });

    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function getClientOrganizations() {
    const { orgId } = await auth();
    if (!orgId) return [];

    return await db.select().from(clientOrganizations).where(eq(clientOrganizations.vendorOrgId, orgId)).orderBy(desc(clientOrganizations.createdAt));
}

export async function removeClientOrganization(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.delete(clientOrganizations).where(and(eq(clientOrganizations.id, id), eq(clientOrganizations.vendorOrgId, orgId)));
    
    revalidatePath("/backoffice/inventory");
    return { success: true };
}

export async function saveClientPricingOverrides(clientId: string, overrides: { inventoryId: string; pricingTiers: any }[]) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        for (const override of overrides) {
            // Check if override already exists
            const existing = await tx.query.clientPricingOverrides.findFirst({
                where: and(
                    eq(clientPricingOverrides.clientId, clientId),
                    eq(clientPricingOverrides.inventoryId, override.inventoryId)
                )
            });

            if (existing) {
                await tx.update(clientPricingOverrides)
                    .set({ pricingTiers: override.pricingTiers })
                    .where(eq(clientPricingOverrides.id, existing.id));
            } else {
                await tx.insert(clientPricingOverrides).values({
                    id: `override_${nanoid(10)}`,
                    inventoryId: override.inventoryId,
                    clientId: clientId,
                    pricingTiers: override.pricingTiers,
                });
            }
        }
    });

    revalidatePath("/backoffice/inventory");
    revalidatePath("/backoffice/create");
    return { success: true };
}


