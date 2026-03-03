"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

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
                "relative flex w-full flex-col items-center text-center gap-5 rounded-[2rem] border transition-all duration-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                selected
                    ? "border-primary/20 bg-primary/5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] -translate-y-1 p-8"
                    : "border-slate-100 bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-slate-200 p-8 shadow-[0_2px_10px_rgb(0,0,0,0.02)]",
            )}
        >
            <div
                className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-50 transition-colors mb-2",
                    selected
                        ? "text-primary shadow-[0_4px_20px_rgb(0,0,0,0.04)]"
                        : "text-slate-400",
                )}
            >
                <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
                <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </Component>
    )
}
