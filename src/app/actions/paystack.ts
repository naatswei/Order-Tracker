'use server'

import { updateOrgSubscriptionStatus } from './org-metadata'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function verifyPayment(reference: string, orgId: string, planName: string) {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured.')
    }

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        })

        const data = await response.json()

        if (data.status && data.data.status === 'success') {
            // Calculate expiry date based on the plan name
            // (Parity with logic in subscription/page.tsx)
            const now = new Date()
            let expiryDays = 30
            if (planName === "Free Trial") expiryDays = 7
            if (planName === "2 weeks") expiryDays = 14
            if (planName === "Yearly") expiryDays = 365

            const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
            const isTrial = planName === "Free Trial"

            // Securely update Clerk metadata from the server
            await updateOrgSubscriptionStatus(
                orgId,
                'active',
                expiryDate,
                isTrial ? true : undefined
            )

            return { success: true, expiryDate }
        } else {
            return { success: false, error: data.message || 'Verification failed' }
        }
    } catch (error) {
        console.error('Error verifying Paystack payment:', error)
        return { success: false, error: 'Internal server error during verification' }
    }
}
