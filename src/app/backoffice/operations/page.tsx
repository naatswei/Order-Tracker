"use client"

import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getOrders } from "@/app/actions/orders";
import { getStaff, assignOrder, resendRiderSMS, updateOrderStage, getWorkflowStages } from "@/app/actions/operations";
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
    ArrowLeft,
    Package,
    Scissors,
    Hammer,
    UserPlus,
    Ruler,
    ShoppingBag,
    FlaskConical,
    Phone,
    Copy,
    Send,
    MapPin,
    Navigation,
    Clock,
    AlertCircle,
    Check,
    ListFilter,
    ArrowRight,
    X,
    Layers,
    List,
    Columns3
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion";
import { StageConfig } from "@/components/operations/stage-config";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SignatureLoader } from "@/components/signature-loader";
import { getBusinessConfig } from "@/lib/business-configs";
import { cn } from "@/lib/utils";

const STAGE_THEMES: Record<string, { color: string, icon: any, bg: string, border: string }> = {
    "Shipment Booked": { color: "text-blue-600", icon: Package, bg: "bg-blue-50/80", border: "border-blue-200" },
    "Picked Up": { color: "text-amber-600", icon: Navigation, bg: "bg-amber-50/80", border: "border-amber-200" },
    "In Transit": { color: "text-indigo-600", icon: Truck, bg: "bg-indigo-50/80", border: "border-indigo-200" },
    "Arriving at Facility": { color: "text-purple-600", icon: MapPin, bg: "bg-purple-50/80", border: "border-purple-200" },
    "Sorting": { color: "text-cyan-600", icon: Layers, bg: "bg-cyan-50/80", border: "border-cyan-200" },
    "Order Received": { color: "text-blue-600", icon: Package, bg: "bg-blue-50/80", border: "border-blue-200" },
    "Cutting": { color: "text-amber-600", icon: Scissors, bg: "bg-amber-50/80", border: "border-amber-200" },
    "Sewing": { color: "text-indigo-600", icon: Zap, bg: "bg-indigo-50/80", border: "border-indigo-200" },
    "Production": { color: "text-orange-600", icon: Hammer, bg: "bg-orange-50/80", border: "border-orange-200" },
    "First Fitting": { color: "text-purple-600", icon: User, bg: "bg-purple-50/80", border: "border-purple-200" },
    "Second Fitting": { color: "text-fuchsia-600", icon: UserPlus, bg: "bg-fuchsia-50/80", border: "border-fuchsia-200" },
    "Measurement": { color: "text-cyan-600", icon: Ruler, bg: "bg-cyan-50/80", border: "border-cyan-200" },
    "Quality Check": { color: "text-emerald-600", icon: FlaskConical, bg: "bg-emerald-50/80", border: "border-emerald-200" },
    "Ready for Pickup": { color: "text-emerald-600", icon: ShoppingBag, bg: "bg-emerald-50/80", border: "border-emerald-200" },
    "Dispatched": { color: "text-rose-600", icon: Truck, bg: "bg-rose-50/80", border: "border-rose-200" },
    "Delivered": { color: "text-emerald-600", icon: CheckCircle2, bg: "bg-emerald-50/80", border: "border-emerald-200" },
};

function getStatusTheme(name: string) {
    const lower = name.toLowerCase();
    if (STAGE_THEMES[name]) return STAGE_THEMES[name];
    if (lower.includes("booked")) return STAGE_THEMES["Shipment Booked"];
    if (lower.includes("pick") && lower.includes("up")) return STAGE_THEMES["Picked Up"];
    if (lower.includes("transit")) return STAGE_THEMES["In Transit"];
    if (lower.includes("facility") || lower.includes("hub")) return STAGE_THEMES["Arriving at Facility"];
    if (lower.includes("sort")) return STAGE_THEMES["Sorting"];
    if (lower.includes("received")) return STAGE_THEMES["Order Received"];
    if (lower.includes("cutting")) return STAGE_THEMES["Cutting"];
    if (lower.includes("sewing")) return STAGE_THEMES["Sewing"];
    if (lower.includes("production")) return STAGE_THEMES["Production"];
    if (lower.includes("fitting")) return STAGE_THEMES["First Fitting"];
    if (lower.includes("measurement")) return STAGE_THEMES["Measurement"];
    if (lower.includes("quality") || lower.includes("check")) return STAGE_THEMES["Quality Check"];
    if (lower.includes("pickup") || lower.includes("ready")) return STAGE_THEMES["Ready for Pickup"];
    if (lower.includes("dispatch") || lower.includes("ship")) return STAGE_THEMES["Dispatched"];
    if (lower.includes("delivered") || lower.includes("done") || lower.includes("complete")) return STAGE_THEMES["Delivered"];
    return { color: "text-slate-600", icon: LayoutGrid, bg: "bg-slate-50/80", border: "border-slate-200" };
}

export default function OperationsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("all");
    const [filterOnlyUnassigned, setFilterOnlyUnassigned] = useState(false);
    const [mobileLayoutView, setMobileLayoutView] = useState<"card" | "compact">("card");
    const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
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
            toast.error("Network synchronization failed");
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
                toast.loading(isLogistics ? "Assigning & alerting rider via SMS..." : "Assigning team member...", { id: `assign-${orderId}` });
                const res = await assignOrder(orderId, staffId);
                if (res?.smsResult?.success) {
                    toast.success(isLogistics ? "Rider assigned & SMS alert dispatched!" : "Staff assigned", { id: `assign-${orderId}` });
                } else if (res?.smsResult?.error) {
                    toast.warning(`Assigned, but SMS alert failed: ${res.smsResult.error}`, { id: `assign-${orderId}` });
                } else {
                    toast.success(isLogistics ? "Rider assigned" : "Staff assigned", { id: `assign-${orderId}` });
                }
            }
            loadData();
        } catch (error: any) {
            toast.error("Failed to update assignment: " + (error?.message || "Check connection"));
        }
    }

    async function handleResendSMS(orderId: string) {
        toast.loading("Sending dispatch SMS to rider...", { id: `resend-${orderId}` });
        try {
            const res = await resendRiderSMS(orderId);
            if (res.success) {
                toast.success("SMS successfully dispatched to rider!", { id: `resend-${orderId}` });
            } else {
                toast.error(`SMS failed: ${res.error || "Check SMS balance"}`, { id: `resend-${orderId}` });
            }
        } catch (err: any) {
            toast.error(`SMS failed: ${err?.message || "Network error"}`, { id: `resend-${orderId}` });
        }
    }

    async function handleMoveStage(orderId: string, nextStageName: string) {
        setUpdatingStageId(orderId);
        try {
            await updateOrderStage(orderId, nextStageName);
            toast.success(`Advanced to "${nextStageName}"`);
            await loadData();
        } catch (error) {
            toast.error("Failed to advance stage");
        } finally {
            setUpdatingStageId(null);
        }
    }

    // Helper: get current stage for an order
    const getOrderStageName = (order: any) => {
        return (order.metadata as any)?.internalStage || (stages[0]?.name || "Shipment Booked");
    };

    // Filtered orders based on search and quick filters
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const query = searchQuery.toLowerCase().trim();
            const meta = (order.metadata as Record<string, unknown>) || {};
            const pickupLoc = String(meta.pickupLocation || "").toLowerCase();
            const deliveryLoc = String(meta.deliveryLocation || "").toLowerCase();
            const recipientName = String(meta.recipientName || "").toLowerCase();
            const recipientPhone = String(meta.recipientPhone || "").toLowerCase();

            const matchesQuery = !query || (
                order.customerName.toLowerCase().includes(query) ||
                order.orderNumber.toLowerCase().includes(query) ||
                order.itemType.toLowerCase().includes(query) ||
                (order.customerPhone && order.customerPhone.toLowerCase().includes(query)) ||
                pickupLoc.includes(query) ||
                deliveryLoc.includes(query) ||
                recipientName.includes(query) ||
                recipientPhone.includes(query)
            );

            if (!matchesQuery) return false;

            if (filterOnlyUnassigned) {
                if (order.assignedStaffId && order.assignedStaffId !== "none") return false;
            }

            return true;
        });
    }, [orders, searchQuery, filterOnlyUnassigned]);

    // Active KPI metrics
    const backlogCount = orders.filter(o => 
        isLogistics 
            ? (o.currentStatus !== "Delivered" && o.currentStatus !== "Returned" && o.currentStatus !== "Cancelled") 
            : (o.currentStatus !== "Completed" && o.currentStatus !== "Delivered" && o.currentStatus !== "Cancelled")
    ).length;

    const inTransitCount = orders.filter(o => {
        const stage = getOrderStageName(o).toLowerCase();
        return stage.includes("transit") || stage.includes("production") || stage.includes("sewing");
    }).length;

    const unassignedCount = orders.filter(o => !o.assignedStaffId || o.assignedStaffId === "none").length;

    // Next stage finder helper
    const getNextStage = (currentStageName: string) => {
        const currentIndex = stages.findIndex(s => s.name === currentStageName);
        if (currentIndex !== -1 && currentIndex + 1 < stages.length) {
            return stages[currentIndex + 1];
        }
        return null;
    };

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-16">
            {/* Top Command Center Header */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
                <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col gap-3">
                        {/* Top Line: Navigation, Title & Primary Actions */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 sm:gap-3.5">
                                <Link href="/backoffice">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#191A43] shadow-xs"
                                        title="Back to Dashboard"
                                    >
                                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                </Link>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h1 className="text-base sm:text-xl font-black text-[#191A43] tracking-tight">
                                            {isLogistics ? "Dispatch Operations" : "Operations Board"}
                                        </h1>
                                        <Badge variant="outline" className="hidden sm:inline-flex bg-slate-50 border-slate-200 text-slate-600 text-[10px] font-bold">
                                            {orders.length} Active
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                                        {isLogistics ? "Manage shipments, assign dispatch riders & monitor active transit" : config.operationsDescription}
                                    </p>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-2">
                                <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs"
                                        >
                                            <Settings2 className="w-3.5 h-3.5 sm:mr-1.5 text-slate-500" />
                                            <span className="hidden sm:inline">Workflow Stages</span>
                                            <span className="sm:hidden">Stages</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[480px] rounded-3xl border-slate-100 shadow-2xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
                                        <DialogHeader className="mb-4">
                                            <DialogTitle className="text-xl font-black text-[#191A43] flex items-center gap-2">
                                                <Layers className="w-5 h-5 text-[#191A43]" />
                                                Pipeline Stages
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-slate-500 font-medium">
                                                {config.operationsDescription}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <StageConfig initialStages={stages} onUpdate={loadData} />
                                    </DialogContent>
                                </Dialog>

                                <Link href="/backoffice/create">
                                    <Button className="h-9 sm:h-10 px-3 sm:px-5 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold text-xs shadow-md shadow-[#191A43]/10">
                                        <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                                        <span>{isLogistics ? "Book Shipment" : "New Order"}</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Middle Line: Search & KPI HUD Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                            {/* Search Field */}
                            <div className="md:col-span-6 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder={isLogistics ? "Search tracking #, sender, recipient, location..." : "Search customer, order #, phone..."} 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 pl-9 pr-8 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm font-medium transition-all"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* KPI Metrics Hub */}
                            <div className="md:col-span-6 flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {isLogistics ? "Total Active" : "Active"}
                                    </span>
                                    <span className="text-xs sm:text-sm font-black text-[#191A43]">
                                        {isLoading ? "..." : backlogCount}
                                    </span>
                                </div>

                                <div className="w-px h-4 bg-slate-200" />

                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {isLogistics ? "In Transit" : "In Work"}
                                    </span>
                                    <span className="text-xs sm:text-sm font-black text-indigo-600">
                                        {isLoading ? "..." : inTransitCount}
                                    </span>
                                </div>

                                <div className="w-px h-4 bg-slate-200" />

                                <button 
                                    onClick={() => setFilterOnlyUnassigned(!filterOnlyUnassigned)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider",
                                        filterOnlyUnassigned 
                                            ? "bg-red-500 text-white shadow-xs" 
                                            : unassignedCount > 0 
                                                ? "text-red-600 hover:bg-red-50" 
                                                : "text-slate-400"
                                    )}
                                    title="Toggle unassigned filter"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Unassigned: {unassignedCount}</span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Stage Selector & Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
                            <button
                                onClick={() => { setActiveTab("all"); setFilterOnlyUnassigned(false); }}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                    activeTab === "all" && !filterOnlyUnassigned
                                        ? "bg-[#191A43] text-white shadow-xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <span>All Stages</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                    activeTab === "all" && !filterOnlyUnassigned ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                    {filteredOrders.length}
                                </span>
                            </button>

                            {stages.map((stage) => {
                                const stageCount = filteredOrders.filter(o => getOrderStageName(o) === stage.name).length;
                                const isSelected = activeTab === stage.name && !filterOnlyUnassigned;
                                const theme = getStatusTheme(stage.name);
                                const Icon = theme.icon;

                                return (
                                    <button
                                        key={stage.name}
                                        onClick={() => { setActiveTab(stage.name); setFilterOnlyUnassigned(false); }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                            isSelected
                                                ? "bg-[#191A43] text-white shadow-xs"
                                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : theme.color)} />
                                        <span>{stage.name}</span>
                                        <span className={cn(
                                            "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {stageCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6">
                {isLoading ? (
                    <div className="py-20">
                        <SignatureLoader message="Synchronizing Operations Board..." />
                    </div>
                ) : (
                    <div>
                        {/* ========================================================= */}
                        {/* 1. MOBILE & TABLET FEED (< 1024px)                        */}
                        {/* ========================================================= */}
                        <div className="lg:hidden space-y-4">
                            {/* Active Tab Subtitle */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        {filterOnlyUnassigned ? "Unassigned Orders" : activeTab === "all" ? "All Orders" : activeTab}
                                    </h2>
                                    <span className="text-xs font-bold text-slate-400">
                                        (
                                            {activeTab === "all" 
                                                ? filteredOrders.length 
                                                : filteredOrders.filter(o => getOrderStageName(o) === activeTab).length
                                            }
                                        )
                                    </span>
                                </div>
                            </div>

                            {/* Order Cards List for Mobile */}
                            {(() => {
                                const displayedOrders = activeTab === "all"
                                    ? filteredOrders
                                    : filteredOrders.filter(o => getOrderStageName(o) === activeTab);

                                if (displayedOrders.length === 0) {
                                    return (
                                        <div className="py-16 px-4 text-center bg-white border border-slate-200/80 rounded-3xl space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <h3 className="font-black text-slate-700 text-sm">No orders in this view</h3>
                                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                                {searchQuery 
                                                    ? `No orders matching "${searchQuery}". Try clearing your search.` 
                                                    : filterOnlyUnassigned 
                                                        ? "Great job! All orders have assigned riders/team members."
                                                        : "There are currently no active orders in this stage."}
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3.5">
                                        {displayedOrders.map((order) => (
                                            <OrderOperationCard 
                                                key={order.id}
                                                order={order}
                                                stages={stages}
                                                staff={staff}
                                                isLogistics={isLogistics}
                                                onAssign={handleAssign}
                                                onResendSMS={handleResendSMS}
                                                onMoveStage={handleMoveStage}
                                                getNextStage={getNextStage}
                                                isUpdating={updatingStageId === order.id}
                                            />
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ========================================================= */}
                        {/* 2. DESKTOP KANBAN MULTI-COLUMN BOARD (>= 1024px)          */}
                        {/* ========================================================= */}
                        <div className="hidden lg:block">
                            <div 
                                className="grid gap-5 items-start overflow-x-auto pb-6"
                                style={{ 
                                    gridTemplateColumns: `repeat(${stages.length}, minmax(320px, 1fr))` 
                                }}
                            >
                                {stages.map((stage) => {
                                    const theme = getStatusTheme(stage.name);
                                    const Icon = theme.icon;
                                    const stageOrders = filteredOrders.filter(o => getOrderStageName(o) === stage.name);

                                    return (
                                        <div key={stage.name} className="flex flex-col space-y-3 min-w-[320px]">
                                            {/* Column Header */}
                                            <div className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-xl ${theme.bg} ${theme.color} border ${theme.border}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{stage.name}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            {stageOrders.length} {stageOrders.length === 1 ? "Order" : "Orders"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column Body / Drop Zone */}
                                            <div className="space-y-3 p-2.5 rounded-3xl bg-slate-100/60 border border-slate-200/60 min-h-[500px]">
                                                {stageOrders.length === 0 ? (
                                                    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl p-4">
                                                        <Icon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-xs font-bold text-slate-400">No active orders</p>
                                                    </div>
                                                ) : (
                                                    stageOrders.map((order) => (
                                                        <OrderOperationCard 
                                                            key={order.id}
                                                            order={order}
                                                            stages={stages}
                                                            staff={staff}
                                                            isLogistics={isLogistics}
                                                            onAssign={handleAssign}
                                                            onResendSMS={handleResendSMS}
                                                            onMoveStage={handleMoveStage}
                                                            getNextStage={getNextStage}
                                                            isUpdating={updatingStageId === order.id}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// ----------------------------------------------------------------------
// Subcomponent: Operational Action Card (Shared between Mobile & Desktop)
// ----------------------------------------------------------------------
interface OrderCardProps {
    order: any;
    stages: any[];
    staff: any[];
    isLogistics: boolean;
    onAssign: (orderId: string, staffId: string) => Promise<void>;
    onResendSMS: (orderId: string) => Promise<void>;
    onMoveStage: (orderId: string, stageName: string) => Promise<void>;
    getNextStage: (currentStageName: string) => any;
    isUpdating: boolean;
}

function OrderOperationCard({
    order,
    stages,
    staff,
    isLogistics,
    onAssign,
    onResendSMS,
    onMoveStage,
    getNextStage,
    isUpdating
}: OrderCardProps) {
    const meta = (order.metadata as Record<string, unknown>) || {};
    const currentStageName = (meta.internalStage as string) || (stages[0]?.name || "Shipment Booked");
    const nextStage = getNextStage(currentStageName);

    // Metadata details
    const pickupLoc = (meta.pickupLocation as string) || null;
    const deliveryLoc = (meta.deliveryLocation as string) || null;
    const recipientName = (meta.recipientName as string) || null;
    const recipientPhone = (meta.recipientPhone as string) || null;
    const shippingMethod = (meta.method as string) || null;
    const paymentMethod = (meta.paymentMethod as string) || (order.paymentMethod as string) || null;
    const isPaid = paymentMethod === "online";

    return (
        <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all bg-white rounded-2xl sm:rounded-3xl overflow-hidden group">
            <CardContent className="p-3.5 sm:p-4 space-y-3">
                {/* Card Header: Order #, Badges, Delivery Date */}
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                        <Link 
                            href={`/backoffice/order/${order.id}`}
                            className="inline-flex items-center gap-1 font-black text-xs sm:text-sm text-[#191A43] hover:text-[#CE0003] transition-colors"
                        >
                            <span>{order.orderNumber}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                            {order.customerName}
                        </h4>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {isLogistics && shippingMethod && (
                            <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-black uppercase px-2 py-0.5">
                                {shippingMethod}
                            </Badge>
                        )}
                        {!isLogistics && order.itemType && (
                            <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold px-2 py-0.5 truncate max-w-[120px]">
                                {order.itemType}
                            </Badge>
                        )}

                        <span className="text-[10px] font-bold text-slate-400">
                            {order.pickupDate && !isNaN(new Date(order.pickupDate).getTime())
                                ? new Date(order.pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : "TBD"}
                        </span>
                    </div>
                </div>

                {/* Customer Phone & Contact Bar */}
                {order.customerPhone && (
                    <div className="flex items-center gap-2 pt-0.5">
                        <a
                            href={`tel:${order.customerPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-[11px] font-bold text-slate-700 hover:text-emerald-700 transition-colors border border-slate-200/60"
                            title="Call Customer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{order.customerPhone}</span>
                        </a>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.customerPhone);
                                toast.success("Phone number copied");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Copy Phone"
                        >
                            <Copy className="w-3 h-3" />
                        </button>

                        {/* Payment badge if known */}
                        {paymentMethod && (
                            <span className={cn(
                                "ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-amber-50 text-amber-700 border border-amber-200/60"
                            )}>
                                {isPaid ? "Paid" : "Cash / COD"}
                            </span>
                        )}
                    </div>
                )}

                {/* Route visualization for Logistics */}
                {isLogistics && (pickupLoc || deliveryLoc) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5 text-xs">
                        {pickupLoc && (
                            <div className="flex items-start gap-1.5 text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="font-semibold truncate">
                                    <span className="text-slate-400 font-normal mr-1">Pick up:</span>
                                    {pickupLoc}
                                </span>
                            </div>
                        )}
                        {deliveryLoc && (
                            <div className="flex items-start gap-1.5 text-slate-600">
                                <Navigation className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                                <span className="font-semibold truncate">
                                    <span className="text-slate-400 font-normal mr-1">Drop off:</span>
                                    {deliveryLoc}
                                </span>
                            </div>
                        )}
                        {recipientName && (
                            <div className="text-[10px] text-slate-500 font-medium pl-5 pt-0.5">
                                Recipient: <span className="font-bold text-slate-700">{recipientName}</span> {recipientPhone ? `(${recipientPhone})` : ''}
                            </div>
                        )}
                    </div>
                )}

                {/* Assignment & Dispatch Row */}
                <div className="pt-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <Select
                                value={order.assignedStaffId || "none"}
                                onValueChange={(val) => onAssign(order.id, val)}
                            >
                                <SelectTrigger className="h-5 border-none bg-transparent p-0 focus:ring-0 text-xs font-bold text-slate-700 w-full shadow-none">
                                    <SelectValue placeholder={isLogistics ? "Assign Rider" : "Assign Staff"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                    <SelectItem value="none">
                                        <span className="text-slate-400">Unassigned</span>
                                    </SelectItem>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="font-bold">{s.name}</span>
                                            {s.role ? <span className="text-slate-400 text-xs ml-1.5">({s.role})</span> : null}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Resend SMS Button (Logistics only) */}
                    {isLogistics && order.assignedStaffId && order.assignedStaffId !== "none" && (
                        <button
                            type="button"
                            onClick={() => onResendSMS(order.id)}
                            className="h-9 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1 shrink-0 border border-sky-200/80 transition-all active:scale-95"
                            title="Resend Dispatch SMS to Rider"
                        >
                            <Send className="w-3 h-3 text-sky-600" />
                            <span className="hidden sm:inline">SMS</span>
                        </button>
                    )}
                </div>

                {/* Stage Advancement Row */}
                <div className="pt-1 flex items-center gap-2">
                    {nextStage ? (
                        <Button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => onMoveStage(order.id, nextStage.name)}
                            className="flex-1 h-9 rounded-xl bg-[#191A43] hover:bg-[#191A43]/90 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                            <span>Move to {nextStage.name}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    ) : (
                        <div className="flex-1 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Final Pipeline Stage</span>
                        </div>
                    )}

                    {/* Jump to Any Stage Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-500 shrink-0"
                                title="Jump to specific stage"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 shadow-xl w-48">
                            <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Set Specific Stage
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {stages.map(s => (
                                <DropdownMenuItem 
                                    key={s.name}
                                    onClick={() => onMoveStage(order.id, s.name)}
                                    className={cn(
                                        "text-xs font-bold flex items-center justify-between cursor-pointer rounded-xl",
                                        s.name === currentStageName ? "bg-slate-100 text-[#191A43]" : "text-slate-700"
                                    )}
                                >
                                    <span>{s.name}</span>
                                    {s.name === currentStageName && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}
