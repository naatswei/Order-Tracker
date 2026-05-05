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
        minStock: "0"
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
            setNewItem({ name: "", quantity: "0", sku: "", unit: "", category: "", minStock: "0" });
            loadData();
        } catch (error) {
            toast.error("Failed to add item");
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
        lowStock: items.filter(item => parseFloat(item.quantity) <= parseFloat(item.minStock || "0")).length,
        pendingDelivery: orders.filter(o => o.currentStatus !== "Delivered" && o.currentStatus !== "Completed").length,
        receivedToday: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length
    };

    if (isLoading) return <SignatureLoader fullScreen message="Loading Inventory Hub" />;

    return (
        <div className="min-h-screen bg-[#FBFBFF] pb-20">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 backdrop-blur-md bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
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

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search inventory..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-10 pr-4 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm font-medium"
                            />
                        </div>
                        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-10 px-4 rounded-xl bg-[#191A43] text-white font-bold hover:bg-[#191A43]/90 shadow-lg shadow-[#191A43]/10 text-xs">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Item
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Name</label>
                                        <Input 
                                            placeholder={isTailoring ? "e.g. Mens Suit" : "e.g. Bone Straight Wig"}
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

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
                {/* Metrics Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                {isLogistics ? <Truck className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {isLogistics ? "Items Received Today" : "Total Product Units"}
                                </p>
                                <p className="text-xl font-black text-[#191A43]">
                                    {isLogistics ? stats.receivedToday : stats.totalItems}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {isLogistics ? "Pending Delivery" : "Low Stock Alerts"}
                                </p>
                                <p className="text-xl font-black text-[#191A43]">
                                    {isLogistics ? stats.pendingDelivery : stats.lowStock}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {isLogistics ? "Success Rate" : "Active SKUs"}
                                </p>
                                <p className="text-xl font-black text-[#191A43]">
                                    {isLogistics ? "98%" : items.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                                {isTailoring ? <Scissors className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {isLogistics ? "Active Flow" : "Stock Valuation"}
                                </p>
                                <p className="text-xl font-black text-[#191A43]">
                                    {isLogistics ? "Stable" : "Live"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Stock Table */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/30">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Stock</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Min Level</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
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
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ${getAvatarColor(item.name)}`}>
                                                            {item.name[0]}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-[#191A43] text-sm leading-tight">{item.name}</h3>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.sku || "No SKU"}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-base font-black ${parseFloat(item.quantity) <= parseFloat(item.minStock || "0") ? "text-orange-500" : "text-[#191A43]"}`}>
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.unit || "Units"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Badge variant="outline" className="bg-slate-50 border-slate-100 text-slate-400 font-bold text-[10px] rounded-lg">
                                                        {item.minStock || "0"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleUpdateStock(item.id, "out", "1")}
                                                            className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleUpdateStock(item.id, "in", "1")}
                                                            className="w-8 h-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                        <div className="w-px h-4 bg-slate-100 mx-1" />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => handleRemove(item.id)}
                                                            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
