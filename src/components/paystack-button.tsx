"use client"

import { usePaystackPayment } from "react-paystack"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { verifyPayment } from "@/app/actions/paystack"

interface PaystackButtonProps {
    plan: any
    publicKey: string
    organization: any
    user: any
    onSuccess: () => void
    isLoaded: boolean
}

export default function PaystackButton({
    plan,
    publicKey,
    organization,
    user,
    onSuccess,
    isLoaded
}: PaystackButtonProps) {
    const [isRedirecting, setIsRedirecting] = useState(false)

    const amountInGHS = parseInt(plan.price.replace(/[^0-9]/g, ""))
    const amountInKobo = amountInGHS * 100

    const config = {
        reference: (new Date()).getTime().toString(),
        email: organization?.publicMetadata?.adminEmail as string || user?.primaryEmailAddress?.emailAddress || "",
        amount: amountInKobo,
        publicKey: publicKey,
        currency: "GHS",
        metadata: {
            custom_fields: [
                {
                    display_name: "Plan Name",
                    variable_name: "plan_name",
                    value: plan.name
                },
                {
                    display_name: "Organization ID",
                    variable_name: "org_id",
                    value: organization?.id
                }
            ],
            orgId: organization?.id,
            planName: plan.name
        }
    }

    const initializePayment = usePaystackPayment(config)

    const handleSelect = () => {
        if (!isLoaded || isRedirecting || !organization) return

        if (plan.name === "Free Trial") {
            // Prevent duplicate trials
            if (organization.publicMetadata?.trialUsed) {
                toast.error("You've already used your free trial. Please choose a paid plan to continue.")
                return
            }
            setIsRedirecting(true)
            onSuccess()
            return
        }

        if (!publicKey) {
            toast.error("Payment system configuration missing. Please contact support.")
            return
        }

        initializePayment({
            onSuccess: async (reference: any) => {
                setIsRedirecting(true)
                try {
                    const result = await verifyPayment(reference.reference, organization.id, plan.name)
                    if (result.success) {
                        toast.success("Payment verified! Activating plan...")
                        onSuccess()
                    } else {
                        toast.error(result.error || "Payment verification failed. Please contact support.")
                        setIsRedirecting(false)
                    }
                } catch (error) {
                    toast.error("An error occurred during verification.")
                    setIsRedirecting(false)
                }
            },
            onClose: () => {
                console.log("Payment closed")
            }
        })
    }

    return (
        <Button
            onClick={handleSelect}
            disabled={!isLoaded || isRedirecting}
            className={cn(
                "w-full h-12 text-sm font-bold rounded-xl transition-all duration-200",
                plan.name === "Month" ? "bg-white text-[#101323] hover:bg-white/90" : "bg-[#161931] text-white hover:bg-[#161931]/90",
                isRedirecting && "opacity-70 scale-[0.98]",
                !isLoaded && "opacity-50 cursor-not-allowed"
            )}
        >
            {isRedirecting ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                </div>
            ) : plan.buttonText}
        </Button>
    )
}
