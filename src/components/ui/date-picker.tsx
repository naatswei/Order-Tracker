"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    fromDate?: Date
    toDate?: Date
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className, disabled, fromDate, toDate }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 focus-visible:ring-primary/20 hover:text-slate-900 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]",
                        !date && "text-slate-400",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                        setDate(selectedDate)
                        setOpen(false)
                    }}
                    fromDate={fromDate}
                    toDate={toDate}
                    startMonth={fromDate}
                    endMonth={toDate}
                    disabled={fromDate ? { before: fromDate } : (toDate ? { after: toDate } : undefined)}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
