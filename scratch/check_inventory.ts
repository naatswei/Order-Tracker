import { db } from "./src/db";
import { inventory } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function check() {
    const items = await db.select().from(inventory);
    console.log("Inventory Items:", JSON.stringify(items, null, 2));
}

check().catch(console.error);
