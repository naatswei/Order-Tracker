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
    Search,
    ArrowLeft,
    Package,
    Phone,
    Copy,
    Send,
    ArrowRight,
    X,
    Layers,
    MapPin,
    Navigation,
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

// Subtle visual indicators for stage columns & jump pills
function getStageTheme(stageName: string) {
    const lower = (stageName || "").toLowerCase();

    if (lower.includes("booked") || lower.includes("received")) {
        return {
            dot: "bg-blue-500",
            leftBorder: "border-l-blue-500",
            badge: "bg-blue-50 text-blue-700 border-blue-200"
        };
    }
    if (lower.includes("pick") && lower.includes("up")) {
        return {
            dot: "bg-amber-500",
            leftBorder: "border-l-amber-500",
            badge: "bg-amber-50 text-amber-700 border-amber-200"
        };
    }
    if (lower.includes("transit") || lower.includes("production") || lower.includes("sewing")) {
        return {
            dot: "bg-indigo-500",
            leftBorder: "border-l-indigo-500",
            badge: "bg-indigo-50 text-indigo-700 border-indigo-200"
        };
    }
    if (lower.includes("facility") || lower.includes("hub") || lower.includes("sorting") || lower.includes("fitting")) {
        return {
            dot: "bg-purple-500",
            leftBorder: "border-l-purple-500",
            badge: "bg-purple-50 text-purple-700 border-purple-200"
        };
    }
    if (lower.includes("delivered") || lower.includes("done") || lower.includes("ready") || lower.includes("completed")) {
        return {
            dot: "bg-emerald-500",
            leftBorder: "border-l-emerald-500",
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
    }

    return {
        dot: "bg-slate-400",
        leftBorder: "border-l-slate-400",
        badge: "bg-slate-50 text-slate-700 border-slate-200"
    };
}

export default function OperationsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [activeStage, setActiveStage] = useState<string>("All");

    const { organization } = useOrganization();

    const businessType = (organization?.publicMetadata?.businessType as string) || "tailoring";
    const logisticsType = ((organization?.publicMetadata as any)?.logisticsType as string) || (typeof window !== "undefined" ? localStorage.getItem("logisticsType") : null) || "restaurant";
    const config = getBusinessConfig(businessType, logisticsType);
    const isLogistics = businessType === "logistics";
    const isRestaurant = isLogistics && logisticsType === "restaurant";

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
        // Evaluate order.currentStatus FIRST so status changes immediately update operations board
        const candidate = (order.currentStatus || (order.metadata as any)?.internalStage || "").trim();
        if (candidate && stages.length > 0) {
            // 1. Exact match (case-insensitive)
            const matched = stages.find(s => s.name.toLowerCase() === candidate.toLowerCase());
            if (matched) return matched.name;

            // 2. Smart alias / fuzzy stage matching
            const candidateLower = candidate.toLowerCase();
            if (candidateLower.includes("pick")) {
                const pickStage = stages.find(s => s.name.toLowerCase().includes("pick"));
                if (pickStage) return pickStage.name;
            }
            if (candidateLower.includes("transit") || candidateLower.includes("way") || candidateLower.includes("dispatch")) {
                const transitStage = stages.find(s => {
                    const l = s.name.toLowerCase();
                    return l.includes("transit") || l.includes("out for delivery") || l.includes("way") || l.includes("delivery");
                });
                if (transitStage) return transitStage.name;
            }
            if (candidateLower.includes("deliver") || candidateLower.includes("complete") || candidateLower.includes("done")) {
                const delivStage = stages.find(s => {
                    const l = s.name.toLowerCase();
                    return l.includes("deliver") || l.includes("complete") || l.includes("done");
                });
                if (delivStage) return delivStage.name;
            }
        }
        return stages[0]?.name || "Order Received";
    };

    // Stage-aware search: Matches customer name, order #, phone, locations, AND stage name
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;

            const meta = (order.metadata as Record<string, unknown>) || {};
            const pickupLoc = String(meta.pickupLocation || "").toLowerCase();
            const deliveryLoc = String(meta.deliveryLocation || "").toLowerCase();
            const recipientName = String(meta.recipientName || "").toLowerCase();
            const stageName = getOrderStageName(order).toLowerCase();

            return (
                order.customerName.toLowerCase().includes(query) ||
                order.orderNumber.toLowerCase().includes(query) ||
                order.itemType.toLowerCase().includes(query) ||
                (order.customerPhone && order.customerPhone.toLowerCase().includes(query)) ||
                stageName.includes(query) ||
                pickupLoc.includes(query) ||
                deliveryLoc.includes(query) ||
                recipientName.includes(query)
            );
        });
    }, [orders, searchQuery]);

    // 1-Tap smooth horizontal scroll to target stage column
    const scrollToStage = (stageName: string) => {
        const colEl = document.getElementById(`stage-col-${stageName}`);
        if (colEl) {
            colEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    const scrollToStart = () => {
        const container = document.getElementById('kanban-container');
        if (container) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-16 flex flex-col">
            {/* Mobile-First Header */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-4 sm:pt-5 sm:pb-5 space-y-6 sm:space-y-8">
                    {/* Top Row: Navigation + Neutral Stages Button */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <Link 
                                href="/backoffice"
                                className="text-[#191A43] hover:text-black transition-transform hover:-translate-x-1 cursor-pointer select-none py-1 flex items-center"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8 stroke-[3]" />
                            </Link>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#191A43]">
                                {isLogistics ? "Operations" : config.dashboardTitle}
                            </h1>
                        </div>

                        {/* Neutral Stages Button (Enlarged) */}
                        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="h-11 px-4 sm:px-5 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                                    title="Configure Pipeline Stages"
                                >
                                    <Settings2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
                                    <span>Stages</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[420px] rounded-3xl border-slate-100 p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                                <DialogHeader className="mb-3">
                                    <DialogTitle className="text-lg font-bold text-[#191A43] flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-slate-700" /> Pipeline Stages
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 font-medium">
                                        {config.operationsDescription}
                                    </DialogDescription>
                                </DialogHeader>
                                <StageConfig initialStages={stages} onUpdate={loadData} />
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Search Field (Stage-Aware) */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder={isLogistics ? "Search tracking #, route, contact, or stage..." : "Search name, order #, contact, or stage..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 sm:h-11 pl-9 sm:pl-10 pr-9 rounded-2xl border-slate-200/90 bg-slate-50/70 focus:bg-white text-xs sm:text-sm font-medium shadow-2xs transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Pipeline Stages Metric Filter Cards (Doubled in Size) */}
                    <div className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 no-scrollbar">
                        {/* Total Orders Card */}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveStage("All");
                                scrollToStart();
                            }}
                            className={cn(
                                "flex-1 min-w-[280px] sm:min-w-[340px] max-w-[420px] min-h-[140px] sm:min-h-[160px] shrink-0 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-left transition-all duration-300 cursor-pointer active:scale-[0.98] flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5",
                                activeStage === "All"
                                    ? "bg-black text-white border border-black"
                                    : "bg-white text-slate-900 border border-slate-200 hover:border-slate-300"
                            )}
                            title="Scroll to beginning"
                        >
                            <div className={cn(
                                "text-sm sm:text-base font-semibold tracking-wide truncate",
                                activeStage === "All" ? "text-neutral-400" : "text-slate-500"
                            )}>
                                Total Orders
                            </div>

                            <div className={cn(
                                "text-4xl sm:text-5xl font-black tracking-tight mt-3 sm:mt-4",
                                activeStage === "All" ? "text-white" : "text-slate-900"
                            )}>
                                {filteredOrders.length}
                            </div>
                        </button>

                        {/* Pipeline Stage Cards */}
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex-1 min-w-[280px] sm:min-w-[340px] max-w-[420px] h-[140px] sm:h-[160px] rounded-2xl sm:rounded-3xl bg-slate-200/70 animate-pulse shrink-0" />
                            ))
                        ) : (
                            stages.map((stage) => {
                                const count = filteredOrders.filter(o => getOrderStageName(o) === stage.name).length;
                                const isSelected = activeStage === stage.name;

                                return (
                                    <button
                                        key={stage.name}
                                        type="button"
                                        onClick={() => {
                                            setActiveStage(isSelected ? "All" : stage.name);
                                            scrollToStage(stage.name);
                                        }}
                                        className={cn(
                                            "flex-1 min-w-[280px] sm:min-w-[340px] max-w-[420px] min-h-[140px] sm:min-h-[160px] shrink-0 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-left transition-all duration-300 cursor-pointer active:scale-[0.98] flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5",
                                            isSelected
                                                ? "bg-black text-white border border-black"
                                                : "bg-white text-slate-900 border border-slate-200 hover:border-slate-300"
                                        )}
                                        title={`Jump to ${stage.name}`}
                                    >
                                        <div className={cn(
                                            "text-sm sm:text-base font-semibold tracking-wide truncate",
                                            isSelected ? "text-neutral-400" : "text-slate-500"
                                        )}>
                                            {stage.name}
                                        </div>

                                        <div className={cn(
                                            "text-4xl sm:text-5xl font-black tracking-tight mt-3 sm:mt-4",
                                            isSelected ? "text-white" : "text-slate-900"
                                        )}>
                                            {count}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </header>

            {/* Main Stage Columns Board with Mobile Scroll-Snap */}
            <main className="flex-1 max-w-full px-4 sm:px-8 pt-6 sm:pt-8 pb-14 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-10 snap-x snap-mandatory no-scrollbar items-start">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="w-[90vw] max-w-[380px] sm:w-[360px] md:w-[380px] shrink-0 flex flex-col space-y-4">
                                <div className="h-12 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
                                <div className="h-[420px] rounded-3xl bg-slate-100/60 border border-slate-200/60 p-3.5 space-y-4">
                                    <div className="h-32 bg-white rounded-2xl border border-slate-200/70 animate-pulse" />
                                    <div className="h-32 bg-white rounded-2xl border border-slate-200/70 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Horizontal Scrollable Stages Container */
                    <div 
                        id="kanban-container"
                        className="flex gap-6 sm:gap-8 overflow-x-auto pb-10 snap-x snap-mandatory scroll-smooth no-scrollbar items-start"
                    >
                        {stages.map((stage) => {
                            const stageTheme = getStageTheme(stage.name);
                            const stageOrders = filteredOrders.filter(o => getOrderStageName(o) === stage.name);

                            return (
                                <div 
                                    key={stage.name} 
                                    id={`stage-col-${stage.name}`}
                                    className="w-[90vw] max-w-[380px] sm:w-[360px] md:w-[380px] shrink-0 snap-center flex flex-col space-y-4"
                                >
                                    {/* Stage Header */}
                                    <div className="flex items-center justify-between px-4.5 py-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider truncate">
                                                {stage.name}
                                            </h2>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black shrink-0">
                                            {stageOrders.length}
                                        </span>
                                    </div>

                                    {/* Stage Orders Column Body */}
                                    <div className="space-y-4 p-3.5 sm:p-4 rounded-3xl bg-slate-100/70 border border-slate-200/70 min-h-[400px]">
                                        {stageOrders.length === 0 ? (
                                             <div className="py-16 text-center border-2 border-dashed border-slate-200/80 rounded-2xl p-5">
                                                <Package className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs sm:text-sm font-medium text-slate-400">No active {isLogistics && !isRestaurant ? 'shipments' : 'orders'}</p>
                                            </div>
                                        ) : (
                                            stageOrders.map((order) => {
                                                const meta = (order.metadata as Record<string, unknown>) || {};
                                                const pickupLoc = (meta.pickupLocation as string) || null;
                                                const deliveryLoc = (meta.deliveryLocation as string) || null;
                                                const recipientName = (meta.recipientName as string) || null;
                                                const recipientPhone = (meta.recipientPhone as string) || null;

                                                return (
                                                    <Card 
                                                        key={order.id}
                                                        className={cn(
                                                            "border border-slate-200/90 bg-white rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden border-l-[5px]",
                                                            stageTheme.leftBorder
                                                        )}
                                                    >
                                                        <CardContent className="p-4 sm:p-5 space-y-3">
                                                            {/* Line 1: Tracking # + Customer */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Link 
                                                                        href={`/backoffice/order/${order.id}`}
                                                                        className="font-black text-sm sm:text-base text-[#191A43] hover:text-[#CE0003] transition-colors shrink-0"
                                                                    >
                                                                        {order.orderNumber}
                                                                    </Link>
                                                                    <span className="text-slate-300 font-bold">•</span>
                                                                    <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                                                        {order.customerName}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Line 2: Route & Item Info */}
                                                            <div className="space-y-2">
                                                                {isLogistics && (pickupLoc || deliveryLoc) ? (
                                                                    <div className="flex items-center gap-2 font-medium truncate py-0.5 text-xs sm:text-sm text-slate-800">
                                                                        <span className="font-semibold truncate text-slate-800">{pickupLoc || "Origin"}</span>
                                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                        <span className="font-semibold truncate text-slate-800">{deliveryLoc || "Destination"}</span>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-slate-600 font-medium text-xs sm:text-sm">
                                                                        {order.itemType} {meta.quantity ? `(${meta.quantity} pcs)` : ''}
                                                                    </p>
                                                                )}

                                                                {/* Phone Action */}
                                                                {order.customerPhone && (
                                                                    <div className="flex items-center gap-2 pt-0.5 text-xs sm:text-sm text-slate-600">
                                                                        <a 
                                                                            href={`tel:${order.customerPhone}`}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/80 shadow-2xs transition-colors"
                                                                            title="Call Customer"
                                                                        >
                                                                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                                                            <span>{order.customerPhone}</span>
                                                                        </a>
                                                                        {recipientName && (
                                                                            <>
                                                                                <span className="text-slate-300 font-bold">•</span>
                                                                                <span className="truncate font-semibold text-slate-700">
                                                                                    {recipientName}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Line 3: Rider Assignment & Dispatch SMS */}
                                                            <div className="pt-1.5 flex items-center gap-2">
                                                                <div className="flex-1 min-w-0 rounded-2xl px-3 py-2 sm:py-2.5 flex items-center gap-2 border border-slate-200/90 bg-white hover:bg-slate-50 transition-all shadow-2xs">
                                                                    <User className="w-4 h-4 shrink-0 text-slate-500" />
                                                                    <Select
                                                                        value={order.assignedStaffId || "none"}
                                                                        onValueChange={(val) => handleAssign(order.id, val)}
                                                                    >
                                                                        <SelectTrigger className="h-7 sm:h-8 border-none bg-transparent p-0 focus:ring-0 text-xs sm:text-sm font-bold text-slate-800 w-full shadow-none cursor-pointer">
                                                                            <SelectValue placeholder={isLogistics ? "Assign Rider" : "Assign Staff"} />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-2xl border-slate-200 shadow-xl bg-white p-1.5 min-w-[220px]">
                                                                            <SelectItem value="none" className="font-semibold text-xs sm:text-sm">
                                                                                <span>Unassigned</span>
                                                                            </SelectItem>
                                                                            {staff.map(s => (
                                                                                <SelectItem key={s.id} value={s.id} className="font-bold text-xs sm:text-sm">
                                                                                    <span>{s.name}</span>
                                                                                    {s.phone && <span className="text-xs opacity-75 ml-1.5 font-normal">({s.phone})</span>}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* Resend SMS Button (Logistics only) */}
                                                                {isLogistics && order.assignedStaffId && order.assignedStaffId !== "none" && (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={() => handleResendSMS(order.id)}
                                                                        className="h-10 px-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs sm:text-sm font-bold shrink-0 shadow-xs shadow-sky-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                                                                        title="Send SMS to rider"
                                                                    >
                                                                        <Send className="w-3.5 h-3.5 text-white" />
                                                                        <span>SMS</span>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
