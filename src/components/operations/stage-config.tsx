"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
import { addWorkflowStage, removeWorkflowStage } from "@/app/actions/operations"
import { toast } from "sonner"
import { motion, Reorder } from "framer-motion"

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
            toast.success("Stage added")
            onUpdate()
        } catch (error) {
            toast.error("Failed to add stage")
        } finally {
            setIsAdding(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            await removeWorkflowStage(id)
            toast.success("Stage removed")
            onUpdate()
        } catch (error) {
            toast.error("Failed to remove stage")
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Pipeline</p>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {initialStages.map((stage, index) => (
                        <div 
                            key={stage.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group transition-all hover:border-slate-200"
                        >
                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                {index + 1}
                            </div>
                            <span className="flex-1 font-bold text-slate-700">{stage.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    onClick={() => handleDelete(stage.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    
                    {initialStages.length === 0 && (
                        <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                            <p className="text-sm text-slate-400">Using default system workflow.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                    <Input 
                        placeholder="e.g. Quality Check" 
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    />
                    <Button 
                        disabled={isAdding || !newStageName.trim()}
                        onClick={handleAdd}
                        className="h-11 px-6 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold transition-all shadow-lg shadow-[#191A43]/10"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                    </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 px-1 italic">New stages will appear at the end of the production line.</p>
            </div>
        </div>
    )
}
