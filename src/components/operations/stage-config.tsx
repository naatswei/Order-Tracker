"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Layers } from "lucide-react"
import { addWorkflowStage, removeWorkflowStage, reorderWorkflowStages } from "@/app/actions/operations"
import { toast } from "sonner"

interface Stage {
    id: string
    name: string
    position: string
}

interface StageConfigProps {
    initialStages: Stage[]
    onUpdate: () => void
}

export function StageConfig({ initialStages, onUpdate }: StageConfigProps) {
    const [newStageName, setNewStageName] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [isReordering, setIsReordering] = useState(false)

    async function handleAdd() {
        if (!newStageName.trim()) return
        setIsAdding(true)
        try {
            const nextPos = (initialStages.length + 1).toString()
            const result = await addWorkflowStage(newStageName, nextPos)
            
            if (result.error) {
                toast.error(result.error)
                return
            }

            setNewStageName("")
            toast.success(`Stage "${newStageName.trim()}" added to pipeline!`)
            onUpdate()
        } catch (error) {
            toast.error("Failed to add stage")
        } finally {
            setIsAdding(false)
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

    return (
        <div className="space-y-5">
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Active Pipeline Stages ({initialStages.length})</span>
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">Use arrows to reorder</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {initialStages.map((stage, index) => {
                        const isFirst = index === 0
                        const isLast = index === initialStages.length - 1

                        return (
                            <div 
                                key={stage.id || stage.name}
                                className="flex items-center gap-2.5 p-2.5 sm:p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl group transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
                            >
                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-[#191A43] shadow-xs shrink-0">
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">{stage.name}</p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
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

            <div className="pt-3 border-t border-slate-100">
                <div className="flex gap-2">
                    <Input 
                        placeholder="e.g. Quality Check, Out for Delivery" 
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                handleAdd()
                            }
                        }}
                        className="h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm font-medium transition-all"
                    />
                    <Button 
                        type="button"
                        disabled={isAdding || !newStageName.trim()}
                        onClick={handleAdd}
                        className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold transition-all shadow-md shadow-[#191A43]/10 text-xs shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add
                    </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 px-1">
                    * Stages define the columns on your board and the progress tracker visible to customers.
                </p>
            </div>
        </div>
    )
}
