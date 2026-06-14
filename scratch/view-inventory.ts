import { db } from "../src/db";
import { inventory } from "../src/db/schema";

async function run() {
    console.log("Fetching inventory items...");
    try {
        const items = await db.select().from(inventory);
        console.log("Found items count:", items.length);
        items.forEach(item => {
            console.log(`- ID: ${item.id} | Name: ${item.name} | SKU: ${item.sku} | Selling Price: ${item.sellingPrice} | Unit Cost: ${item.unitCost} | Pricing Tiers:`, JSON.stringify(item.pricingTiers));
        });
    } catch (e) {
        console.error("Error fetching inventory:", e);
    }
}

run();
