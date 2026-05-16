"use client"

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getInventory, addInventoryItem, updateStock, removeInventoryItem, getInventoryHistory } from "@/app/actions/operations";
import { getOrders } from "@/app/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Package, 
    Plus, 
    Minus, 
    ArrowLeft,
    ArrowUpRight, 
    ArrowDownLeft, 
    AlertCircle, 
    Search, 
    MoreHorizontal,
    TrendingUp,
    Boxes,
    Truck,
    ShoppingCart,
    Scissors,
    History,
    Trash2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { SignatureLoader } from "@/components/signature-loader";
import { getBusinessConfig } from "@/lib/business-configs";

export default function InventoryPage() {
    const { organization, isLoaded } = useOrganization();
    const [items, setItems] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [businessType, setBusinessType] = useState<string | null>(null);

    // Form state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (!isLoaded || !organization) return;
        
        const type = organization.publicMetadata?.businessType as string || "tailoring";
        setBusinessType(type);
        loadData();
    }, [isLoaded, organization?.id]);

    async function loadData() {
        setIsLoading(true);
        try {
            const [inventoryData, ordersData] = await Promise.all([
                getInventory(),
                getOrders()
            ]);
            setItems(inventoryData);
            setOrders(ordersData);
        } catch (error) {
            toast.error("Failed to sync inventory");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const data = {
            name: formData.get("name") as string,
            quantity: (formData.get("totalEntered") as string) || "0",
            sku: formData.get("sku") as string,
            unit: formData.get("unit") as string,
            category: formData.get("category") as string,
            minStock: (formData.get("minStock") as string) || "0",
            unitCost: (formData.get("unitCost") as string) || "0",
            businessType: businessType || "tailoring"
        };

        if (!data.name) {
            toast.error("Asset name is required");
            return;
        }

        try {
            await addInventoryItem(data);
            toast.success("Item added to inventory");
            setIsAddModalOpen(false);
            loadData();
        } catch (error: any) {
            console.error("Inventory Error:", error);
            toast.error("Deployment Failed: " + (error.message || "Check connection"));
        }
    }

    async function handleUpdateStock(id: string, type: "in" | "out", amount: string) {
        try {
            await updateStock(id, type, amount, `Manual stock ${type}`);
            toast.success(`Stock updated`);
            loadData();
        } catch (error) {
            toast.error("Failed to update stock");
        }
    }

    async function handleRemove(id: string) {
        if (!confirm("Are you sure you want to remove this item?")) return;
        try {
            await removeInventoryItem(id);
            toast.success("Item removed");
            loadData();
        } catch (error) {
            toast.error("Failed to remove item");
        }
    }

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const config = getBusinessConfig(businessType);

    // Business Specific Logic
    const isLogistics = businessType === "logistics";
    const isTailoring = businessType === "tailoring";

    const stats = {
        totalItems: items.reduce((acc, item) => acc + parseFloat(item.quantity), 0),
        totalReserved: items.reduce((acc, item) => acc + parseFloat(item.reserved || "0"), 0),
        lowStock: items.filter(item => (parseFloat(item.quantity) - parseFloat(item.reserved || "0")) <= parseFloat(item.minStock || "0")).length,
        receivedToday: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
        totalStockValue: items.reduce((acc, item) => acc + (parseFloat(item.totalEntered || "0") * parseFloat(item.unitCost || "0")), 0)
    };

    if (isLoading) return <SignatureLoader fullScreen message="Loading Inventory Hub" />;

    return (
        <div className="min-h-screen bg-[#FBFBFF] pb-20">
            {/* Header Area */}
            <div className="bg-white/80 border-b border-slate-100 sticky top-0 z-50 backdrop-blur-xl">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-12 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="relative flex items-center justify-center sm:justify-start w-full sm:w-auto">
                        <Link href="/backoffice" className="absolute left-0 sm:relative sm:mr-6">
                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-400 hover:text-[#191A43]" title="Back to Dashboard">
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[#191A43] items-center justify-center shadow-lg shadow-[#191A43]/20 shrink-0">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h1 className="text-lg sm:text-xl font-black text-[#191A43] tracking-tight">
                                    {isLogistics ? "Pipeline Control" : "Stock Intelligence"}
                                </h1>
                                <p className="hidden sm:block text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                                    {isLogistics ? "Shipment Flow & Backlog" : "Inventory & Asset Management"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                            <Input 
                                placeholder="Search assets, SKUs..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 sm:h-12 pl-11 sm:pl-12 pr-4 rounded-xl sm:rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#191A43]/5 transition-all text-xs sm:text-sm font-semibold"
                            />
                        </div>
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto h-10 sm:h-12 bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-xl sm:rounded-2xl px-6 gap-2 font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl shadow-[#191A43]/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Asset
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-10">
                {/* Metrics Bar */}
                <div className="flex overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 no-scrollbar">
                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl sm:rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                {isLogistics ? <Truck className="w-5 h-5 sm:w-6 sm:h-6" /> : <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {isLogistics ? "Shipments Today" : "Total Units"}
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-[#191A43]">
                                    {isLogistics ? stats.receivedToday : stats.totalItems}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl sm:rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Active SKUs
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-[#191A43]">
                                    {items.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl sm:rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-50 text-red-500 flex items-center justify-center transition-transform group-hover:scale-110">
                                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Low Stock Alerts
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-red-600">
                                    {stats.lowStock}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-[#191A43] rounded-2xl sm:rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 text-white flex items-center justify-center transition-transform group-hover:rotate-12">
                                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-white/50 uppercase tracking-widest">
                                    Total Asset Investment
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-white">
                                    GHS {stats.totalStockValue.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Stock Table */}
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">


                        {/* Stock Table View */}
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/50">
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Asset Narrative</th>
                                        <th className="px-4 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Initial Stock</th>
                                        <th className="px-4 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">On Hand (Value)</th>
                                        <th className="px-4 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Reserved</th>
                                        <th className="px-4 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Available</th>
                                        <th className="px-4 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Sold</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    <AnimatePresence mode="popLayout">
                                        {filteredItems.map((item) => (
                                            <motion.tr 
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-slate-50/50 transition-colors"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ${getAvatarColor(item.name)}`}>
                                                            {item.name[0]}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-[#191A43] text-base leading-tight">{item.name}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 border-slate-100 text-slate-400 px-2 py-0">
                                                                    {item.category || "General"}
                                                                </Badge>
                                                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{item.sku || "No SKU"}</span>
                                                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">• {item.unit || "Units"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black text-slate-400">
                                                            {item.totalEntered || item.quantity}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 font-bold tracking-tight">GHS {(parseFloat(item.totalEntered || item.quantity) * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black text-[#191A43]">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold tracking-tight">GHS {(parseFloat(item.quantity) * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <span className={`text-base font-black ${parseFloat(item.reserved || "0") > 0 ? "text-amber-500" : "text-slate-300"}`}>
                                                        {item.reserved || "0"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-xl font-black ${(parseFloat(item.quantity) - parseFloat(item.reserved || "0")) <= parseFloat(item.minStock || "0") ? "text-red-500" : "text-emerald-600"}`}>
                                                            {parseFloat(item.quantity) - parseFloat(item.reserved || "0")}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <span className="text-base font-black text-blue-600">
                                                        {item.totalSold || "0"}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleUpdateStock(item.id, "out", "1")}
                                                            className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                                                        >
                                                            <Minus className="w-5 h-5" />
                                                        </Button>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleUpdateStock(item.id, "in", "1")}
                                                            className="w-10 h-10 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </Button>
                                                        <div className="w-px h-6 bg-slate-100 mx-1" />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleRemove(item.id)}
                                                            className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                        {filteredItems.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                    <Boxes className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-base font-black text-[#191A43]">Inventory Empty</h3>
                                <p className="text-sm text-slate-400 max-w-xs mt-1">
                                    Start tracking your {isLogistics ? "packages" : "products"} by adding your first item.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-8 pb-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-[#191A43] tracking-tight">Register New Asset</DialogTitle>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Asset Intake & Categorization</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAddItem} className="p-8 pt-0 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</Label>
                                <Input 
                                    name="name" 
                                    placeholder={config.inventory?.assetPlaceholder || "e.g. Silk Thread"} 
                                    required 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Reference</Label>
                                <Input 
                                    name="sku" 
                                    placeholder={config.inventory?.skuPlaceholder || "e.g. SLK-001"} 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</Label>
                                <Input 
                                    name="category" 
                                    placeholder={config.inventory?.categoryPlaceholder || "e.g. Raw Materials"} 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Measurement Unit</Label>
                                <Input 
                                    name="unit" 
                                    placeholder={config.inventory?.unitPlaceholder || "e.g. Rolls, Meters"} 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Stock (Initial)</Label>
                                <Input 
                                    name="totalEntered" 
                                    type="number" 
                                    placeholder="0" 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Cost (GHS)</Label>
                                <Input 
                                    name="unitCost" 
                                    type="number" 
                                    placeholder="0.00" 
                                    step="0.01" 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Alert Threshold</Label>
                                <Input 
                                    name="minStock" 
                                    type="number" 
                                    placeholder="5" 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-12 px-8 rounded-2xl font-bold text-slate-400 hover:text-[#191A43] text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="h-12 px-10 rounded-2xl bg-[#191A43] text-white font-bold hover:bg-[#191A43]/90 shadow-xl shadow-[#191A43]/10 text-xs uppercase tracking-widest transition-all active:scale-95"
                            >
                                Deploy Asset
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    </div>
    );
}

function getAvatarColor(name: string) {
    const colors = [
        "bg-[#191A43]", 
        "bg-[#C5A059]", 
        "bg-[#CE0003]", 
        "bg-indigo-500", 
        "bg-emerald-500", 
        "bg-amber-500"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
