import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { orders } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function test() {
    const orgId = "some_org_id";
    console.log("Starting Drizzle mutation test...");
    
    try {
        const query = db.select().from(orders);
        console.log("Calling query.where() WITHOUT reassigning...");
        query.where(eq(orders.clerkOrgId, orgId));
        
        console.log("Calling query.orderBy()...");
        const result = await query.orderBy(desc(orders.createdAt));
        console.log("✅ Query succeeded! Rows fetched:", result.length);
    } catch (e: any) {
        console.error("❌ Drizzle query threw an error:", e.message || e);
    }
}

test().catch(console.error);
