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
    Truck,
    Search,
    Filter,
    ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion";
import { StageConfig } from "@/components/operations/stage-config";
import Link from "next/link";
import { Input } from "@/components/ui/input";

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
    const [searchQuery, setSearchQuery] = useState("");

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
        if (staffId === "none") {
            await assignOrder(orderId, null);
        } else {
            await assignOrder(orderId, staffId);
        }
        toast.success("Staff updated");
        loadData();
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

    const filteredOrders = orders.filter(order => 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.itemType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-[#FBFBFF] min-h-screen">
            {/* Pro-HUD Header - Fixed the sticky issue and z-index overlap */}
            <div className="bg-white border-b border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.02)] relative z-30">
                <div className="w-full px-4 sm:px-8 py-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Title Area */}
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <Link href="/backoffice">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-400 hover:text-[#191A43]" title="Back to Dashboard">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>

                        <div className="hidden sm:flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#CE0003] animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live System</span>
                            </div>
                            <h1 className="text-2xl font-black text-[#191A43] tracking-tight whitespace-nowrap">Command Center</h1>
                        </div>

                        <div className="h-10 w-px bg-slate-100 hidden sm:block mx-2" />

                        {/* Quick Search */}
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Find order or customer..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 pl-10 pr-4 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all w-full text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Stats Hub */}
                    <div className="flex items-center justify-around flex-1 bg-slate-50/50 rounded-2xl border border-slate-100/50 px-8 py-3 gap-8 min-w-[300px]">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Live Orders</span>
                            <span className="text-xl font-black text-[#191A43]">{isLoading ? "..." : orders.length}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200/50" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Team Active</span>
                            <span className="text-xl font-black text-indigo-600">{isLoading ? "..." : staff.length}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200/50" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Throughput</span>
                            <span className="text-xl font-black text-emerald-500">98%</span>
                        </div>
                    </div>

                    {/* Actions Hub */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="h-11 px-4 rounded-2xl text-slate-500 hover:bg-slate-50 font-bold transition-all">
                                    <Settings2 className="w-4 h-4 mr-2" />
                                    Configure
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none shadow-2xl p-8">
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-2xl font-black text-[#191A43]">Workflow Designer</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        Customize your production stages to match your unique business process.
                                    </DialogDescription>
                                </DialogHeader>
                                <StageConfig initialStages={stages} onUpdate={loadData} />
                            </DialogContent>
                        </Dialog>

                        <Link href="/backoffice/create" className="flex-1 lg:flex-none">
                            <Button className="w-full h-11 px-8 rounded-2xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold transition-all shadow-lg shadow-[#191A43]/10">
                                <Plus className="w-4 h-4 mr-2" />
                                New Order
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="px-4 sm:px-8 pt-20 pb-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-10">
                        <div className="relative">
                            {/* Outer Kinetic Frame */}
                            <motion.div 
                                animate={{ 
                                    rotate: 360,
                                    borderRadius: ["30%", "50%", "30%"]
                                }}
                                transition={{ 
                                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                                    borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                                }}
                                className="w-24 h-24 border-[0.5px] border-[#CE0003]/30 bg-white/50 backdrop-blur-sm shadow-[0_0_40px_rgba(206,0,3,0.05)]"
                            />
                            
                            {/* Pulsing Branded Core */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div 
                                    animate={{ 
                                        scale: [0.95, 1.05, 0.95],
                                        boxShadow: [
                                            "0 10px 40px -10px rgba(25,26,67,0.1)",
                                            "0 20px 50px -10px rgba(206,0,3,0.15)",
                                            "0 10px 40px -10px rgba(25,26,67,0.1)"
                                        ]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center relative z-10"
                                >
                                    <span className="text-[#CE0003] font-black text-2xl tracking-tighter">O</span>
                                </motion.div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#CE0003] animate-pulse" />
                                <p className="text-[10px] font-black text-[#191A43] uppercase tracking-[0.4em]">Syncing Production Board</p>
                            </div>
                            
                            {/* Kinetic Progress Shimmer */}
                            <div className="w-32 h-[1px] bg-slate-100 relative overflow-hidden rounded-full">
                                <motion.div 
                                    animate={{ x: [-128, 128] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CE0003] to-transparent w-full"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-x-auto pb-8">
                        {stages.map((stage) => {
                            const theme = STAGE_THEMES[stage.name] || { color: "text-slate-600", icon: LayoutGrid, bg: "bg-slate-50/50", border: "border-slate-100" };
                            const stageOrders = filteredOrders.filter(o => o.currentStatus === stage.name);
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
                                                    key="empty"
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
                                                            <CardContent className="p-5 space-y-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black text-[#CE0003] uppercase tracking-wider">{order.orderNumber}</p>
                                                                        <h3 className="font-black text-[#191A43] leading-tight">{order.customerName}</h3>
                                                                        <p className="text-xs text-slate-500 font-medium">{order.itemType}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className="bg-slate-50 border-slate-100 text-[10px] font-bold text-slate-500 rounded-lg">
                                                                        {order.deliveryDate && !isNaN(new Date(order.deliveryDate).getTime()) 
                                                                            ? new Date(order.deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                                                                            : "TBD"}
                                                                    </Badge>
                                                                </div>

                                                                <div className="pt-2 space-y-3">
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
                                                                </div>
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
                )}
            </div>
        </div>
    );
}
