'use server'

import { updateOrgSubscriptionStatus } from './org-metadata'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { detectGhanaNetworkProvider } from '@/lib/utils'

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
            if (planName === "Free Trial") expiryDays = 14
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

export async function getGHSBanks() {
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key is not configured.")
    try {
        const response = await fetch("https://api.paystack.co/bank?currency=GHS", {
            method: "GET",
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        })
        const data = await response.json()
        if (data.status) {
            return { success: true, banks: data.data }
        }
        return { success: false, error: data.message }
    } catch (error) {
        console.error("Failed to fetch GHS banks:", error)
        return { success: false, error: "Failed to fetch banks" }
    }
}

export async function resolveBankAccount(accountNumber: string, bankCode: string) {
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key is not configured.")
    try {
        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        })
        const data = await response.json()
        if (data.status) {
            return { success: true, accountName: data.data.account_name }
        }
        return { success: false, error: data.message || "Failed to resolve account" }
    } catch (error) {
        console.error("Failed to resolve bank account:", error)
        return { success: false, error: "Failed to resolve bank account" }
    }
}

export async function saveMerchantPayoutSettings(
    orgId: string,
    data: {
        bankCode: string
        bankName: string
        accountNumber: string
        businessName: string
    }
) {
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key is not configured.")

    try {
        const client = await clerkClient()
        const org = await client.organizations.getOrganization({ organizationId: orgId })

        const currentMetadata = org.publicMetadata || {}
        const existingSubaccountCode = (currentMetadata as any)?.paystackSubaccountCode

        let response
        if (existingSubaccountCode) {
            response = await fetch(`https://api.paystack.co/subaccount/${existingSubaccountCode}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    business_name: data.businessName,
                    settlement_bank: data.bankCode,
                    account_number: data.accountNumber,
                    percentage_charge: 1, // OTracker platform fee: 1%
                    bearer: "subaccount"  // merchant's subaccount bears Paystack transaction fee
                })
            })
        } else {
            response = await fetch("https://api.paystack.co/subaccount", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    business_name: data.businessName,
                    settlement_bank: data.bankCode,
                    account_number: data.accountNumber,
                    percentage_charge: 1, // OTracker platform fee: 1%
                    bearer: "subaccount"  // merchant's subaccount bears Paystack transaction fee
                })
            })
        }

        const resData = await response.json()
        if (!resData.status) {
            return { success: false, error: resData.message || "Paystack subaccount configuration failed." }
        }

        const subaccountCode = resData.data.subaccount_code

        await client.organizations.updateOrganizationMetadata(orgId, {
            publicMetadata: {
                ...currentMetadata,
                paystackSubaccountCode: subaccountCode,
                payoutBankName: data.bankName,
                payoutBankCode: data.bankCode,
                payoutAccountNumber: data.accountNumber,
                payoutAccountName: resData.data.account_name || ""
            }
        })

        return { success: true, subaccountCode }
    } catch (error: any) {
        console.error("Failed to configure payout subaccount:", error)
        return { success: false, error: error.message || "An unexpected error occurred." }
    }
}

export async function initiateMomoCharge(orderId: string, phone: string, provider?: 'mtn' | 'vod' | 'atl') {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured.')
    }

    try {
        // Normalize phone number to local 10-digit format (e.g. 0577064301)
        const cleanPhone = phone.replace(/\D/g, "")
        let localPhone = cleanPhone
        if (cleanPhone.startsWith("233")) {
            localPhone = "0" + cleanPhone.substring(3)
        } else if (!cleanPhone.startsWith("0") && cleanPhone.length === 9) {
            localPhone = "0" + cleanPhone
        }

        // Auto-detect provider if missing or fallback to match detected value
        const detectedProvider = detectGhanaNetworkProvider(localPhone)
        const finalProvider = provider || detectedProvider

        if (!finalProvider) {
            return { success: false, error: 'Could not detect network provider for phone number: ' + phone }
        }

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
        })

        if (!order) {
            return { success: false, error: 'Order not found' }
        }

        const invoice = (order.metadata as any)?.invoice
        if (!invoice) {
            return { success: false, error: 'No invoice generated for this order yet.' }
        }

        // Amount in GHS pesewas (multiplied by 100)
        const amount = Math.round(invoice.amountDue * 100)
        const email = order.customerEmail || 'customer@email.com'

        // Determine if subaccount code is present
        let subaccountCode: string | undefined = undefined
        if (order.clerkOrgId) {
            const client = await clerkClient()
            const org = await client.organizations.getOrganization({ organizationId: order.clerkOrgId })
            subaccountCode = (org.publicMetadata as any)?.paystackSubaccountCode
        }

        const requestBody: any = {
            amount,
            email,
            currency: 'GHS',
            mobile_money: {
                phone: localPhone,
                provider: finalProvider,
            },
            metadata: {
                orderId: order.id,
            },
        }

        if (subaccountCode) {
            requestBody.subaccount = subaccountCode
        }

        const response = await fetch('https://api.paystack.co/charge', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })

        const resData = await response.json()

        if (resData.status) {
            return { 
                success: true, 
                message: resData.message || 'Momo prompt initiated.',
                reference: resData.data.reference,
                status: resData.data.status
            }
        } else {
            return { success: false, error: resData.message || 'Momo prompt failed to trigger.' }
        }
    } catch (error: any) {
        console.error('Error initiating Mobile Money charge:', error)
        return { success: false, error: error?.message || 'Failed to initiate Mobile Money charge' }
    }
}
