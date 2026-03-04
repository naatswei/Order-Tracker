export interface ExtraField {
    id: string
    label: string
    placeholder: string
    type: "text" | "number" | "select"
    options?: string[]
}

export interface BusinessConfig {
    id: string
    title: string
    itemLabel: string
    itemPlaceholder: string
    statuses: string[]
    defaultStatus: string
    defaultLocation: string
    defaultMessage: string
    orderLabel: string
    orderPrefix: string
    orderPlaceholder: string
    searchPlaceholder: string
    dashboardTitle: string
    theme: {
        primary: string
        secondary: string
        accent: string
        text: string
    }
    extraFields?: ExtraField[]
}

export const BUSINESS_CONFIGS: Record<string, BusinessConfig> = {
    tailoring: {
        id: "tailoring",
        title: "Tailoring",
        itemLabel: "Garment Type",
        itemPlaceholder: "Dress, Suit, etc.",
        statuses: [
            "Order Received", "Measurement Taken", "Production", "Quality Checks",
            "First Fitting", "Second Fitting", "Third Fitting", "Completed",
            "Dispatched", "Delivered", "Pending", "Refunded",
            "Order Cancelled", "Order Delayed"
        ],
        defaultStatus: "Order Received",
        defaultLocation: "Factory",
        defaultMessage: "Your order has been received and is being processed",
        orderLabel: "Order Number",
        orderPrefix: "KT",
        orderPlaceholder: "eg., KT7248",
        searchPlaceholder: "Search by order number, name",
        dashboardTitle: "Active Orders",
        theme: {
            primary: "#2C2C2C",   // Rich Charcoal
            secondary: "#B87333", // Warm Copper
            accent: "#D4956A",    // Soft Copper/Terracotta
            text: "#2C2C2C"
        }
    },
    "hair-retail": {
        id: "hair-retail",
        title: "Hair Retail",
        itemLabel: "Hair/Product Type",
        itemPlaceholder: "Frontal Wig, Bundles, etc.",
        statuses: [
            "Order Received", "Payment Verified", "Processing", "Wigging/Styling",
            "Quality Check", "Ready for Pickup", "Dispatched",
            "Delivered", "Pending", "Refunded", "Order Cancelled", "Order Delayed"
        ],
        defaultStatus: "Order Received",
        defaultLocation: "Studio",
        defaultMessage: "We've received your order and are preparing your hair items.",
        orderLabel: "Order Number",
        orderPrefix: "HR",
        orderPlaceholder: "eg., HR9102",
        searchPlaceholder: "Search by order number, name",
        dashboardTitle: "Active Hair Orders",
        theme: {
            primary: "#4D1D3A",   // Deep Plum
            secondary: "#C77D9E", // Dusty Rose
            accent: "#D4AF37",    // Rose Gold
            text: "#4D1D3A"
        },
        extraFields: [
            { id: "length", label: "Wig Length", placeholder: "e.g., 22 inches", type: "text" },
            { id: "color", label: "Hair Color/Density", placeholder: "e.g., Natural Black, 180%", type: "text" }
        ]
    },
    logistics: {
        id: "logistics",
        title: "Logistics",
        itemLabel: "Package Type",
        itemPlaceholder: "Box, Document, Pallet, etc.",
        statuses: [
            "Shipment Booked", "Picked Up", "In Transit", "Arriving at Facility",
            "Sorting", "Dispatched", "Delivered", "Held at Customs",
            "Delayed", "Cancelled", "Returned to Sender"
        ],
        defaultStatus: "Shipment Booked",
        defaultLocation: "Warehouse",
        defaultMessage: "Your shipment has been booked and is awaiting pickup.",
        orderLabel: "Tracking Number",
        orderPrefix: "LG",
        orderPlaceholder: "eg., LG5532",
        searchPlaceholder: "Search by tracking number, recipient",
        dashboardTitle: "Active Shipments",
        theme: {
            primary: "#0D3B4F",   // Deep Teal
            secondary: "#1A8A7D", // Vivid Teal
            accent: "#2196F3",    // Electric Blue
            text: "#0D3B4F"
        },
        extraFields: [
            { id: "weight", label: "Weight (kg)", placeholder: "e.g., 5.5", type: "number" },
            { id: "method", label: "Shipping Method", placeholder: "Express, Standard", type: "text" }
        ]
    },
    "online-business": {
        id: "online-business",
        title: "Online Business",
        itemLabel: "Product Name",
        itemPlaceholder: "Skincare Set, Electronics, etc.",
        statuses: [
            "Order Received", "Payment Confirmed", "Processing", "Packaging",
            "Label Created", "Shipped", "Dispatched", "Delivered",
            "Refunded", "Cancelled", "On Hold"
        ],
        defaultStatus: "Order Received",
        defaultLocation: "Processing Center",
        defaultMessage: "We've received your order and are getting it ready for shipment.",
        orderLabel: "Order Number",
        orderPrefix: "OB",
        orderPlaceholder: "eg., OB2044",
        searchPlaceholder: "Search by order number, customer name",
        dashboardTitle: "Active Online Orders",
        theme: {
            primary: "#312E81",   // Deep Indigo
            secondary: "#F97066", // Warm Coral
            accent: "#818CF8",    // Soft Violet
            text: "#312E81"
        },
        extraFields: [
            { id: "quantity", label: "Quantity", placeholder: "1", type: "number" },
            { id: "sku", label: "SKU / Model", placeholder: "SKU-123", type: "text" }
        ]
    }
}

export const DEFAULT_BUSINESS_TYPE = "tailoring"

export function getBusinessConfig(id: string | null): BusinessConfig {
    if (!id || !BUSINESS_CONFIGS[id]) {
        return BUSINESS_CONFIGS[DEFAULT_BUSINESS_TYPE]
    }
    return BUSINESS_CONFIGS[id]
}
