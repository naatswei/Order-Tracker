const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { sql } = require("@vercel/postgres");

async function test() {
    console.log("--- DATABASE DIAGNOSTICS ---");
    console.log("POSTGRES_URL defined:", !!process.env.POSTGRES_URL);
    
    try {
        console.log("Executing standard query SELECT NOW()...");
        const result = await sql`SELECT NOW()`;
        console.log("✅ Connection Successful! DB Time:", result.rows[0].now);
    } catch (e) {
        console.error("❌ SELECT NOW() failed:", e.message || e);
        return;
    }

    try {
        console.log("Checking if 'orders' table exists and has rows...");
        const ordersResult = await sql`SELECT count(*) FROM orders`;
        console.log("✅ 'orders' table exists. Total rows:", ordersResult.rows[0].count);
    } catch (e) {
        console.error("❌ 'orders' query failed:", e.message || e);
    }

    try {
        console.log("Checking if 'inventory' table exists and has rows...");
        const invResult = await sql`SELECT count(*) FROM inventory`;
        console.log("✅ 'inventory' table exists. Total rows:", invResult.rows[0].count);
    } catch (e) {
        console.error("❌ 'inventory' query failed:", e.message || e);
    }
}

test();
