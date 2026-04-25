"use client"

import { useState, useEffect } from "react";
import { getOrders } from "@/app/actions/orders";
import { getStaff, assignOrder, updateOrderStage, getWorkflowStages } from "@/app/actions/operations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ChevronRight, 
    User, 
    Settings2,
    Plus,
    LayoutGrid,
    MoreHorizontal,
    Activity,
    Target,
    Zap,
    CheckCircle2,
    Truck
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion";

const STAGE_THEMES: Record<string, { color: string, icon: any, bg: string, border: string }> = {
    "Order Received": { color: "text-blue-600", icon: Target, bg: "bg-blue-50/50", border: "border-blue-100" },
    "Cutting": { color: "text-amber-600", icon: Activity, bg: "bg-amber-50/50", border: "border-amber-100" },
    "Sewing": { color: "text-indigo-600", icon: Zap, bg: "bg-indigo-50/50", border: "border-indigo-100" },
    "Ready for Pickup": { color: "text-emerald-600", icon: CheckCircle2, bg: "bg-emerald-50/50", border: "border-emerald-100" },
    "Shipped": { color: "text-rose-600", icon: Truck, bg: "bg-rose-50/50", border: "border-rose-100" },
};

export default function OperationsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [ordersData, staffData, stagesData] = await Promise.all([
                getOrders(),
                getStaff(),
                getWorkflowStages()
            ]);
            setOrders(ordersData);
            setStaff(staffData);
            setStages(stagesData.length > 0 ? stagesData : [
                { name: "Order Received", position: "1" },
                { name: "Cutting", position: "2" },
                { name: "Sewing", position: "3" },
                { name: "Ready for Pickup", position: "4" },
                { name: "Shipped", position: "5" }
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAssign(orderId: string, staffId: string) {
        try {
            await assignOrder(orderId, staffId);
            toast.success("Staff assigned");
            loadData();
        } catch (error) {
            toast.error("Failed to assign staff");
        }
    }

    async function handleMoveStage(orderId: string, currentStageName: string) {
        const currentIndex = stages.findIndex(s => s.name === currentStageName);
        if (currentIndex === -1 || currentIndex === stages.length - 1) return;

        const nextStage = stages[currentIndex + 1];
        try {
            await updateOrderStage(orderId, nextStage.name);
            toast.success(`Moved to ${nextStage.name}`);
            loadData();
        } catch (error) {
            toast.error("Failed to update stage");
        }
    }

    if (isLoading) return (
        <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Initializing Production Command...</p>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 space-y-10 bg-[#FBFBFF] min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Production Status</span>
                    </div>
                    <h1 className="text-4xl font-black text-[#191A43] tracking-tight">Command Center</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage your shop floor operations with precision.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-6 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm mr-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Orders</span>
                            <span className="text-xl font-black text-[#191A43]">{orders.length}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Team Members</span>
                            <span className="text-xl font-black text-[#191A43]">{staff.length}</span>
                        </div>
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition-all shadow-sm">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configure Stages
                    </Button>
                    <Button className="h-12 px-6 rounded-2xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold transition-all shadow-lg shadow-[#191A43]/10">
                        <Plus className="w-4 h-4 mr-2" />
                        New Order
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-x-auto pb-8">
                {stages.map((stage) => {
                    const theme = STAGE_THEMES[stage.name] || { color: "text-slate-600", icon: LayoutGrid, bg: "bg-slate-50/50", border: "border-slate-100" };
                    const stageOrders = orders.filter(o => o.currentStatus === stage.name);
                    const Icon = theme.icon;

                    return (
                        <div key={stage.name} className="flex flex-col min-w-[300px] space-y-6">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${theme.bg} ${theme.color} border ${theme.border} shadow-sm`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">{stage.name}</h2>
                                        <p className="text-[10px] font-bold text-slate-400">{stageOrders.length} {stageOrders.length === 1 ? 'Order' : 'Orders'}</p>
                                    </div>
                                </div>
                                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 space-y-5 p-3 rounded-[2rem] bg-slate-50/30 border border-slate-100/50 min-h-[600px] relative">
                                <AnimatePresence mode="popLayout">
                                    {stageOrders.length === 0 ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                        >
                                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                                                <Plus className="w-4 h-4 text-slate-300" />
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">No active orders</p>
                                        </motion.div>
                                    ) : (
                                        stageOrders.map((order) => (
                                            <motion.div
                                                key={order.id}
                                                layout
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all group overflow-hidden bg-white rounded-3xl">
                                                    <div className={`h-1 w-full ${theme.bg.replace('/50', '')} ${theme.color.replace('text', 'bg')}`} />
                                                    <CardContent className="p-5 space-y-5">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                                        #{order.orderNumber}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-bold text-[#191A43] text-sm group-hover:text-[#CE0003] transition-colors">{order.customerName}</h3>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-[#CE0003] uppercase tracking-wider">{order.itemType}</p>
                                                                <div className="flex items-center gap-1 justify-end text-[9px] font-bold text-slate-400 mt-1">
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                    High Priority
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100/50">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                                                    <User className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Staff</p>
                                                                    <Select 
                                                                        value={order.assignedStaffId || "none"} 
                                                                        onValueChange={(val) => handleAssign(order.id, val)}
                                                                    >
                                                                        <SelectTrigger className="h-5 border-none bg-transparent p-0 focus:ring-0 text-xs font-bold text-slate-700 w-full">
                                                                            <SelectValue placeholder="Assign now" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                                                            <SelectItem value="none">Unassigned</SelectItem>
                                                                            {staff.map(s => (
                                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Button 
                                                            onClick={() => handleMoveStage(order.id, order.currentStatus)}
                                                            className="w-full h-11 rounded-2xl bg-white text-[#191A43] border border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm font-bold text-xs group/btn relative overflow-hidden"
                                                        >
                                                            <span className="relative z-10 flex items-center justify-center">
                                                                Progress Stage
                                                                <ChevronRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover/btn:translate-x-1" />
                                                            </span>
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
