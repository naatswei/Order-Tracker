import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { orders, staff, inventory } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { WeeklyReportEmail } from "@/emails/weekly-report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // 1. Verify Vercel Cron Secret for security
        const authHeader = req.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Initialize Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        const resend = resendApiKey ? new Resend(resendApiKey) : null;

        // 2. Calculate the date range (Last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        // 3. Fetch all active organizations (we can get distinct clerkOrgIds from staff table)
        const orgsResult = await db.select({ orgId: staff.clerkOrgId }).from(staff).groupBy(staff.clerkOrgId);
        const orgIds = orgsResult.map(o => o.orgId);

        const results = [];

        for (const orgId of orgIds) {
            // Find the "Business Owner" or admin to send the email to
            const adminStaff = await db.query.staff.findFirst({
                where: and(eq(staff.clerkOrgId, orgId), eq(staff.role, "Business Owner"))
            });

            if (!adminStaff || !adminStaff.email) {
                console.log(`Skipping org ${orgId} - No admin email found.`);
                continue;
            }

            // --- Aggregate Metrics ---
            // Total Orders
            const recentOrders = await db.query.orders.findMany({
                where: and(
                    eq(orders.clerkOrgId, orgId),
                    gte(orders.createdAt, startDate)
                )
            });

            const totalOrders = recentOrders.length;
            const completedOrders = recentOrders.filter(o => o.currentStatus.toLowerCase() === "delivered" || o.currentStatus.toLowerCase() === "completed").length;
            
            // Calculate revenue (Assuming total amount is stored in metadata or we count items. Let's assume metadata.totalAmount exists, or default to 0 for now until schema is updated)
            let revenue = 0;
            recentOrders.forEach(o => {
                const meta = o.metadata as any;
                if (meta && meta.amount) {
                    revenue += Number(meta.amount) || 0;
                }
            });

            // Find top staff (who is assigned to most recent orders)
            const staffCounts: Record<string, number> = {};
            recentOrders.forEach(o => {
                if (o.assignedStaffId) {
                    staffCounts[o.assignedStaffId] = (staffCounts[o.assignedStaffId] || 0) + 1;
                }
            });
            
            let topStaffId = null;
            let maxOrders = 0;
            for (const [sId, count] of Object.entries(staffCounts)) {
                if (count > maxOrders) {
                    maxOrders = count;
                    topStaffId = sId;
                }
            }

            let topStaffName = null;
            if (topStaffId) {
                const ts = await db.query.staff.findFirst({ where: eq(staff.id, topStaffId) });
                topStaffName = ts?.name || null;
            }

            // Check Low Stock Inventory
            const lowStockItems = await db.query.inventory.findMany({
                where: and(
                    eq(inventory.clerkOrgId, orgId),
                    sql`CAST(${inventory.quantity} AS INTEGER) <= CAST(${inventory.minStock} AS INTEGER)`
                )
            });

            // --- Send Email ---
            if (resend) {
                try {
                    await resend.emails.send({
                        from: "Order Tracker <reports@naatswei.com>", // Replace with your verified domain
                        to: adminStaff.email,
                        subject: "Your Weekly Performance Report 📊",
                        react: WeeklyReportEmail({
                            merchantName: adminStaff.name,
                            totalOrders,
                            completedOrders,
                            revenue,
                            topStaffName,
                            lowStockItems: lowStockItems.length,
                            startDate: startDate.toLocaleDateString(),
                            endDate: endDate.toLocaleDateString()
                        })
                    });
                    results.push({ orgId, status: "sent", to: adminStaff.email });
                } catch (err: any) {
                    console.error(`Failed to send to ${adminStaff.email}:`, err);
                    results.push({ orgId, status: "failed", error: err.message });
                }
            } else {
                console.log(`[DRY RUN] Would have sent Weekly Report to ${adminStaff.email} for Org ${orgId}`);
                console.log({ totalOrders, completedOrders, revenue, topStaffName, lowStockItems: lowStockItems.length });
                results.push({ orgId, status: "dry-run", to: adminStaff.email });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
