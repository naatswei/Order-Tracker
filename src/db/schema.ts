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
    assignedStaffId: text("assigned_staff_id").references(() => staff.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staff = pgTable("staff", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    clerkOrgId: text("clerk_org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflows = pgTable("workflows", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    position: text("position").notNull(), // Order of the stage
    clerkOrgId: text("clerk_org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ many, one }) => ({
    statusHistory: many(statusHistory),
    assignedStaff: one(staff, {
        fields: [orders.assignedStaffId],
        references: [staff.id],
    }),
}));

export const staffRelations = relations(staff, ({ many }) => ({
    assignedOrders: many(orders),
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

export const customerMessages = pgTable("customer_messages", {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }), // Optional link to the specific order
    clerkOrgId: text("clerk_org_id").notNull(), // Critical for scoping messages to the right business inbox
    threadId: text("thread_id").notNull().default("legacy"), // Groups messages in the same conversation
    sender: text("sender").notNull().default("customer"), // "customer" or "business"
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    isRead: text("is_read").default("false").notNull(), // Using text because boolean sometimes triggers strict Neon type checks when using sqlite-like libs, but boolean is fine if available. Actually, Drizzle pg-core has boolean. Let's use boolean.
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerMessagesRelations = relations(customerMessages, ({ one }) => ({
    order: one(orders, {
        fields: [customerMessages.orderId],
        references: [orders.id],
    }),
}));

export const typingStatus = pgTable("typing_status", {
    id: text("id").primaryKey(), // threadId:userType
    threadId: text("thread_id").notNull(),
    userType: text("user_type").notNull(), // "customer" or "business"
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
