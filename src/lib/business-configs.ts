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
            primary: "#191A43",   // Sartorial Navy (Deep, Premium)
            secondary: "#9C7E41", // Antique Gold (Sophisticated, High-end)
            accent: "#CE0003",    // Signature Red
            text: "#191A43"
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
        dashboardTitle: "Active Orders",
        theme: {
            primary: "#111827",   // Gray 900 (Obsidian Professional)
            secondary: "#6366F1", // Indigo 500 (Modern, Trustworthy)
            accent: "#4F46E5",    // Indigo 600
            text: "#111827"
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
            primary: "#0F172A",   // Slate 900 (Corporate Professional)
            secondary: "#0284C7", // Sky 600 (Logistics Blue)
            accent: "#0EA5E9",    // Sky 500
            text: "#0F172A"
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
        dashboardTitle: "Active Orders",
        theme: {
            primary: "#020617",   // Midnight Black (Premium SaaS)
            secondary: "#3B82F6", // Blue 600 (Action Blue)
            accent: "#10B981",    // Emerald Green
            text: "#0F172A"       // Dark Slate
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
