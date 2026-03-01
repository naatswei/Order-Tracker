import { BackofficeGuard } from "@/components/backoffice-guard"
import { RenewalBanner } from "@/components/renewal-banner"

export default function BackofficeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <BackofficeGuard>
            <RenewalBanner />
            {children}
        </BackofficeGuard>
    )
}
