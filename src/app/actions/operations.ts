"use server"

import { db } from "@/db";
import { orders, staff, workflows, statusHistory } from "@/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";

// --- Staff Management ---

export async function addStaff(data: { name: string, role?: string, email?: string, department?: string, reportsToId?: string }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    await db.insert(staff).values({
        id: `staff_${nanoid(10)}`,
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        department: data.department || null,
        reportsToId: data.reportsToId || null,
        clerkOrgId: orgId,
    });

    revalidatePath("/backoffice/staff");
    return { success: true };
}

export async function updateStaff(id: string, data: Partial<{ name: string, role: string, email: string, department: string, reportsToId: string }>) {
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
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        // Update order current status
        await tx
            .update(orders)
            .set({
                currentStatus: stageName,
                updatedAt: new Date()
            })
            .where(and(eq(orders.id, orderId), eq(orders.clerkOrgId, orgId)));

        // Add to history
        await tx.insert(statusHistory).values({
            id: `sh_${nanoid(10)}`,
            orderId: orderId,
            status: stageName,
            location: "Production Line",
            message: message || `Moved to ${stageName}`,
        });
    });

    revalidatePath("/backoffice");
    revalidatePath("/backoffice/operations");
    revalidatePath(`/track/${orderId}`);
    return { success: true };
}
