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
    colorTheme?: "violet" | "gold" | "emerald" | "blue"
}

const themeStyles = {
    violet: {
        activeBg: "bg-violet-50/60",
        activeBorder: "border-violet-500",
        activeText: "text-violet-700",
        activeIconBg: "bg-violet-100 text-violet-600",
        indicator: "bg-violet-600 border-violet-600 text-white",
    },
    gold: {
        activeBg: "bg-amber-50/60",
        activeBorder: "border-amber-500",
        activeText: "text-amber-700",
        activeIconBg: "bg-amber-100 text-amber-600",
        indicator: "bg-amber-500 border-amber-500 text-white",
    },
    emerald: {
        activeBg: "bg-emerald-50/60",
        activeBorder: "border-emerald-500",
        activeText: "text-emerald-700",
        activeIconBg: "bg-emerald-100 text-emerald-600",
        indicator: "bg-emerald-600 border-emerald-600 text-white",
    },
    blue: {
        activeBg: "bg-blue-50/60",
        activeBorder: "border-blue-500",
        activeText: "text-blue-700",
        activeIconBg: "bg-blue-100 text-blue-600",
        indicator: "bg-blue-600 border-blue-600 text-white",
    },
}

export function SelectionCard({
    title,
    description,
    icon: Icon,
    selected,
    onClick,
    disabled,
    href,
    colorTheme = "violet",
}: SelectionCardProps) {
    const Component = href ? Link : "button"
    const t = themeStyles[colorTheme]

    return (
        <Component
            href={href as string}
            onClick={onClick}
            disabled={!href && disabled}
            type="button"
            className={cn(
                "relative flex items-center gap-4 w-full rounded-2xl border-2 p-5 transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-left",
                selected
                    ? cn(t.activeBg, t.activeBorder)
                    : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                    selected
                        ? t.activeIconBg
                        : "bg-slate-100 text-slate-500"
                )}
            >
                <Icon className="h-5 w-5" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <h3
                    className={cn(
                        "font-semibold text-sm leading-tight transition-colors duration-200",
                        selected ? t.activeText : "text-slate-800"
                    )}
                >
                    {title}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Check indicator */}
            <div
                className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                    selected
                        ? t.indicator
                        : "border-slate-200"
                )}
            >
                {selected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
        </Component>
    )
}
