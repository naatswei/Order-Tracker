"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface SelectionCardProps {
    title: string
    description: string
    icon: LucideIcon
    imageSrc?: string
    selected?: boolean
    onClick?: () => void
    disabled?: boolean
    href?: string
}

export function SelectionCard({
    title,
    description,
    icon: Icon,
    imageSrc,
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
                "relative flex w-full items-center sm:flex-col sm:text-center gap-4 sm:gap-5 rounded-2xl sm:rounded-[2rem] border-2 transition-all duration-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                selected
                    ? "border-[#D4C9BA] bg-[#D4C9BA]/[0.04] shadow-[0_8px_30px_rgb(25,26,67,0.12)] -translate-y-1 p-4 sm:p-8 ring-2 ring-[#D4C9BA]/20"
                    : "border-slate-200 bg-white hover:bg-slate-50/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-slate-300 p-4 sm:p-8 shadow-sm",
            )}
        >
            {/* Mobile: Show image thumbnail. Desktop: Show icon */}
            {imageSrc ? (
                <>
                    {/* Mobile image */}
                    <div className={cn(
                        "sm:hidden relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors",
                        selected ? "border-[#D4C9BA]/30" : "border-slate-200"
                    )}>
                        <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="transition-transform duration-300"
                        />
                    </div>
                    {/* Desktop icon */}
                    <div
                        className={cn(
                            "hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors mb-2",
                            selected
                                ? "text-[#D4C9BA] shadow-[0_4px_20px_rgb(25,26,67,0.12)] border-2 border-[#D4C9BA]/30"
                                : "text-slate-600 border border-slate-200",
                        )}
                    >
                        <Icon className="h-6 w-6" />
                    </div>
                </>
            ) : (
                <div
                    className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors sm:mb-2 shrink-0",
                        selected
                            ? "text-[#D4C9BA] shadow-[0_4px_20px_rgb(25,26,67,0.12)] border-2 border-[#D4C9BA]/30"
                            : "text-slate-600 border border-slate-200",
                    )}
                >
                    <Icon className="h-6 w-6" />
                </div>
            )}
            <div className="space-y-1 sm:space-y-1.5 text-left sm:text-center">
                <h3 className={cn(
                    "font-semibold leading-none tracking-tight transition-colors",
                    selected ? "text-[#D4C9BA]" : "text-slate-800"
                )}>{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </Component>
    )
}
