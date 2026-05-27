"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { LucideIcon, Check } from "lucide-react"

interface SelectionCardProps {
    title: string
    description: string
    icon: LucideIcon
    imageSrc?: string
    selected?: boolean
    onClick?: () => void
    disabled?: boolean
    href?: string
    colorTheme?: "violet" | "gold" | "emerald" | "blue"
    onMouseEnter?: () => void
    onMouseLeave?: () => void
}

const themeStyles = {
    violet: {
        activeBorder: "border-violet-600 ring-2 ring-violet-500/20 bg-violet-50/[0.02]",
        activeText: "text-violet-700",
        activeIconBox: "text-violet-600 bg-violet-50 border-violet-100",
        indicator: "bg-violet-600 border-violet-600 text-white scale-100 opacity-100",
        glow: "shadow-[0_8px_30px_rgba(124,58,237,0.08)]",
    },
    gold: {
        activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/[0.02]",
        activeText: "text-amber-700",
        activeIconBox: "text-amber-600 bg-amber-50 border-amber-100",
        indicator: "bg-amber-500 border-amber-500 text-white scale-100 opacity-100",
        glow: "shadow-[0_8px_30px_rgba(245,158,11,0.08)]",
    },
    emerald: {
        activeBorder: "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/[0.02]",
        activeText: "text-emerald-700",
        activeIconBox: "text-emerald-600 bg-emerald-50 border-emerald-100",
        indicator: "bg-emerald-600 border-emerald-600 text-white scale-100 opacity-100",
        glow: "shadow-[0_8px_30px_rgba(16,185,129,0.08)]",
    },
    blue: {
        activeBorder: "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/[0.02]",
        activeText: "text-blue-700",
        activeIconBox: "text-blue-600 bg-blue-50 border-blue-100",
        indicator: "bg-blue-600 border-blue-600 text-white scale-100 opacity-100",
        glow: "shadow-[0_8px_30px_rgba(37,99,235,0.08)]",
    }
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
    colorTheme = "violet",
    onMouseEnter,
    onMouseLeave,
}: SelectionCardProps) {
    const Component = href ? Link : "button"
    const currentTheme = themeStyles[colorTheme]

    return (
        <Component
            href={href as string}
            onClick={onClick}
            disabled={!href && disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            type="button"
            className={cn(
                "relative flex w-full items-center sm:flex-col sm:text-center gap-4 sm:gap-5 rounded-2xl sm:rounded-[2rem] border-2 transition-all duration-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden",
                selected
                    ? cn("-translate-y-1 p-5 sm:p-8", currentTheme.activeBorder, currentTheme.glow)
                    : "border-slate-100 bg-white hover:bg-slate-50/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-slate-200 p-5 sm:p-8 shadow-sm",
            )}
        >
            {/* Selection Check Indicator */}
            <div className={cn(
                "absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 z-10 shrink-0",
                selected
                    ? currentTheme.indicator
                    : "border-slate-200 text-transparent scale-90 opacity-0 sm:opacity-100"
            )}>
                <Check className="w-3 h-3 stroke-[3]" />
            </div>

            {/* Mobile: Show image thumbnail. Desktop: Show icon */}
            {imageSrc ? (
                <>
                    {/* Mobile image */}
                    <div className={cn(
                        "sm:hidden relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border transition-colors",
                        selected ? "border-slate-200" : "border-slate-100"
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
                            "hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all duration-300 mb-1 border shrink-0",
                            selected
                                ? cn(currentTheme.activeIconBox, "scale-105 shadow-md")
                                : "text-slate-500 border-slate-100 bg-slate-50/50",
                        )}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                </>
            ) : (
                <div
                    className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all duration-300 sm:mb-1 border shrink-0",
                        selected
                            ? cn(currentTheme.activeIconBox, "scale-105 shadow-md")
                            : "text-slate-500 border-slate-100 bg-slate-50/50",
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            )}
            
            <div className="space-y-1 text-left sm:text-center">
                <h3 className={cn(
                    "font-bold leading-none tracking-tight transition-colors text-sm sm:text-base",
                    selected ? currentTheme.activeText : "text-slate-800"
                )}>{title}</h3>
                <p className="text-xs text-slate-400 font-medium sm:max-w-[200px] leading-relaxed">{description}</p>
            </div>
        </Component>
    )
}

