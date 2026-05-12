// Central plan configuration with enforceable limits
export type PlanName = "Free Trial" | "Starter" | "Growth" | "Scale" | "Yearly"

export interface PlanLimits {
    maxOrders: number      // Infinity = unlimited
    bulkUpdates: boolean
    messaging: boolean
    performanceTracking: boolean
    multiBranch: boolean
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    "Free Trial": {
        maxOrders: 20,
        bulkUpdates: true,
        messaging: true,
        performanceTracking: true,
        multiBranch: true,
    },
    "Starter": {
        maxOrders: 50,
        bulkUpdates: true,
        messaging: false,
        performanceTracking: false,
        multiBranch: false,
    },
    "Growth": {
        maxOrders: Infinity,
        bulkUpdates: true,
        messaging: true,
        performanceTracking: true,
        multiBranch: false,
    },
    "Scale": {
        maxOrders: Infinity,
        bulkUpdates: true,
        messaging: true,
        performanceTracking: true,
        multiBranch: true,
    },
    "Yearly": {
        maxOrders: Infinity,
        bulkUpdates: true,
        messaging: true,
        performanceTracking: true,
        multiBranch: true,
    },
}

export function getPlanLimits(planName: string | null | undefined): PlanLimits {
    if (!planName) return PLAN_LIMITS["Free Trial"]
    return PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS["Free Trial"]
}
