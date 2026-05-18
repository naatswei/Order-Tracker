import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { inventory, orders } from "../src/db/schema";

async function runDiagnostics() {
    console.log("Starting DB Connection Diagnostics...");
    console.log("POSTGRES_URL configured:", !!process.env.POSTGRES_URL);
    
    try {
        console.log("Querying 'inventory' table...");
        const inventoryItems = await db.select().from(inventory);
        console.log(`Success! Found ${inventoryItems.length} inventory items.`);
    } catch (error: any) {
        console.error("❌ Failed to query 'inventory' table:", error.message || error);
    }

    try {
        console.log("Querying 'orders' table...");
        const orderList = await db.select().from(orders);
        console.log(`Success! Found ${orderList.length} orders.`);
    } catch (error: any) {
        console.error("❌ Failed to query 'orders' table:", error.message || error);
    }
}

runDiagnostics().catch(console.error);
