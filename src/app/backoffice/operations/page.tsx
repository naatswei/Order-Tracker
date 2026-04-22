"use client"

import { useState, useEffect } from "react";
import { getOrders } from "@/app/actions/orders";
import { getStaff, assignOrder, updateOrderStage, getWorkflowStages } from "@/app/actions/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ChevronRight, 
    User, 
    Clock, 
    Package, 
    Settings2,
    ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

    if (isLoading) return <div className="p-12 text-center text-slate-500">Loading production line...</div>;

    return (
        <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#191A43]">Production Line</h1>
                    <p className="text-slate-500 mt-1">Real-time status of your active shop floor.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-slate-200">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configure Stages
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {stages.map((stage) => (
                    <div key={stage.name} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="font-bold text-sm text-slate-600 uppercase tracking-wider">{stage.name}</h2>
                            <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                                {orders.filter(o => o.currentStatus === stage.name).length}
                            </Badge>
                        </div>

                        <div className="space-y-4 min-h-[500px] p-2 rounded-xl bg-slate-100/50 border border-dashed border-slate-200">
                            {orders
                                .filter(o => o.currentStatus === stage.name)
                                .map((order) => (
                                    <Card key={order.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-mono text-slate-400">{order.orderNumber}</p>
                                                    <h3 className="font-bold text-slate-900 line-clamp-1">{order.customerName}</h3>
                                                </div>
                                                <Badge className="bg-[#CE0003]/10 text-[#CE0003] border-none">
                                                    {order.itemType}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <User className="w-3 h-3" />
                                                    <Select 
                                                        value={order.assignedStaffId || "none"} 
                                                        onValueChange={(val) => handleAssign(order.id, val)}
                                                    >
                                                        <SelectTrigger className="h-7 border-none bg-transparent p-0 focus:ring-0 text-xs text-slate-500">
                                                            <SelectValue placeholder="Assign staff" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Unassigned</SelectItem>
                                                            {staff.map(s => (
                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <Button 
                                                onClick={() => handleMoveStage(order.id, order.currentStatus)}
                                                className="w-full h-8 text-xs bg-white text-[#191A43] border border-slate-200 hover:bg-slate-50 group-hover:bg-[#191A43] group-hover:text-white transition-colors"
                                            >
                                                Move to Next Stage
                                                <ChevronRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
