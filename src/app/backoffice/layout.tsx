import { BackofficeGuard } from "@/components/backoffice-guard"

export default function BackofficeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <BackofficeGuard>
            {children}
        </BackofficeGuard>
    )
}
