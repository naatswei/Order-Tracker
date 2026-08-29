import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const orders = pgTable("orders", {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone").notNull(),
    itemType: text("item_type").notNull(),
    pickupDate: text("pickup_date"),
    measurements: text("measurements"),
    metadata: jsonb("metadata").default({}),
    businessType: text("business_type").notNull(),
    currentStatus: text("current_status").notNull(),
    clerkOrgId: text("clerk_org_id"),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    userId: text("user_id"),
    assignedStaffId: text("assigned_staff_id").references(() => staff.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staff = pgTable("staff", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    department: text("department"),
    reportsToId: text("reports_to_id"),
    photoUrl: text("photo_url"),
    pinCode: text("pin_code"), // 4-digit PIN for clock-in
    clerkUserId: text("clerk_user_id"), // To link a logged-in user to their staff profile
    clerkOrgId: text("clerk_org_id").notNull(),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffAttendance = pgTable("staff_attendance", {
    id: text("id").primaryKey(),
    staffId: text("staff_id").references(() => staff.id, { onDelete: "cascade" }).notNull(),
    clerkOrgId: text("clerk_org_id").notNull(),
    type: text("type").notNull(), // "clock_in" or "clock_out"
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const branches = pgTable("branches", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    location: text("location"),
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

export const inventory = pgTable("inventory", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    quantity: text("quantity").notNull().default("0"),
    category: text("category"),
    unit: text("unit"),
    sku: text("sku"),
    minStock: text("min_stock").default("0"),
    reserved: text("reserved").notNull().default("0"),
    unitCost: text("unit_cost").default("0"),
    sellingPrice: text("selling_price").default("0"),
    pricingTiers: jsonb("pricing_tiers"),
    totalEntered: text("total_entered").notNull().default("0"),
    totalSold: text("total_sold").notNull().default("0"),
    clerkOrgId: text("clerk_org_id").notNull(),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    businessType: text("business_type").notNull(),
    saleType: text("sale_type").default("unit").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderInventoryLinks = pgTable("order_inventory_links", {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    inventoryId: text("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
    quantity: text("quantity").notNull(), // Amount of inventory item used in this order
    clerkOrgId: text("clerk_org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
    id: text("id").primaryKey(),
    inventoryId: text("inventory_id")
        .references(() => inventory.id, { onDelete: "cascade" })
        .notNull(),
    type: text("type").notNull(), // "in", "out", "adjustment"
    quantity: text("quantity").notNull(),
    note: text("note"),
    clerkOrgId: text("clerk_org_id").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ many, one }) => ({
    statusHistory: many(statusHistory),
    assignedStaff: one(staff, {
        fields: [orders.assignedStaffId],
        references: [staff.id],
    }),
    inventoryLinks: many(orderInventoryLinks),
}));

export const staffRelations = relations(staff, ({ many, one }) => ({
    assignedOrders: many(orders),
    attendance: many(staffAttendance),
    manager: one(staff, {
        fields: [staff.reportsToId],
        references: [staff.id],
        relationName: "reporting",
    }),
    subordinates: many(staff, {
        relationName: "reporting",
    }),
}));

export const staffAttendanceRelations = relations(staffAttendance, ({ one }) => ({
    staff: one(staff, {
        fields: [staffAttendance.staffId],
        references: [staff.id],
    }),
}));

export const inventoryRelations = relations(inventory, ({ many }) => ({
    transactions: many(inventoryTransactions),
    orderLinks: many(orderInventoryLinks),
    clientOverrides: many(clientPricingOverrides),
}));

export const orderInventoryLinksRelations = relations(orderInventoryLinks, ({ one }) => ({
    order: one(orders, {
        fields: [orderInventoryLinks.orderId],
        references: [orders.id],
    }),
    inventoryItem: one(inventory, {
        fields: [orderInventoryLinks.inventoryId],
        references: [inventory.id],
    }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
    item: one(inventory, {
        fields: [inventoryTransactions.inventoryId],
        references: [inventory.id],
    }),
}));

export const statusHistory = pgTable("status_history", {
    id: text("id").primaryKey(),
    orderId: text("order_id")
        .references(() => orders.id, { onDelete: "cascade" })
        .notNull(),
    status: text("status").notNull(),
    location: text("location"),
    message: text("message"),
    staffId: text("staff_id").references(() => staff.id, { onDelete: "set null" }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
    order: one(orders, {
        fields: [statusHistory.orderId],
        references: [orders.id],
    }),
    performer: one(staff, {
        fields: [statusHistory.staffId],
        references: [staff.id],
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

export const pushSubscriptions = pgTable("push_subscriptions", {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
    order: one(orders, {
        fields: [pushSubscriptions.orderId],
        references: [orders.id],
    }),
}));

export const clientOrganizations = pgTable("client_organizations", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    vendorOrgId: text("vendor_org_id").notNull(), // Scoped to the logged-in Clerk organization
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientPricingOverrides = pgTable("client_pricing_overrides", {
    id: text("id").primaryKey(),
    inventoryId: text("inventory_id")
        .references(() => inventory.id, { onDelete: "cascade" })
        .notNull(),
    clientId: text("client_id")
        .references(() => clientOrganizations.id, { onDelete: "cascade" })
        .notNull(),
    pricingTiers: jsonb("pricing_tiers"), // Client-specific pricing tiers override
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientOrganizationsRelations = relations(clientOrganizations, ({ many }) => ({
    pricingOverrides: many(clientPricingOverrides),
}));

export const clientPricingOverridesRelations = relations(clientPricingOverrides, ({ one }) => ({
    inventoryItem: one(inventory, {
        fields: [clientPricingOverrides.inventoryId],
        references: [inventory.id],
    }),
    client: one(clientOrganizations, {
        fields: [clientPricingOverrides.clientId],
        references: [clientOrganizations.id],
    }),
}));

// --- Stock Restock Notification Log ---

export const stockNotificationLog = pgTable("stock_notification_log", {
    id: text("id").primaryKey(),
    inventoryId: text("inventory_id")
        .references(() => inventory.id, { onDelete: "cascade" })
        .notNull(),
    clerkOrgId: text("clerk_org_id").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerName: text("customer_name"),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const stockNotificationLogRelations = relations(stockNotificationLog, ({ one }) => ({
    inventoryItem: one(inventory, {
        fields: [stockNotificationLog.inventoryId],
        references: [inventory.id],
    }),
}));
