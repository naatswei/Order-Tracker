'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export async function updateOrgBusinessType(orgId: string, businessType: string) {
    const { userId } = await auth()

    if (!userId) {
        throw new Error('Unauthorized')
    }

    const client = await clerkClient()

    await client.organizations.updateOrganizationMetadata(orgId, {
        publicMetadata: {
            businessType: businessType
        }
    })

    return { success: true }
}
