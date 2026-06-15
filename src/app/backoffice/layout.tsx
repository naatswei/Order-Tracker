import { BackofficeGuard } from "@/components/backoffice-guard"
import { TerminalGuard } from "@/components/terminal-guard"
import { getStaffSession } from "@/lib/session"

export default async function BackofficeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getStaffSession()

    return (
        <BackofficeGuard>
            {children}
        </BackofficeGuard>
    )
}
