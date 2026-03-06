import crypto from 'crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateOrgSubscriptionStatus } from '@/app/actions/org-metadata'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(req: Request) {
    if (!PAYSTACK_SECRET_KEY) {
        return new NextResponse('Paystack secret key not configured', { status: 500 })
    }

    try {
        const body = await req.text()
        const headerList = await headers()
        const signature = headerList.get('x-paystack-signature')

        if (!signature) {
            return new NextResponse('No signature provided', { status: 400 })
        }

        // Verify webhook signature
        const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET_KEY)
            .update(body)
            .digest('hex')

        if (hash !== signature) {
            return new NextResponse('Invalid signature', { status: 401 })
        }

        const event = JSON.parse(body)

        // Handle charge.success
        if (event.event === 'charge.success') {
            const { reference, metadata } = event.data
            const orgId = metadata?.orgId
            const planName = metadata?.planName

            if (orgId && planName) {
                // Calculate expiry logic (sharing logic with other parts)
                const now = new Date()
                let expiryDays = 30
                if (planName === "Free Trial") expiryDays = 7
                if (planName === "2 weeks") expiryDays = 14
                if (planName === "Yearly") expiryDays = 365

                const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
                const isTrial = planName === "Free Trial"

                await updateOrgSubscriptionStatus(
                    orgId,
                    'active',
                    expiryDate,
                    isTrial ? true : undefined,
                    planName,
                    true
                )

                console.log(`Webhook: Successfully updated subscription for Org: ${orgId}, Plan: ${planName}`)
            }
        }

        return new NextResponse('Webhook received', { status: 200 })
    } catch (error) {
        console.error('Error handling Paystack webhook:', error)
        return new NextResponse('Internal server error', { status: 500 })
    }
}
