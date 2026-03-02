"use client"

import { useEffect } from "react"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const initAudio = async () => {
            const { notificationSound } = await import("@/lib/notifications")

            const handleInteraction = () => {
                notificationSound.init()
                // Remove listeners after first interaction
                window.removeEventListener("click", handleInteraction)
                window.removeEventListener("keydown", handleInteraction)
                window.removeEventListener("touchstart", handleInteraction)
            }

            window.addEventListener("click", handleInteraction)
            window.addEventListener("keydown", handleInteraction)
            window.addEventListener("touchstart", handleInteraction)
        }

        initAudio()
    }, [])

    return (
        <>
            {children}
            <Toaster richColors position="top-right" />
        </>
    )
}
