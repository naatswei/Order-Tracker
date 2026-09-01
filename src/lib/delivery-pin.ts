// Utility function to get or deterministically generate a 4-digit numeric delivery PIN
export function getOrderDeliveryPin(order: any): string {
    const meta = (typeof order?.metadata === "object" && order?.metadata !== null) ? order.metadata as Record<string, unknown> : {};
    if (meta.deliveryPin && typeof meta.deliveryPin === "string" && meta.deliveryPin.trim().length > 0) {
        return meta.deliveryPin.trim();
    }
    // Deterministic 4-digit numeric fallback from order ID so it stays identical across all visits
    let hash = 0;
    const str = String(order?.id || order?.orderNumber || "1234");
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 9000 + 1000).toString();
}
