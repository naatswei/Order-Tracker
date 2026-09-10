"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Layers, Clock, RotateCcw } from "lucide-react"
import { addWorkflowStage, removeWorkflowStage, reorderWorkflowStages, updateWorkflowStageTimeLimit, resetWorkflowStagesToDefault } from "@/app/actions/operations"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Stage {
    id: string
    name: string
    position: string
    timeLimitMinutes?: number | null
}

interface StageConfigProps {
    initialStages: Stage[]
    onUpdate: () => void
    businessType?: string
    logisticsType?: string
}

export function StageConfig({ initialStages, onUpdate, businessType, logisticsType }: StageConfigProps) {
    const [newStageName, setNewStageName] = useState("")
    const [newStageTimeLimit, setNewStageTimeLimit] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [isReordering, setIsReordering] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    async function handleAdd() {
        if (!newStageName.trim()) return
        setIsAdding(true)
        try {
            const nextPos = (initialStages.length + 1).toString()
            const mins = newStageTimeLimit.trim() ? parseInt(newStageTimeLimit.trim(), 10) : null
            const result = await addWorkflowStage(newStageName, nextPos, isNaN(mins as number) ? null : mins)
            
            if (result.error) {
                toast.error(result.error)
                return
            }

            setNewStageName("")
            setNewStageTimeLimit("")
            toast.success(`Stage "${newStageName.trim()}" added to pipeline!`)
            onUpdate()
        } catch (error) {
            toast.error("Failed to add stage")
        } finally {
            setIsAdding(false)
        }
    }

    async function handleUpdateTimeLimit(id: string, value: string) {
        const parsed = value.trim() ? parseInt(value.trim(), 10) : null
        const mins = isNaN(parsed as number) ? null : parsed
        try {
            await updateWorkflowStageTimeLimit(id, mins)
            toast.success("Stage time limit updated")
            onUpdate()
        } catch (error) {
            toast.error("Failed to update time limit")
        }
    }

    async function handleDelete(id: string, name: string) {
        try {
            await removeWorkflowStage(id, name)
            toast.success(`Stage "${name}" removed`)
            onUpdate()
        } catch (error) {
            toast.error("Failed to remove stage")
        }
    }

    async function handleResetDefaults() {
        setIsResetting(true)
        try {
            await resetWorkflowStagesToDefault()
            toast.success("Pipeline stages reset to default!")
            onUpdate()
        } catch (error) {
            toast.error("Failed to reset stages")
        } finally {
            setIsResetting(false)
        }
    }

    async function handleMove(index: number, direction: "up" | "down") {
        if (isReordering) return
        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= initialStages.length) return

        const newStages = [...initialStages]
        const [moved] = newStages.splice(index, 1)
        newStages.splice(targetIndex, 0, moved)

        const stageIds = newStages.map(s => s.id)
        setIsReordering(true)
        try {
            await reorderWorkflowStages(stageIds)
            toast.success("Pipeline reordered")
            onUpdate()
        } catch (error) {
            toast.error("Failed to reorder stages")
        } finally {
            setIsReordering(false)
        }
    }

    const stagePlaceholder = (() => {
        if (businessType === "logistics") {
            if (logisticsType === "delivery") return "Stage name (e.g. In Sorting / Hub)"
            if (logisticsType === "shipping") return "Stage name (e.g. Customs Clearance)"
            return "Stage name (e.g. Kitchen Cooking, Food Ready)"
        }
        if (businessType === "tailoring") return "Stage name (e.g. First Fitting, Production)"
        if (businessType === "hair-retail") return "Stage name (e.g. Wigging / Styling)"
        if (businessType === "online-business") return "Stage name (e.g. Packaging, Dispatched)"
        return "Stage name (e.g. In Progress)"
    })()

    return (
        <div className="space-y-5">
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Active Pipeline Stages ({initialStages.length})</span>
                    </p>
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        disabled={isResetting}
                        className="text-[11px] text-slate-500 hover:text-[#191A43] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                        title="Reset stages to default template for your business model"
                    >
                        <RotateCcw className={cn("w-3 h-3", isResetting && "animate-spin")} />
                        <span>Reset Defaults</span>
                    </button>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {initialStages.map((stage, index) => {
                        const isFirst = index === 0
                        const isLast = index === initialStages.length - 1

                        return (
                            <div 
                                key={stage.id || stage.name}
                                className="flex items-center gap-2 p-2.5 sm:p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl group transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
                            >
                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-[#191A43] shadow-xs shrink-0">
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">{stage.name}</p>
                                </div>

                                {/* Time limit setting input */}
                                <div 
                                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-xl transition-colors shrink-0" 
                                    title="Time limit in minutes (e.g. 30)"
                                >
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        key={`${stage.id}-${stage.timeLimitMinutes || 0}`}
                                        defaultValue={stage.timeLimitMinutes || ""}
                                        placeholder="No limit"
                                        onBlur={(e) => handleUpdateTimeLimit(stage.id, e.target.value)}
                                        onKeyDown={(e) => {
                                             if (e.key === "Enter") {
                                                 (e.target as HTMLInputElement).blur()
                                             }
                                        }}
                                        className="w-12 bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold">m</span>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isFirst || isReordering}
                                        onClick={() => handleMove(index, "up")}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                                        title="Move Up"
                                    >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isLast || isReordering}
                                        onClick={() => handleMove(index, "down")}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                                        title="Move Down"
                                    >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                        type="button"
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-20"
                                        disabled={initialStages.length <= 1}
                                        onClick={() => handleDelete(stage.id, stage.name)}
                                        title="Delete Stage"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                    
                    {initialStages.length === 0 && (
                        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-xs font-semibold text-slate-400">Using default system workflow.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex gap-2">
                    <Input 
                        placeholder={stagePlaceholder} 
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                handleAdd()
                            }
                        }}
                        className="h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm font-medium transition-all flex-1"
                    />
                    <div className="w-24 shrink-0 relative flex items-center">
                        <Input 
                            type="number"
                            min="1"
                            placeholder="Limit" 
                            value={newStageTimeLimit}
                            onChange={(e) => setNewStageTimeLimit(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    handleAdd()
                                }
                            }}
                            className="h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-bold transition-all pr-6"
                            title="Time limit in minutes (e.g. 30)"
                        />
                        <span className="absolute right-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">m</span>
                    </div>
                    <Button 
                        type="button"
                        disabled={isAdding || !newStageName.trim()}
                        onClick={handleAdd}
                        className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold transition-all shadow-md shadow-[#191A43]/10 text-xs shrink-0 cursor-pointer"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add
                    </Button>
                </div>
                <p className="text-[10px] text-slate-400 px-1">
                    * Set a time limit (e.g. 30m) to automatically trigger red alerts in Operations when an order is delayed.
                </p>
            </div>
        </div>
    )
}
