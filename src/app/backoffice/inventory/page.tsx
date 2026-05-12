"use client"

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getInventory, addInventoryItem, updateStock, removeInventoryItem } from "@/app/actions/operations";
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
    const [newItem, setNewItem] = useState({
        name: "",
        quantity: "0",
        sku: "",
        unit: "",
        category: "",
        minStock: "0",
        unitCost: "0",
        sellingPrice: "0"
    });

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

    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault();
        try {
            await addInventoryItem({
                ...newItem,
                businessType: businessType || "tailoring"
            });
            toast.success("Item added to inventory");
            setIsAddModalOpen(false);
            setNewItem({ name: "", quantity: "0", sku: "", unit: "", category: "", minStock: "0", unitCost: "0", sellingPrice: "0" });
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
        totalStockValue: items.reduce((acc, item) => acc + (Math.max(0, parseFloat(item.quantity)) * parseFloat(item.unitCost || "0")), 0)
    };

    if (isLoading) return <SignatureLoader fullScreen message="Loading Inventory Hub" />;

    return (
        <div className="min-h-screen bg-[#FBFBFF] pb-20">
            {/* Header Area */}
            <div className="bg-white/80 border-b border-slate-100 sticky top-0 z-50 backdrop-blur-xl">
                <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Link href="/backoffice" className="shrink-0">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-400 hover:text-[#191A43]" title="Back to Dashboard">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="w-10 h-10 rounded-xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20 shrink-0">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#191A43] tracking-tight">
                                {isLogistics ? "Pipeline Control" : "Stock Intelligence"}
                            </h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                                {isLogistics ? "Shipment Flow & Backlog" : "Inventory & Asset Management"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search assets, SKUs, or categories..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-12 pr-4 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#191A43]/5 transition-all text-sm font-semibold"
                            />
                        </div>
                        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-12 px-6 rounded-2xl bg-[#191A43] text-white font-bold hover:bg-[#191A43]/90 shadow-xl shadow-[#191A43]/10 text-sm transition-all hover:scale-[1.02] active:scale-95">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Register Asset
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black text-[#191A43]">Register New Asset</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        Add a new product or material to your tracked inventory.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddItem} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{config.itemLabel}</label>
                                        <Input 
                                            placeholder={config.itemPlaceholder}
                                            value={newItem.name}
                                            onChange={e => setNewItem({...newItem, name: e.target.value})}
                                            required
                                            className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Qty</label>
                                            <Input 
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / ID</label>
                                            <Input 
                                                placeholder="Optional"
                                                value={newItem.sku}
                                                onChange={e => setNewItem({...newItem, sku: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Cost</label>
                                            <Input 
                                                type="number"
                                                placeholder="0.00"
                                                value={newItem.unitCost}
                                                onChange={e => setNewItem({...newItem, unitCost: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Price</label>
                                            <Input 
                                                type="number"
                                                placeholder="0.00"
                                                value={newItem.sellingPrice}
                                                onChange={e => setNewItem({...newItem, sellingPrice: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                            <Input 
                                                placeholder="e.g. Pieces"
                                                value={newItem.unit}
                                                onChange={e => setNewItem({...newItem, unit: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Alert Qty</label>
                                            <Input 
                                                type="number"
                                                value={newItem.minStock}
                                                onChange={e => setNewItem({...newItem, minStock: e.target.value})}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-12 rounded-xl bg-[#191A43] text-white font-black uppercase tracking-widest mt-2">
                                        Save Asset
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-10">
                {/* Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                {isLogistics ? <Truck className="w-6 h-6" /> : <Boxes className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {isLogistics ? "Shipments Today" : "Total Units"}
                                </p>
                                <p className="text-2xl font-black text-[#191A43]">
                                    {isLogistics ? stats.receivedToday : stats.totalItems}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Active SKUs
                                </p>
                                <p className="text-2xl font-black text-[#191A43]">
                                    {items.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center transition-transform group-hover:scale-110">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Low Stock Alerts
                                </p>
                                <p className="text-2xl font-black text-red-600">
                                    {stats.lowStock}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-[#191A43] rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center transition-transform group-hover:rotate-12">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                    Total Asset Value
                                </p>
                                <p className="text-2xl font-black text-white">
                                    GHS {stats.totalStockValue.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Stock Table */}
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/50">
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Narrative</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Volume</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Business Value (GHS)</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Control</th>
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
                                                                <span className="text-[10px] text-slate-300 font-bold uppercase">{item.sku || "No SKU"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-xl font-black ${parseFloat(item.quantity) <= parseFloat(item.minStock || "0") ? "text-red-500" : "text-[#191A43]"}`}>
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-50">{item.unit || "Units"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black text-[#191A43]">
                                                            GHS {(Math.max(0, parseFloat(item.quantity)) * parseFloat(item.unitCost || "0")).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-50">
                                                            Cost: {item.unitCost || "0"}
                                                        </span>
                                                    </div>
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
                        </div>
                    </Card>
                </div>
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
