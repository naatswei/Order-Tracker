"use client"

import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getOrders } from "@/app/actions/orders";
import { getStaff, assignOrder, resendRiderSMS, getWorkflowStages } from "@/app/actions/operations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Settings2,
    Plus,
    Search,
    ArrowLeft,
    Package,
    Phone,
    Copy,
    Send,
    ArrowRight,
    X,
    Layers
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
import { StageConfig } from "@/components/operations/stage-config";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SignatureLoader } from "@/components/signature-loader";
import { getBusinessConfig } from "@/lib/business-configs";
import { cn } from "@/lib/utils";

export default function OperationsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("all");
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const { organization } = useOrganization();

    const businessType = (organization?.publicMetadata?.businessType as string) || "tailoring";
    const config = getBusinessConfig(businessType);
    const isLogistics = businessType === "logistics";

    useEffect(() => {
        loadData();
    }, [businessType]);

    async function loadData() {
        setIsLoading(true);
        try {
            const [ordersData, staffData, stagesData] = await Promise.all([
                getOrders(),
                getStaff(),
                getWorkflowStages()
            ]);

            const ordersError = ordersData.find(o => (o as any).__isError);
            if (ordersError) {
                toast.error(`Failed to load orders: ${(ordersError as any).message}`);
                setIsLoading(false);
                return;
            }

            setOrders(ordersData || []);
            setStaff(staffData || []);
            
            if (stagesData && stagesData.length > 0) {
                setStages(stagesData);
            } else {
                const bConfig = getBusinessConfig(businessType);
                const activeStatuses = bConfig.statuses.filter(status => 
                    status !== "Completed" && 
                    status !== "Delivered" && 
                    status !== "Pending" && 
                    status !== "Refunded" && 
                    status !== "Cancelled" && 
                    status !== "Order Cancelled" && 
                    status !== "Order Delayed" &&
                    status !== "Delayed" &&
                    status !== "Returned" &&
                    status !== "Returned to Sender" &&
                    status !== "On Hold"
                );
                
                const fallbackStages = activeStatuses.map((status, index) => ({
                    id: `fb_${index}`,
                    name: status,
                    position: String(index + 1)
                }));
                setStages(fallbackStages);
            }
        } catch (err: any) {
            toast.error("Network error. Please refresh.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAssign(orderId: string, staffId: string) {
        try {
            if (staffId === "none") {
                await assignOrder(orderId, null);
                toast.success(isLogistics ? "Rider unassigned" : "Staff unassigned");
            } else {
                toast.loading(isLogistics ? "Assigning rider & sending SMS..." : "Assigning staff...", { id: `assign-${orderId}` });
                const res = await assignOrder(orderId, staffId);
                if (res?.smsResult?.success) {
                    toast.success(isLogistics ? "Rider assigned & SMS sent!" : "Staff assigned", { id: `assign-${orderId}` });
                } else if (res?.smsResult?.error) {
                    toast.warning(`Assigned, but SMS failed: ${res.smsResult.error}`, { id: `assign-${orderId}` });
                } else {
                    toast.success(isLogistics ? "Rider assigned" : "Staff assigned", { id: `assign-${orderId}` });
                }
            }
            loadData();
        } catch (error: any) {
            toast.error("Failed to update: " + (error?.message || "Check connection"));
        }
    }

    async function handleResendSMS(orderId: string) {
        toast.loading("Sending dispatch SMS...", { id: `resend-${orderId}` });
        try {
            const res = await resendRiderSMS(orderId);
            if (res.success) {
                toast.success("Dispatch SMS sent to rider!", { id: `resend-${orderId}` });
            } else {
                toast.error(`SMS failed: ${res.error || "Check SMS balance"}`, { id: `resend-${orderId}` });
            }
        } catch (err: any) {
            toast.error(`SMS failed: ${err?.message || "Network error"}`, { id: `resend-${orderId}` });
        }
    }

    const getOrderStageName = (order: any) => {
        return (order.metadata as any)?.internalStage || order.currentStatus || (stages[0]?.name || "Shipment Booked");
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const query = searchQuery.toLowerCase().trim();
            const meta = (order.metadata as Record<string, unknown>) || {};
            const pickupLoc = String(meta.pickupLocation || "").toLowerCase();
            const deliveryLoc = String(meta.deliveryLocation || "").toLowerCase();
            const recipientName = String(meta.recipientName || "").toLowerCase();

            const matchesQuery = !query || (
                order.customerName.toLowerCase().includes(query) ||
                order.orderNumber.toLowerCase().includes(query) ||
                order.itemType.toLowerCase().includes(query) ||
                (order.customerPhone && order.customerPhone.toLowerCase().includes(query)) ||
                pickupLoc.includes(query) ||
                deliveryLoc.includes(query) ||
                recipientName.includes(query)
            );

            if (!matchesQuery) return false;
            if (activeTab !== "all" && getOrderStageName(order) !== activeTab) return false;

            return true;
        });
    }, [orders, searchQuery, activeTab, stages]);

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-20">
            {/* Clean Minimal Header */}
            <header className="bg-white border-b border-slate-200/70 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
                    {/* Top Row: Navigation + Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Link href="/backoffice">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                                    title="Back to Dashboard"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </Link>
                            <h1 className="text-base sm:text-lg font-bold text-[#191A43]">
                                {isLogistics ? "Dispatch Operations" : config.dashboardTitle}
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                {orders.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                                <DialogTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800"
                                        title="Configure Stages"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[420px] rounded-2xl border-slate-100 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                                    <DialogHeader className="mb-3">
                                        <DialogTitle className="text-lg font-bold text-[#191A43] flex items-center gap-2">
                                            <Layers className="w-4 h-4" /> Pipeline Stages
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500">
                                            {config.operationsDescription}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <StageConfig initialStages={stages} onUpdate={loadData} />
                                </DialogContent>
                            </Dialog>

                            <Link href="/backoffice/create">
                                <Button className="h-9 px-3.5 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-semibold text-xs shadow-sm">
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    <span>{isLogistics ? "Book" : "New Order"}</span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Search Field */}
                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder={isLogistics ? "Search tracking #, sender, recipient, location..." : "Search name, order #, contact..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-8 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white text-xs sm:text-sm font-normal"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Clean Stage Selector Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5",
                                activeTab === "all"
                                    ? "bg-[#191A43] text-white"
                                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                            )}
                        >
                            <span>All</span>
                            <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px]",
                                activeTab === "all" ? "bg-white/20 text-white" : "bg-white text-slate-500 font-bold"
                            )}>
                                {orders.length}
                            </span>
                        </button>

                        {stages.map((stage) => {
                            const stageCount = orders.filter(o => getOrderStageName(o) === stage.name).length;
                            const isSelected = activeTab === stage.name;

                            return (
                                <button
                                    key={stage.name}
                                    onClick={() => setActiveTab(stage.name)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5",
                                        isSelected
                                            ? "bg-[#191A43] text-white"
                                            : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                                    )}
                                >
                                    <span>{stage.name}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px]",
                                        isSelected ? "bg-white/20 text-white" : "bg-white text-slate-500 font-bold"
                                    )}>
                                        {stageCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Order List */}
            <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
                {isLoading ? (
                    <div className="py-20">
                        <SignatureLoader message="Loading orders..." />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-slate-200/80 rounded-2xl p-6 space-y-2">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <h3 className="font-bold text-slate-700 text-sm">No shipments found</h3>
                        <p className="text-xs text-slate-400">
                            {searchQuery ? `No results for "${searchQuery}"` : "There are currently no orders in this stage."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map((order) => {
                            const meta = (order.metadata as Record<string, unknown>) || {};
                            const currentStageName = getOrderStageName(order);
                            const pickupLoc = (meta.pickupLocation as string) || null;
                            const deliveryLoc = (meta.deliveryLocation as string) || null;
                            const recipientName = (meta.recipientName as string) || null;
                            const recipientPhone = (meta.recipientPhone as string) || null;

                            return (
                                <Card 
                                    key={order.id}
                                    className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
                                >
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                                        {/* Line 1: Tracking # + Customer + Status Badge */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Link 
                                                    href={`/backoffice/order/${order.id}`}
                                                    className="font-black text-xs sm:text-sm text-[#191A43] hover:text-[#CE0003] transition-colors shrink-0"
                                                >
                                                    {order.orderNumber}
                                                </Link>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate">
                                                    {order.customerName}
                                                </span>
                                            </div>

                                            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 text-[10px] font-bold shrink-0">
                                                {currentStageName}
                                            </Badge>
                                        </div>

                                        {/* Line 2: Route & Contact */}
                                        <div className="text-xs text-slate-600 space-y-1">
                                            {isLogistics && (pickupLoc || deliveryLoc) ? (
                                                <div className="flex items-center gap-1.5 font-medium truncate">
                                                    <span className="text-slate-700 font-semibold truncate">{pickupLoc || "Origin"}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span className="text-slate-700 font-semibold truncate">{deliveryLoc || "Destination"}</span>
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 font-medium">
                                                    {order.itemType} {meta.quantity ? `(${meta.quantity} pcs)` : ''}
                                                </p>
                                            )}

                                            {/* Phone Action */}
                                            {order.customerPhone && (
                                                <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                                                    <a 
                                                        href={`tel:${order.customerPhone}`}
                                                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#191A43] font-semibold"
                                                    >
                                                        <Phone className="w-3 h-3 text-emerald-600" />
                                                        <span>{order.customerPhone}</span>
                                                    </a>
                                                    {recipientName && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="truncate">Recipient: {recipientName} {recipientPhone ? `(${recipientPhone})` : ''}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Line 3: Rider Assignment & SMS Alert */}
                                        <div className="pt-1 flex items-center gap-2">
                                            <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <Select
                                                    value={order.assignedStaffId || "none"}
                                                    onValueChange={(val) => handleAssign(order.id, val)}
                                                >
                                                    <SelectTrigger className="h-6 border-none bg-transparent p-0 focus:ring-0 text-xs font-semibold text-slate-700 w-full shadow-none">
                                                        <SelectValue placeholder={isLogistics ? "Assign Rider" : "Assign Staff"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                                        <SelectItem value="none">
                                                            <span className="text-slate-400">Unassigned</span>
                                                        </SelectItem>
                                                        {staff.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                <span className="font-semibold">{s.name}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Resend SMS Button (Logistics only) */}
                                            {isLogistics && order.assignedStaffId && order.assignedStaffId !== "none" && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleResendSMS(order.id)}
                                                    className="h-8 px-2.5 rounded-xl text-sky-700 hover:bg-sky-50 text-xs font-semibold shrink-0 border border-sky-200/80"
                                                    title="Resend SMS to Rider"
                                                >
                                                    <Send className="w-3 h-3 mr-1 text-sky-600" />
                                                    <span>SMS</span>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
