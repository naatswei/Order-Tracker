"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { LucideIcon, Check } from "lucide-react"

interface SelectionCardProps {
    title: string
    description: string
    icon: LucideIcon
    selected?: boolean
    onClick?: () => void
    disabled?: boolean
    href?: string
}

export function SelectionCard({
    title,
    description,
    icon: Icon,
    selected,
    onClick,
    disabled,
    href,
}: SelectionCardProps) {
    const Component = href ? Link : "button"

    return (
        <Component
            href={href as string}
            onClick={onClick}
            disabled={!href && disabled}
            type="button"
            className={cn(
                "relative flex w-full flex-col items-center text-center gap-4 rounded-xl border p-8 transition-all hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card",
            )}
        >
            <div
                className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 transition-colors mb-2",
                    selected
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-900",
                )}
            >
                <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
                <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {selected && (
                <div className="absolute right-4 top-4 text-primary">
                    <Check className="h-5 w-5" />
                </div>
            )}
        </Component>
    )
}
