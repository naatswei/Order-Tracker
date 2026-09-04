import { NextResponse } from 'next/server'
import { confirmInvoicePayment } from '@/app/actions/invoice'
import { initiateBulkClixMoMoPayout, initiateBulkClixBankPayout } from '@/app/actions/bulkclix-payment'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        console.log("BulkClix Webhook Payload Received:", body)

        // BulkClix webhook parameters
        const status = body.status || body.code || (body.data && body.data.status)
        const reference = body.reference || body.transaction_id || (body.data && body.data.transaction_id)
        const orderId = body.orderId || body.metadata?.orderId || (body.reference && body.reference.startsWith("ORD-") ? body.reference : null)

        // Parse orderId from reference if transaction_id contains orderId
        let resolvedOrderId = orderId
        if (!resolvedOrderId && typeof reference === 'string' && reference.includes("MOMO-")) {
            const parts = reference.split("-")
            if (parts.length >= 2) {
                resolvedOrderId = parts[1]
            }
        }

        const isSuccessful = status === 200 || status === "200" || status === "success" || status === "SUCCESS" || body.success === true

        if (isSuccessful && resolvedOrderId) {
            console.log(`BulkClix Webhook: Processing payment confirmation for Order ID: ${resolvedOrderId}`)

            // Confirm payment in database & mark invoice as paid
            await confirmInvoicePayment(resolvedOrderId, reference || `BULKCLIX-${Date.now()}`)

            // Trigger instant merchant payout if configured
            try {
                const orderData = await db.query.orders.findFirst({
                    where: eq(orders.id, resolvedOrderId)
                })

                if (orderData && orderData.clerkOrgId) {
                    const client = await clerkClient()
                    const org = await client.organizations.getOrganization({ organizationId: orderData.clerkOrgId })
                    const metadata = (org.publicMetadata as any) || {}

                    const payoutType = metadata.bulkclixPayoutType // "momo" or "bank"
                    const accountNumber = metadata.bulkclixAccountNumber
                    const accountName = metadata.bulkclixAccountName
                    const channelOrBankId = metadata.bulkclixChannelOrBankId

                    const invoice = (orderData.metadata as any)?.invoice
                    const payoutAmount = invoice?.amountDue ? Number((invoice.amountDue * 0.99).toFixed(2)) : 0 // 1% platform fee

                    if (payoutType && accountNumber && channelOrBankId && payoutAmount > 0) {
                        console.log(`BulkClix Webhook: Triggering instant ${payoutType} payout for Org: ${orderData.clerkOrgId}, Amount: GH₵ ${payoutAmount}`)
                        
                        if (payoutType === "momo") {
                            await initiateBulkClixMoMoPayout(orderData.clerkOrgId, payoutAmount, accountNumber, channelOrBankId, accountName)
                        } else if (payoutType === "bank") {
                            await initiateBulkClixBankPayout(orderData.clerkOrgId, payoutAmount, accountNumber, channelOrBankId, accountName)
                        }
                    }
                }
            } catch (payoutErr) {
                console.error("BulkClix Webhook: Error executing instant merchant payout:", payoutErr)
            }
        }

        return NextResponse.json({ message: 'Webhook received successfully', status: 'success' }, { status: 200 })
    } catch (error: any) {
        console.error('Error handling BulkClix payment webhook:', error)
        return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
    }
}
