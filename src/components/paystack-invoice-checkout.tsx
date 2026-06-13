"use client"

import { useState, useEffect } from "react"
import { usePaystackPayment } from "react-paystack"
import { Button } from "@/components/ui/button"
import { Loader2, Zap } from "lucide-react"
import { toast } from "sonner"

export default function PaystackInvoiceCheckout({ 
    order, 
    invoice, 
    publicKey,
    subaccountCode,
    onSuccess
}: { 
    order: any, 
    invoice: any, 
    publicKey: string,
    subaccountCode?: string,
    onSuccess: (ref: string) => void
}) {
    const [isPaying, setIsPaying] = useState(false)
    
    const amountInKobo = Math.round(invoice.amountDue * 100)
    
    const config = {
        reference: `INV-PAY-${order.id}-${Date.now()}`,
        email: order.customerEmail || `${order.customerPhone}@otracker.com`,
        amount: amountInKobo,
        publicKey: publicKey,
        currency: "GHS",
        subaccount: subaccountCode || undefined,
        metadata: {
            orderId: order.id,
            invoiceNumber: invoice.invoiceNumber
        }
    }
    
    const initializePayment = usePaystackPayment(config)
    
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                disabled
                className="w-full h-12 bg-blue-600/50 text-white rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 cursor-wait"
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading checkout...</span>
            </Button>
        )
    }
    
    const handlePay = () => {
        setIsPaying(true)
        initializePayment({
            onSuccess: (reference: any) => {
                setIsPaying(false)
                onSuccess(reference.reference)
            },
            onClose: () => {
                setIsPaying(false)
                toast.error("Payment window closed.")
            }
        })
    }

    return (
        <Button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full min-h-12 h-auto py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-normal text-center"
        >
            {isPaying ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                </>
            ) : (
                <>
                    <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>Pay Online with Paystack (GH₵ {invoice.amountDue.toFixed(2)})</span>
                </>
            )}
        </Button>
    )
}
