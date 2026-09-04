'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { detectGhanaNetworkProvider } from '@/lib/utils'

const BULKCLIX_API_KEY = process.env.BULKCLIX_API_KEY || "s7JHkdFAXNAHKuuzQ00MQyhcpd5aZoB8hyirebM"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.otracker.net"

function getHeaders() {
    return {
        "x-api-key": BULKCLIX_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
}

/**
 * 1. Mobile Money Collection (momopay)
 * Triggers instant MoMo PIN prompt on customer phone
 */
export async function initiateBulkClixMomoCollection(orderId: string, phone: string, provider?: string) {
    try {
        const cleanPhone = phone.replace(/\D/g, "")
        let localPhone = cleanPhone
        if (cleanPhone.startsWith("233")) {
            localPhone = "0" + cleanPhone.substring(3)
        } else if (!cleanPhone.startsWith("0") && cleanPhone.length === 9) {
            localPhone = "0" + cleanPhone
        }

        const detectedProvider = detectGhanaNetworkProvider(localPhone)
        let rawNetwork = (provider || detectedProvider || "MTN").toUpperCase()
        
        // Map provider names to BulkClix network identifiers (MTN, TELECEL, AIRTELTIGO)
        if (rawNetwork.includes("VODAFONE") || rawNetwork.includes("TELECEL") || rawNetwork === "VOD") {
            rawNetwork = "TELECEL"
        } else if (rawNetwork.includes("AIRTEL") || rawNetwork.includes("TIGO") || rawNetwork === "ATL") {
            rawNetwork = "AIRTELTIGO"
        } else {
            rawNetwork = "MTN"
        }

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
        })

        if (!order) {
            return { success: false, error: 'Order not found' }
        }

        const invoice = (order.metadata as any)?.invoice
        if (!invoice || !invoice.amountDue) {
            return { success: false, error: 'No invoice generated for this order yet.' }
        }

        const amount = Number(invoice.amountDue)
        const transactionId = `MOMO-${order.id}-${Date.now()}`
        const callbackUrl = `${APP_URL}/api/webhooks/bulkclix`

        const payload = {
            amount: amount,
            phone_number: localPhone,
            network: rawNetwork,
            transaction_id: transactionId,
            callback_url: callbackUrl,
            reference: order.orderNumber || order.id
        }

        const response = await fetch("https://api.bulkclix.com/api/v1/payment-api/momopay", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        })

        const resData = await response.json()

        if (response.ok && (resData.status === 200 || resData.status === "success" || resData.success || resData.data)) {
            return {
                success: true,
                message: resData.message || "Mobile Money PIN prompt sent to customer phone.",
                transactionId: transactionId,
                data: resData.data || resData
            }
        }

        return {
            success: false,
            error: resData.message || resData.error || "Failed to trigger BulkClix Mobile Money charge."
        }
    } catch (error: any) {
        console.error("Error in BulkClix MoMo collection:", error)
        return { success: false, error: error?.message || "Failed to initiate Mobile Money collection." }
    }
}

/**
 * 2. MoMo Name Query (KYC MSISDN Name Lookup)
 */
export async function queryMoMoAccountName(phone: string) {
    try {
        const cleanPhone = phone.replace(/\D/g, "")
        let localPhone = cleanPhone
        if (cleanPhone.startsWith("233")) {
            localPhone = "0" + cleanPhone.substring(3)
        } else if (!cleanPhone.startsWith("0") && cleanPhone.length === 9) {
            localPhone = "0" + cleanPhone
        }

        const response = await fetch(`https://api.bulkclix.com/api/v1/kyc-api/msisdNameQuery?phone_number=${localPhone}`, {
            method: "GET",
            headers: getHeaders()
        })

        const data = await response.json()

        if (response.ok && (data.status === 200 || data.data || data.account_name || data.name)) {
            const accountName = data.account_name || data.name || (typeof data.data === 'string' ? data.data : data.data?.name || data.data?.account_name) || "Verified MoMo User"
            return { success: true, accountName }
        }

        return { success: false, error: data.message || "Could not resolve MoMo account name" }
    } catch (error: any) {
        console.error("Failed to query MoMo account name:", error)
        return { success: false, error: "Network error resolving MoMo name" }
    }
}

/**
 * 3. Fetch Supported Bank List
 */
export async function getBulkClixBankList() {
    try {
        const response = await fetch("https://api.bulkclix.com/api/v1/payment-api/banks/list", {
            method: "GET",
            headers: getHeaders()
        })

        const data = await response.json()

        if (response.ok && (data.status === 200 || Array.isArray(data) || Array.isArray(data.data))) {
            const banks = Array.isArray(data) ? data : data.data || []
            return { success: true, banks }
        }

        return { success: false, error: data.message || "Failed to fetch supported banks" }
    } catch (error: any) {
        console.error("Failed to fetch bank list from BulkClix:", error)
        return { success: false, error: "Failed to fetch bank list" }
    }
}

/**
 * 4. Bank Account Name Query
 */
export async function queryBankAccountName(accountNumber: string, bankId: string) {
    try {
        const url = `https://api.bulkclix.com/api/v1/payment-api/bankNameQuery?account_number=${encodeURIComponent(accountNumber)}&bank_id=${encodeURIComponent(bankId)}`
        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders()
        })

        const data = await response.json()

        if (response.ok && (data.status === 200 || data.account_name || data.name || data.data)) {
            const accountName = data.account_name || data.name || (typeof data.data === 'string' ? data.data : data.data?.account_name) || "Verified Bank Account"
            return { success: true, accountName }
        }

        return { success: false, error: data.message || "Could not resolve bank account name" }
    } catch (error: any) {
        console.error("Failed to query bank account name:", error)
        return { success: false, error: "Failed to resolve bank account" }
    }
}

/**
 * 5. Send Mobile Money (Instant MoMo Payout to Merchant)
 */
export async function initiateBulkClixMoMoPayout(
    orgId: string,
    amount: string | number,
    accountNumber: string,
    channel: string,
    accountName?: string
) {
    try {
        const cleanPhone = accountNumber.replace(/\D/g, "")
        let localPhone = cleanPhone
        if (cleanPhone.startsWith("233")) {
            localPhone = "0" + cleanPhone.substring(3)
        } else if (!cleanPhone.startsWith("0") && cleanPhone.length === 9) {
            localPhone = "0" + cleanPhone
        }

        let rawChannel = channel.toUpperCase()
        if (rawChannel.includes("VOD") || rawChannel.includes("TELECEL")) rawChannel = "TELECEL"
        else if (rawChannel.includes("AIRTEL") || rawChannel.includes("TIGO")) rawChannel = "AIRTELTIGO"
        else rawChannel = "MTN"

        const clientRef = `PAYOUT-MOMO-${orgId.slice(0, 8)}-${Date.now()}`

        const payload = {
            amount: String(amount),
            account_number: localPhone,
            channel: rawChannel,
            account_name: accountName || "Merchant Payout",
            client_reference: clientRef
        }

        const response = await fetch("https://api.bulkclix.com/api/v1/payment-api/send/mobilemoney", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        })

        const resData = await response.json()

        if (response.ok && (resData.status === 200 || resData.success || resData.data)) {
            return {
                success: true,
                message: resData.message || "Instant MoMo Payout processed successfully.",
                data: resData.data || resData
            }
        }

        return { success: false, error: resData.message || resData.error || "MoMo Payout transfer failed." }
    } catch (error: any) {
        console.error("Failed to execute MoMo payout:", error)
        return { success: false, error: error?.message || "Failed to execute MoMo payout." }
    }
}

/**
 * 6. Send To Bank (Instant Direct Bank Payout to Merchant)
 */
export async function initiateBulkClixBankPayout(
    orgId: string,
    amount: string | number,
    accountNumber: string,
    bankId: string,
    accountName?: string
) {
    try {
        const clientRef = `PAYOUT-BANK-${orgId.slice(0, 8)}-${Date.now()}`

        const payload = {
            amount: String(amount),
            account_number: accountNumber.trim(),
            account_name: accountName || "Merchant Payout",
            client_reference: clientRef,
            bank_id: bankId
        }

        const response = await fetch("https://api.bulkclix.com/api/v1/payment-api/send/bank", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        })

        const resData = await response.json()

        if (response.ok && (resData.status === 200 || resData.success || resData.data)) {
            return {
                success: true,
                message: resData.message || "Instant Bank Payout processed successfully.",
                data: resData.data || resData
            }
        }

        return { success: false, error: resData.message || resData.error || "Bank Payout transfer failed." }
    } catch (error: any) {
        console.error("Failed to execute Bank payout:", error)
        return { success: false, error: error?.message || "Failed to execute Bank payout." }
    }
}

/**
 * 7. Save Merchant BulkClix Payout Settings (MoMo vs Bank)
 */
export async function saveMerchantBulkClixPayoutSettings(
    orgId: string,
    data: {
        payoutType: "momo" | "bank"
        accountNumber: string
        accountName: string
        channelOrBankId: string
        bankName?: string
    }
) {
    try {
        const client = await clerkClient()
        const org = await client.organizations.getOrganization({ organizationId: orgId })

        const currentMetadata = org.publicMetadata || {}

        await client.organizations.updateOrganizationMetadata(orgId, {
            publicMetadata: {
                ...currentMetadata,
                bulkclixPayoutType: data.payoutType,
                bulkclixAccountNumber: data.accountNumber,
                bulkclixAccountName: data.accountName,
                bulkclixChannelOrBankId: data.channelOrBankId,
                bulkclixBankName: data.bankName || ""
            }
        })

        return { success: true }
    } catch (error: any) {
        console.error("Failed to save merchant BulkClix payout settings:", error)
        return { success: false, error: error?.message || "Failed to save payout settings." }
    }
}
