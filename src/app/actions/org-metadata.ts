'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export async function updateOrgBusinessType(orgId: string, businessType: string) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()
    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: { businessType }
    })
    return { success: true }
}

export async function updateOrgProfile(orgId: string, data: { companyName: string; contact?: string; location?: string; email?: string; website?: string }) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const client = await clerkClient()

    // Update name and metadata
    await client.organizations.updateOrganization(orgId, {
        name: data.companyName
    })

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            contact: data.contact,
            location: data.location,
            secondaryEmail: data.email,
            website: data.website
        }
    })

    return { success: true }
}
