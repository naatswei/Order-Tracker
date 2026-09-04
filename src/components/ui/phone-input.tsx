"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Search, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COUNTRIES, getCountryByCode } from "@/constants/countries"

interface PhoneInputWithCountryProps {
    id?: string
    countryCode: string
    phoneLocal: string
    onCountryCodeChange: (code: string) => void
    onPhoneLocalChange: (local: string) => void
    placeholder?: string
    required?: boolean
    disabled?: boolean
    className?: string
}

export function PhoneInputWithCountry({
    id = "phone-input",
    countryCode,
    phoneLocal,
    onCountryCodeChange,
    onPhoneLocalChange,
    placeholder,
    required = false,
    disabled = false,
    className
}: PhoneInputWithCountryProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const selectedCountry = getCountryByCode(countryCode)
    const cleanPhone = phoneLocal.replace(/^0+/, "").replace(/\D/g, "")
    const isValid = cleanPhone.length >= selectedCountry.minLength && cleanPhone.length <= selectedCountry.maxLength

    const filteredCountries = COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    )

    return (
        <div className="flex gap-2 relative">
            {/* Country Selector Button */}
            <div className="relative shrink-0" ref={dropdownRef}>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer text-slate-800 shadow-sm"
                >
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                </Button>

                {/* Country Search Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 p-2 w-72 rounded-2xl shadow-xl border border-slate-100 bg-white z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                        <div className="flex items-center gap-2 px-2.5 pb-2 pt-1 border-b border-slate-100">
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                placeholder="Search country or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70 text-slate-800 font-medium"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-52 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar">
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((c) => {
                                    const isSelected = c.code === countryCode;
                                    return (
                                        <button
                                            key={`${c.name}-${c.code}`}
                                            type="button"
                                            onClick={() => {
                                                onCountryCodeChange(c.code)
                                                setIsDropdownOpen(false)
                                                setSearchQuery("")
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all cursor-pointer",
                                                isSelected
                                                    ? "bg-slate-100 font-bold text-slate-900"
                                                    : "hover:bg-slate-50 text-slate-700 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-base leading-none" role="img" aria-label={c.name}>{c.flag}</span>
                                                <span className="truncate max-w-[120px]">{c.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-[10px] text-muted-foreground font-mono">{c.code}</span>
                                                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="py-4 text-center text-xs text-muted-foreground">
                                    No countries found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Subscriber Number Input */}
            <div className="flex-1 relative">
                <Input
                    id={id}
                    type="tel"
                    placeholder={placeholder || selectedCountry.placeholder}
                    required={required}
                    disabled={disabled}
                    value={phoneLocal}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        onPhoneLocalChange(val);
                    }}
                    className={cn(
                        "h-11 border-zinc-200 bg-white text-sm font-medium focus-visible:ring-primary transition-all pr-9 rounded-xl",
                        phoneLocal && !isValid && "border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400",
                        phoneLocal && isValid && "border-emerald-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500",
                        className
                    )}
                />
                {phoneLocal && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none">
                        {isValid ? (
                            <span className="text-emerald-500 text-xs font-bold">✓</span>
                        ) : (
                            <span className="text-red-500 text-xs font-bold">✗</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
