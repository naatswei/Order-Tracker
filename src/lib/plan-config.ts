// Central plan configuration with enforceable limits
export type PlanName = "Free Trial" | "2 weeks" | "Month" | "Yearly"

export interface PlanLimits {
    maxMembers: number     // 0 = solo only, Infinity = unlimited
    maxOrders: number      // Infinity = unlimited
    bulkUpdates: boolean
    messaging: boolean
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    "Free Trial": {
        maxMembers: Infinity,
        maxOrders: 20,
        bulkUpdates: true,
        messaging: true,
    },
    "2 weeks": {
        maxMembers: Infinity,
        maxOrders: 100,
        bulkUpdates: true,
        messaging: true,
    },
    "Month": {
        maxMembers: Infinity,
        maxOrders: Infinity,
        bulkUpdates: true,
        messaging: true,
    },
    "Yearly": {
        maxMembers: Infinity,
        maxOrders: Infinity,
        bulkUpdates: true,
        messaging: true,
    },
}

export function getPlanLimits(planName: string | null | undefined): PlanLimits {
    if (!planName) return PLAN_LIMITS["Free Trial"]
    return PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS["Free Trial"]
}
