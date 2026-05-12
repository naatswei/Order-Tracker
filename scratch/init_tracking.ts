
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { inventory } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function initializeTracking() {
    console.log("Initializing inventory tracking columns...");

    // Set totalEntered to current quantity for all items where it's still "0"
    await db.update(inventory)
        .set({
            totalEntered: sql`quantity`,
            totalSold: "0",
            updatedAt: new Date()
        });

    console.log("Initialization complete.");
}

initializeTracking().catch(console.error);
