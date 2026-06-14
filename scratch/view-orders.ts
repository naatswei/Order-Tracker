import { db } from "../src/db";
import { orders } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function checkOrders() {
    console.log("Fetching latest orders...");
    const latestOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);
    console.log("Latest Orders:");
    latestOrders.forEach(o => {
        console.log(`- Order: ${o.orderNumber}, Name: ${o.customerName}, Phone: ${o.customerPhone}, Status: ${o.currentStatus}, Created At: ${o.createdAt}`);
    });
}

checkOrders();
