import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const orders = pgTable("orders", {
    id: text("id").primaryKey(), // Using the existing string IDs for parity
    orderNumber: text("order_number").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone").notNull(),
    itemType: text("item_type").notNull(), // formerly garmentType
    pickupDate: text("pickup_date"),
    measurements: text("measurements"),
    metadata: jsonb("metadata").default({}),
    businessType: text("business_type").notNull(),
    currentStatus: text("current_status").notNull(),
    clerkOrgId: text("clerk_org_id"), // To scope orders to organizations
    userId: text("user_id"), // To track who created it
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
    statusHistory: many(statusHistory),
}));

export const statusHistory = pgTable("status_history", {
    id: text("id").primaryKey(),
    orderId: text("order_id")
        .references(() => orders.id, { onDelete: "cascade" })
        .notNull(),
    status: text("status").notNull(),
    location: text("location"),
    message: text("message"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
    order: one(orders, {
        fields: [statusHistory.orderId],
        references: [orders.id],
    }),
}));
