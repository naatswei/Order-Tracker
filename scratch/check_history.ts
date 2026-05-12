
import { db } from "./src/db";
import { inventoryTransactions } from "./src/db/schema";
import { gte, lte, and } from "drizzle-orm";

async function checkHistory() {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    console.log("Checking transactions since:", twoWeeksAgo.toISOString());

    const history = await db.select()
        .from(inventoryTransactions)
        .where(gte(inventoryTransactions.timestamp, twoWeeksAgo));

    console.log(`Found ${history.length} transactions in the last 2 weeks.`);
    console.log(JSON.stringify(history.slice(0, 5), null, 2));
}

checkHistory().catch(console.error);
