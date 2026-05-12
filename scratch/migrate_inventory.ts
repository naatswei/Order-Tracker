
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { inventory } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function migrateInventory() {
    console.log("Starting inventory logic migration...");

    // 1. Subtract reserved from quantity and reset reserved to 0
    const result = await db.update(inventory)
        .set({
            quantity: sql`((quantity::float) - (reserved::float))::text`,
            reserved: "0",
            updatedAt: new Date()
        })
        .where(sql`reserved::float > 0`);

    console.log("Migration complete. All reserved items have been subtracted from Stock Level.");
}

migrateInventory().catch(console.error);
