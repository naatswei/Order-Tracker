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
    inventory?: {
        assetPlaceholder: string
        skuPlaceholder: string
        categoryPlaceholder: string
        unitPlaceholder: string
    }
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
        },
        inventory: {
            assetPlaceholder: "e.g. Silk Thread",
            skuPlaceholder: "e.g. SLK-001",
            categoryPlaceholder: "e.g. Raw Materials",
            unitPlaceholder: "e.g. Rolls, Meters"
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
            primary: "#1A1A1A",   // Obsidian Black
            secondary: "#831843", // Deep Rose/Maroon (Elegant & Professional)
            accent: "#BE123C",    // Rose 700
            text: "#1A1A1A"
        },
        extraFields: [
            { id: "length", label: "Wig Length", placeholder: "e.g., 22 inches", type: "text" },
            { id: "color", label: "Hair Color/Density", placeholder: "e.g., Natural Black, 180%", type: "text" }
        ],
        inventory: {
            assetPlaceholder: "e.g. Frontal Wig",
            skuPlaceholder: "e.g. HW-001",
            categoryPlaceholder: "e.g. Extensions",
            unitPlaceholder: "e.g. Pieces, Bundles"
        }
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
            primary: "#0F172A",   // Slate 900
            secondary: "#0284C7", // Sky Blue (Trustworthy & Fast)
            accent: "#0EA5E9",    // Sky 500
            text: "#0F172A"
        },
        extraFields: [
            { id: "weight", label: "Weight (kg)", placeholder: "e.g., 5.5", type: "number" },
            { id: "method", label: "Shipping Method", placeholder: "Express, Standard", type: "text" }
        ],
        inventory: {
            assetPlaceholder: "e.g. Transit Box",
            skuPlaceholder: "e.g. LG-BX1",
            categoryPlaceholder: "e.g. Packaging",
            unitPlaceholder: "e.g. Units, Pieces"
        }
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
            primary: "#020617",   // Midnight Black
            secondary: "#059669", // Emerald Green (Growth & Modern)
            accent: "#10B981",    // Emerald 500
            text: "#0F172A"       // Dark Slate
        },
        extraFields: [
            { id: "quantity", label: "Quantity", placeholder: "1", type: "number" },
            { id: "sku", label: "SKU / Model", placeholder: "SKU-123", type: "text" }
        ],
        inventory: {
            assetPlaceholder: "e.g. Smart Watch",
            skuPlaceholder: "e.g. SW-001",
            categoryPlaceholder: "e.g. Electronics",
            unitPlaceholder: "e.g. Pieces, Units"
        }
    },
    "nu-retail": {
        id: "nu-retail",
        title: "Nu Retail",
        itemLabel: "Product Name",
        itemPlaceholder: "Wig, Hair Bundle, Retail Goods, etc.",
        statuses: [
            "Order Received", "Payment Verified", "Processing", "Packaging",
            "Dispatched", "Delivered", "Returned", "Cancelled"
        ],
        defaultStatus: "Order Received",
        defaultLocation: "Nu Retail Store",
        defaultMessage: "We've received your order and are packing your items.",
        orderLabel: "Order Number",
        orderPrefix: "NU",
        orderPlaceholder: "eg., NU9102",
        searchPlaceholder: "Search by order number, name",
        dashboardTitle: "Retail Orders",
        theme: {
            primary: "#4F46E5",   // Indigo
            secondary: "#06B6D4", // Cyan
            accent: "#6366F1",    // Violet
            text: "#1F2937"
        },
        extraFields: [
            { id: "brand", label: "Brand / Manufacturer", placeholder: "e.g., Nu Hair", type: "text" },
            { id: "batch", label: "Batch Number", placeholder: "e.g., B-001", type: "text" }
        ],
        inventory: {
            assetPlaceholder: "e.g. 24 Inch Straight Wig",
            skuPlaceholder: "e.g. NU-001",
            categoryPlaceholder: "e.g. Extensions",
            unitPlaceholder: "e.g. Pieces, Units"
        }
    }
}

export const DEFAULT_BUSINESS_TYPE = "tailoring"

export function getBusinessConfig(id: string | null): BusinessConfig {
    if (!id || !BUSINESS_CONFIGS[id]) {
        return BUSINESS_CONFIGS[DEFAULT_BUSINESS_TYPE]
    }
    return BUSINESS_CONFIGS[id]
}
