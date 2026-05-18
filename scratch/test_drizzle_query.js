const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { drizzle } = require("drizzle-orm/vercel-postgres");
const { sql } = require("@vercel/postgres");
const { orders } = require("./src/db/schema");
const { eq, desc } = require("drizzle-orm");

const db = drizzle(sql);

async function test() {
    const orgId = "some_org_id";
    console.log("Simulating getOrders query building...");
    try {
        const query = db.select().from(orders);
        if (orgId) {
            query.where(eq(orders.clerkOrgId, orgId));
        }
        
        console.log("Calling orderBy and awaiting execution...");
        const result = await query.orderBy(desc(orders.createdAt));
        console.log("✅ Success! Total rows fetched:", result.length);
    } catch (e) {
        console.error("❌ Drizzle query failed:", e.message || e);
    }
}

test();
