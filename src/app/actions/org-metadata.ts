'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from "@/db"
import { workflows } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getDefaultWorkflowStages } from "@/lib/business-configs"
import { nanoid } from "nanoid"

export async function updateOrgBusinessType(orgId: string, businessType: string, logisticsType?: LogisticsSubType) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })
    
    const updatePayload: Record<string, any> = {
        ...(org.publicMetadata || {}),
        businessType 
    }
    if (logisticsType) {
        updatePayload.logisticsType = logisticsType
    }

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: updatePayload
    })

    // Auto-align default pipeline stages to the new business/logistics operational model
    try {
        const targetStages = getDefaultWorkflowStages(businessType, logisticsType)
        const existing = await db.select().from(workflows).where(eq(workflows.clerkOrgId, orgId))
        const existingNames = existing.map(s => s.name)
        const isTemplate = existingNames.some(n => 
            n === "Kitchen Cooking" || n === "Food Ready" || 
            n === "Package Picked Up" || n === "In Sorting / Hub" || 
            n === "Measurement Taken" || n === "Wigging / Styling" ||
            n === "Customs Clearance"
        )
        if (existing.length === 0 || isTemplate) {
            await db.delete(workflows).where(eq(workflows.clerkOrgId, orgId))
            for (let i = 0; i < targetStages.length; i++) {
                await db.insert(workflows).values({
                    id: `wf_${nanoid(10)}`,
                    name: targetStages[i],
                    position: String(i + 1),
                    clerkOrgId: orgId,
                })
            }
        }
    } catch (e) {
        console.warn("Could not re-seed workflow stages in updateOrgBusinessType:", e)
    }

    return { success: true }
}

export async function updateOrgProfile(orgId: string, data: { companyName: string; contact?: string; location?: string; email?: string; website?: string }) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    // Update name and metadata
    await client.organizations.updateOrganization(orgId, {
        name: data.companyName
    })

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            ...(org.publicMetadata || {}),
            contact: data.contact,
            location: data.location,
            secondaryEmail: data.email,
            website: data.website
        }
    })

    return { success: true }
}

export async function updateOrgSubscriptionStatus(
    orgId: string,
    status: 'active' | 'trialing',
    expiryDate: string,
    trialUsed?: boolean,
    planName?: string,
    isServerCall = false
) {
    let currentUserId: string | null = null;
    if (!isServerCall) {
        const { userId } = await auth()
        if (!userId) throw new Error('Unauthorized')
        currentUserId = userId;
    }

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    const currentMetadata = (org.publicMetadata as any) || {}
    const metadata: any = {
        ...currentMetadata,
        subscriptionStatus: status,
        subscriptionExpiry: expiryDate
    }

    if (trialUsed !== undefined) {
        metadata.trialUsed = trialUsed

        // CRITICAL: Also update the user's metadata so they can't reuse the trial on another org
        if (trialUsed && currentUserId) {
            await client.users.updateUserMetadata(currentUserId, {
                publicMetadata: {
                    hasUsedTrial: true
                }
            })
        }
    }

    if (planName) {
        metadata.subscriptionPlan = planName
    }

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: metadata
    })
    return { success: true }
}

export async function updateOrgInvoiceSettings(orgId: string, settings: { defaultTaxRate?: string; defaultDeliveryFee?: string; defaultDiscount?: string }) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            ...(org.publicMetadata || {}),
            defaultTaxRate: settings.defaultTaxRate || "0",
            defaultDeliveryFee: settings.defaultDeliveryFee || "0",
            defaultDiscount: settings.defaultDiscount || "0"
        }
    })
    return { success: true }
}

export interface MenuPresetItem {
    id: string
    name: string
    price: number
    description?: string
}

export type LogisticsSubType = 'restaurant' | 'delivery' | 'shipping'

export interface OrgOrderDefaults {
    logisticsType?: LogisticsSubType
    // Restaurant Defaults
    defaultPickupLocation?: string
    defaultPickupContact?: string
    defaultDeliveryFee?: string
    defaultPaymentNumber?: string
    defaultPaymentProvider?: string
    menuPresets?: MenuPresetItem[]
    // Courier Delivery Defaults
    defaultDispatchHub?: string
    defaultSenderContact?: string
    defaultCourierFee?: string
    packageCategories?: string[]
    defaultCourierMoMoNumber?: string
    defaultCourierPaymentProvider?: string
    // Shipping / Freight Defaults
    defaultOriginPort?: string
    defaultOriginContact?: string
    defaultDestinationHub?: string
    defaultFreightRatePerKg?: string
    defaultHandlingFee?: string
    defaultWaybillPrefix?: string
    defaultShippingMoMoNumber?: string
    defaultShippingPaymentProvider?: string
}

export async function updateOrgOrderDefaults(orgId: string, defaults: OrgOrderDefaults) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            ...(org.publicMetadata || {}),
            logisticsType: defaults.logisticsType ?? "restaurant",
            // Restaurant
            defaultPickupLocation: defaults.defaultPickupLocation ?? "",
            defaultPickupContact: defaults.defaultPickupContact ?? "",
            defaultDeliveryFee: defaults.defaultDeliveryFee ?? "0",
            defaultPaymentNumber: defaults.defaultPaymentNumber ?? "",
            defaultPaymentProvider: defaults.defaultPaymentProvider ?? "MTN",
            menuPresets: defaults.menuPresets ?? [],
            // Courier
            defaultDispatchHub: defaults.defaultDispatchHub ?? "",
            defaultSenderContact: defaults.defaultSenderContact ?? "",
            defaultCourierFee: defaults.defaultCourierFee ?? "0",
            packageCategories: defaults.packageCategories ?? [],
            defaultCourierMoMoNumber: defaults.defaultCourierMoMoNumber ?? "",
            defaultCourierPaymentProvider: defaults.defaultCourierPaymentProvider ?? "MTN",
            // Shipping
            defaultOriginPort: defaults.defaultOriginPort ?? "",
            defaultOriginContact: defaults.defaultOriginContact ?? "",
            defaultDestinationHub: defaults.defaultDestinationHub ?? "",
            defaultFreightRatePerKg: defaults.defaultFreightRatePerKg ?? "0",
            defaultHandlingFee: defaults.defaultHandlingFee ?? "0",
            defaultWaybillPrefix: defaults.defaultWaybillPrefix ?? "SHP",
            defaultShippingMoMoNumber: defaults.defaultShippingMoMoNumber ?? "",
            defaultShippingPaymentProvider: defaults.defaultShippingPaymentProvider ?? "MTN"
        }
    })

    return { success: true }
}

