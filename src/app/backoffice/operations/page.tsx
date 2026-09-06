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
    Layers,
    MapPin,
    Navigation,
    CheckCircle2,
    Truck,
    Clock,
    Sparkles
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

// Stage visual themes for soft button & badge colors
function getStageStyle(stageName: string, isSelected: boolean) {
    const lower = (stageName || "").toLowerCase();

    if (lower.includes("booked") || lower.includes("received")) {
        return {
            tab: isSelected 
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30" 
                : "bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100/80",
            badge: "bg-blue-50 text-blue-700 border-blue-200",
            leftBorder: "border-l-blue-500",
            dot: "bg-blue-500"
        };
    }
    if (lower.includes("pick") && lower.includes("up")) {
        return {
            tab: isSelected 
                ? "bg-amber-600 text-white shadow-xs shadow-amber-500/30" 
                : "bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100/80",
            badge: "bg-amber-50 text-amber-700 border-amber-200",
            leftBorder: "border-l-amber-500",
            dot: "bg-amber-500"
        };
    }
    if (lower.includes("transit") || lower.includes("production") || lower.includes("sewing")) {
        return {
            tab: isSelected 
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/30" 
                : "bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100/80",
            badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
            leftBorder: "border-l-indigo-500",
            dot: "bg-indigo-500"
        };
    }
    if (lower.includes("facility") || lower.includes("hub") || lower.includes("sorting") || lower.includes("fitting")) {
        return {
            tab: isSelected 
                ? "bg-purple-600 text-white shadow-xs shadow-purple-500/30" 
                : "bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100/80",
            badge: "bg-purple-50 text-purple-700 border-purple-200",
            leftBorder: "border-l-purple-500",
            dot: "bg-purple-500"
        };
    }
    if (lower.includes("delivered") || lower.includes("done") || lower.includes("ready") || lower.includes("completed")) {
        return {
            tab: isSelected 
                ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/30" 
                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/80",
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
            leftBorder: "border-l-emerald-500",
            dot: "bg-emerald-500"
        };
    }

    return {
        tab: isSelected 
            ? "bg-[#191A43] text-white shadow-xs" 
            : "bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200/70",
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        leftBorder: "border-l-slate-400",
        dot: "bg-slate-400"
    };
}

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
            {/* Header */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
                    {/* Top Row: Navigation + Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Link href="/backoffice">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
                                    title="Back to Dashboard"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </Link>
                            <h1 className="text-base sm:text-lg font-bold text-[#191A43]">
                                {isLogistics ? "Operations" : config.dashboardTitle}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                                <DialogTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        className="h-9 px-3 rounded-xl border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                        title="Configure Pipeline Stages"
                                    >
                                        <Settings2 className="w-3.5 h-3.5" />
                                        <span>Stages</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[420px] rounded-3xl border-slate-100 p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                                    <DialogHeader className="mb-3">
                                        <DialogTitle className="text-lg font-bold text-[#191A43] flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-600" /> Pipeline Stages
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500 font-medium">
                                            {config.operationsDescription}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <StageConfig initialStages={stages} onUpdate={loadData} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Search Field */}
                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder={isLogistics ? "Search tracking #, sender, recipient, location..." : "Search name, order #, contact..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-8 rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white text-xs sm:text-sm font-normal"
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

                    {/* Colored Stage Selector Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                activeTab === "all"
                                    ? "bg-[#191A43] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200/70"
                            )}
                        >
                            <span>All</span>
                            <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                activeTab === "all" ? "bg-white/20 text-white" : "bg-white text-slate-600 shadow-2xs"
                            )}>
                                {orders.length}
                            </span>
                        </button>

                        {stages.map((stage) => {
                            const stageCount = orders.filter(o => getOrderStageName(o) === stage.name).length;
                            const isSelected = activeTab === stage.name;
                            const style = getStageStyle(stage.name, isSelected);

                            return (
                                <button
                                    key={stage.name}
                                    onClick={() => setActiveTab(stage.name)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                        style.tab
                                    )}
                                >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : style.dot)} />
                                    <span>{stage.name}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                        isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 shadow-2xs"
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
                        <SignatureLoader message="Loading operations board..." />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-slate-200/80 rounded-3xl p-6 space-y-2.5 shadow-xs">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                            <Package className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">No shipments in this stage</h3>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            {searchQuery ? `No results for "${searchQuery}"` : "Active shipments will appear here once booked."}
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
                            const style = getStageStyle(currentStageName, false);

                            return (
                                <Card 
                                    key={order.id}
                                    className={cn(
                                        "border border-slate-200/80 bg-white rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-sm hover:border-slate-300 transition-all overflow-hidden border-l-4",
                                        style.leftBorder
                                    )}
                                >
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                                        {/* Line 1: Tracking # + Customer + Status Badge */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Link 
                                                    href={`/backoffice/order/${order.id}`}
                                                    className="font-black text-xs sm:text-sm text-[#191A43] hover:text-[#CE0003] transition-colors shrink-0 flex items-center gap-1"
                                                >
                                                    <span>{order.orderNumber}</span>
                                                </Link>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                                    {order.customerName}
                                                </span>
                                            </div>

                                            <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0", style.badge)}>
                                                {currentStageName}
                                            </Badge>
                                        </div>

                                        {/* Line 2: Route & Contact */}
                                        <div className="text-xs text-slate-600 space-y-1">
                                            {isLogistics && (pickupLoc || deliveryLoc) ? (
                                                <div className="flex items-center gap-1.5 font-medium truncate py-0.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Pickup Origin" />
                                                    <span className="text-slate-800 font-semibold truncate">{pickupLoc || "Origin"}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" title="Delivery Destination" />
                                                    <span className="text-slate-800 font-semibold truncate">{deliveryLoc || "Destination"}</span>
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
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/70 transition-colors"
                                                        title="Click to Call"
                                                    >
                                                        <Phone className="w-3 h-3 text-emerald-600" />
                                                        <span>{order.customerPhone}</span>
                                                    </a>
                                                    {recipientName && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="truncate font-medium text-slate-600">
                                                                Recipient: <strong className="text-slate-800">{recipientName}</strong> {recipientPhone ? `(${recipientPhone})` : ''}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Line 3: Rider Assignment & SMS Alert */}
                                        <div className="pt-1 flex items-center gap-2">
                                            <div className={cn(
                                                "flex-1 min-w-0 rounded-xl px-2.5 py-1 flex items-center gap-1.5 border transition-all",
                                                order.assignedStaffId && order.assignedStaffId !== "none"
                                                    ? "bg-indigo-50/40 border-indigo-200/80"
                                                    : "bg-slate-50 border-slate-200/80"
                                            )}>
                                                <User className={cn(
                                                    "w-3.5 h-3.5 shrink-0",
                                                    order.assignedStaffId && order.assignedStaffId !== "none" ? "text-indigo-600" : "text-slate-400"
                                                )} />
                                                <Select
                                                    value={order.assignedStaffId || "none"}
                                                    onValueChange={(val) => handleAssign(order.id, val)}
                                                >
                                                    <SelectTrigger className="h-6 border-none bg-transparent p-0 focus:ring-0 text-xs font-bold text-slate-700 w-full shadow-none">
                                                        <SelectValue placeholder={isLogistics ? "Assign Rider" : "Assign Staff"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                                        <SelectItem value="none">
                                                            <span className="text-slate-400">Unassigned</span>
                                                        </SelectItem>
                                                        {staff.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                <span className="font-bold text-slate-800">{s.name}</span>
                                                                {s.phone && <span className="text-[11px] text-slate-400 ml-1.5">({s.phone})</span>}
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
                                                    className="h-8 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shrink-0 shadow-xs shadow-sky-500/20 transition-all flex items-center gap-1"
                                                    title="Send dispatch SMS with tracking link to rider"
                                                >
                                                    <Send className="w-3 h-3 text-white" />
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
