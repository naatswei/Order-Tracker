'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export async function updateOrgBusinessType(orgId: string, businessType: string) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })
    
    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: { 
            ...(org.publicMetadata || {}),
            businessType 
        }
    })
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
