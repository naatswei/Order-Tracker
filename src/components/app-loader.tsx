"use client"

import { SignatureLoader } from "./signature-loader"

interface AppLoaderProps {
    message?: string
}

export function AppLoader({ message = "Entering OTracker..." }: AppLoaderProps) {
    return <SignatureLoader message={message} fullScreen={true} />
}
