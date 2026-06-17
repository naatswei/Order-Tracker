"use client"

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getInventory, addInventoryItem, updateStock, removeInventoryItem, getInventoryHistory, bulkAddInventoryItems, bulkRemoveInventoryItems } from "@/app/actions/operations";
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
    Trash2,
    Upload,
    Download,
    Loader2,
    FileSpreadsheet,
    DollarSign,
    X,
    CheckSquare,
    Square,
    CheckCheck
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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

const CediIcon = ({ className }: { className?: string }) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M15.5 8.5A5 5 0 1 0 15.5 15.5" />
        <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
);

const StockAdjuster = ({ 
    item, 
    handleUpdateStock, 
    type, 
    icon: Icon, 
    hoverClass 
}: { 
    item: any; 
    handleUpdateStock: (id: string, type: "in" | "out", amount: string) => void; 
    type: "in" | "out"; 
    icon: any; 
    hoverClass: string; 
}) => {
    const [amount, setAmount] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
        handleUpdateStock(item.id, type, amount);
        setAmount("");
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className={`w-9 h-9 rounded-lg transition-all border border-transparent ${hoverClass}`}
                >
                    <Icon className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3 shadow-xl border-slate-100 rounded-xl" side="top">
                <form onSubmit={onSubmit} className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {type === "in" ? "Add Stock Amount" : "Remove Stock Amount"}
                    </p>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            placeholder="Qty..." 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            className="h-8 text-xs font-medium rounded-lg border-slate-200"
                            min="1"
                            autoFocus
                        />
                        <Button type="submit" size="sm" className="h-8 px-3 rounded-lg bg-[#191A43] hover:bg-[#191A43]/90 text-white font-semibold text-xs shadow-sm">
                            {type === "in" ? "Add" : "Remove"}
                        </Button>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    );
};

export default function InventoryPage() {
    const { organization, membership, isLoaded } = useOrganization();
    const isAdmin = membership?.role === "org:admin";
    const [items, setItems] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [businessType, setBusinessType] = useState<string | null>(null);
    const [saleTypeTab, setSaleTypeTab] = useState<"unit" | "wholesale">("unit");
    const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);

    // Bulk delete state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Form state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Bulk Import states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            parseFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            parseFile(e.target.files[0]);
        }
    };

    const normalizeHeader = (h: string) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    const parseFile = (file: File) => {
        const reader = new FileReader();
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'xlsx' || fileExt === 'xls') {
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                    processRawData(json);
                } catch (error) {
                    toast.error("Failed to parse Excel file. Please ensure it is not corrupted.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExt === 'csv') {
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const rows = parseCSVText(text);
                    processRawData(rows);
                } catch (error) {
                    toast.error("Failed to parse CSV file.");
                }
            };
            reader.readAsText(file);
        } else {
            toast.error("Unsupported file type. Please upload a .xlsx, .xls, or .csv file.");
        }
    };

    const parseCSVText = (text: string): string[][] => {
        const lines: string[][] = [];
        let row: string[] = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                row.push(currentValue.trim());
                if (row.length > 1 || row[0] !== '') {
                    lines.push(row);
                }
                row = [];
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        if (row.length > 0 || currentValue !== '') {
            row.push(currentValue.trim());
            lines.push(row);
        }
        return lines;
    };

    const processRawData = (rows: any[][]) => {
        if (rows.length < 2) {
            toast.error("File is empty or missing headers");
            return;
        }

        const headers = rows[0].map(h => normalizeHeader(String(h || "")));
        const dataRows = rows.slice(1);

        const mapped = dataRows.map((row) => {
            const item: any = {
                name: '',
                sku: '',
                category: '',
                unit: '',
                quantity: '0',
                unitCost: '0',
                minStock: '0',
                totalSold: '0',
                pricingTiers: null,
                saleType: 'unit',
                errors: [] as string[]
            };

            const pricingTiers: { minQty: number; maxQty: number | null; price: number }[] = [];

            row.forEach((val, colIdx) => {
                const header = headers[colIdx];
                if (!header) return;
                const valueStr = String(val || "").trim();

                if (['name', 'assetname', 'item', 'itemname', 'product', 'productname', 'hairtype', 'packagetype'].includes(header)) {
                    item.name = valueStr;
                } else if (['saletype', 'salesmode', 'type', 'salemode', 'type_sale', 'sale_type'].includes(header)) {
                    const normVal = valueStr.toLowerCase();
                    item.saleType = (normVal === 'wholesale' || normVal === 'bulk' || normVal === 'b2b') ? 'wholesale' : 'unit';
                } else if (['sku', 'reference', 'skureference'].includes(header)) {
                    item.sku = valueStr;
                } else if (['category', 'group'].includes(header)) {
                    item.category = valueStr;
                } else if (['unit', 'measurement', 'measurementunit'].includes(header)) {
                    item.unit = valueStr;
                } else if (['stock', 'quantity', 'qty', 'initialstock', 'physicalstock', 'initialphysicalstock'].includes(header)) {
                    item.quantity = isNaN(parseFloat(valueStr)) ? "0" : parseFloat(valueStr).toString();
                } else if (['unitcost', 'unitcostghs', 'cost', 'costprice', 'unitcostgh', 'unitcostghc'].includes(header)) {
                    item.unitCost = isNaN(parseFloat(valueStr)) ? "0" : parseFloat(valueStr).toString();
                } else if (['minstock', 'minstockthreshold', 'alertthreshold', 'minimumalertthreshold'].includes(header)) {
                    item.minStock = isNaN(parseFloat(valueStr)) ? "0" : parseFloat(valueStr).toString();
                } else if (['sold', 'sales', 'totalsold', 'quantitysold', 'unitssold', 'out'].includes(header)) {
                    item.totalSold = isNaN(parseFloat(valueStr)) ? "0" : parseFloat(valueStr).toString();
                } else {
                    // Check if the original raw header is a wholesale pricing tier range (like ">20 orders", "btn 11-20", "5-10 orders")
                    const rawHeader = String(rows[0][colIdx] || "").trim().toLowerCase();
                    const numbers = rawHeader.match(/\d+/g)?.map(Number);
                    const price = parseFloat(valueStr);

                    if (numbers && numbers.length > 0 && !isNaN(price)) {
                        let minQty = 0;
                        let maxQty: number | null = null;

                        if (rawHeader.includes('>') || rawHeader.includes('over') || rawHeader.includes('above') || rawHeader.includes('+')) {
                            minQty = rawHeader.includes('>') ? numbers[0] + 1 : numbers[0];
                            maxQty = null;
                        } else if (numbers.length === 2) {
                            minQty = numbers[0];
                            maxQty = numbers[1];
                        } else if (numbers.length === 1) {
                            minQty = numbers[0];
                            maxQty = null;
                        }

                        pricingTiers.push({ minQty, maxQty, price });
                    }
                }
            });

            if (pricingTiers.length > 0) {
                pricingTiers.sort((a, b) => a.minQty - b.minQty);
                item.pricingTiers = pricingTiers;
            }

            if (!item.name) {
                item.errors.push("Asset Name is required");
            }

            return item;
        }).filter(item => item !== null && (item.name || item.sku || item.category));

        if (mapped.length === 0) {
            toast.error("No valid data rows found in the uploaded file");
            return;
        }

        setImportData(mapped);
    };

    const handleImportSubmit = async () => {
        const validItems = importData.filter(item => item.errors.length === 0);
        if (validItems.length === 0) {
            toast.error("No valid items to import");
            return;
        }

        setIsImporting(true);
        try {
            const formatted = validItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                sku: item.sku || null,
                category: item.category || null,
                unit: item.unit || null,
                minStock: item.minStock || "0",
                unitCost: item.unitCost || "0",
                totalSold: item.totalSold || "0",
                businessType: businessType || "tailoring",
                pricingTiers: saleTypeTab === "wholesale" ? (item.pricingTiers || null) : null,
                saleType: saleTypeTab
            }));

            await bulkAddInventoryItems(formatted);

            toast.success(`Successfully imported ${validItems.length} items`);
            setIsImportModalOpen(false);
            setImportData([]);
            loadData();
        } catch (error: any) {
            console.error("Bulk Import Error:", error);
            toast.error("Failed to import inventory items: " + (error.message || "Unknown error"));
        } finally {
            setIsImporting(false);
        }
    };

    const downloadTemplate = () => {
        const isWholesale = saleTypeTab === "wholesale";
        const wholesaleHeaders = isWholesale ? ",5-10 orders,btn 11-20,>20 orders" : "";
        const wholesaleExample = isWholesale ? ",23.50,21.00,19.50" : "";
        const wholesaleHairExample = isWholesale ? ",430.00,410.00,390.00" : "";
        const wholesaleOnlineExample = isWholesale ? ",72.00,68.00,65.00" : "";
        const wholesaleLogisticsExample = isWholesale ? ",4.80,4.50,4.20" : "";

        let headers = `Asset Name,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GH₵),Minimum Alert Threshold${wholesaleHeaders}\n`;
        let exampleRow = `Silk Thread,SLK-001,Raw Materials,Rolls,150,25.00,10${wholesaleExample}\n`;
        
        if (businessType === "hair-retail") {
            headers = `Hair Type,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GH₵),Minimum Alert Threshold${wholesaleHeaders}\n`;
            exampleRow = `22 Inch Straight Wig,HR-WIG22,Extensions,Pieces,50,450.00,5${wholesaleHairExample}\n`;
        } else if (businessType === "online-business") {
            headers = `Product Name,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GH₵),Minimum Alert Threshold${wholesaleHeaders}\n`;
            exampleRow = `Smart Watch,SW-001,Electronics,Units,100,75.00,10${wholesaleOnlineExample}\n`;
        } else if (businessType === "logistics") {
            headers = `Package Type,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GH₵),Minimum Alert Threshold${wholesaleHeaders}\n`;
            exampleRow = `Transit Box,LG-BX1,Packaging,Units,200,5.00,20${wholesaleLogisticsExample}\n`;
        }

        const blob = new Blob([headers + exampleRow], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `otracker_${businessType || "inventory"}_${saleTypeTab}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

            const inventoryError = inventoryData.find(o => (o as any).__isError);
            const ordersError = ordersData.find(o => (o as any).__isError);

            if (inventoryError) {
                toast.error(`Failed to load inventory: ${(inventoryError as any).message}`);
            }
            if (ordersError) {
                toast.error(`Failed to load orders: ${(ordersError as any).message}`);
            }

            if (inventoryError || ordersError) {
                setIsLoading(false);
                return;
            }

            setItems(inventoryData);
            setOrders(ordersData);
        } catch (error: any) {
            console.error("Inventory Sync Error:", error);
            const errMsg = error?.message || (typeof error === "string" ? error : "Check connection");
            toast.error(`Failed to sync inventory: ${errMsg}`);
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
            businessType: businessType || "tailoring",
            saleType: (formData.get("saleType") as string) || "unit"
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

    function toggleSelectItem(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map((i: any) => i.id)));
        }
    }

    async function handleBulkDelete() {
        setIsBulkDeleting(true);
        try {
            const result = await bulkRemoveInventoryItems(Array.from(selectedIds));
            if (!result.success && result.blocked.length > 0) {
                toast.error(`Cannot delete: ${result.blocked.map(b => b.name).join(", ")} have active reservations.`);
            } else {
                toast.success(`${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} deleted successfully`);
                setSelectedIds(new Set());
                setIsBulkDeleteModalOpen(false);
                loadData();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete items");
        } finally {
            setIsBulkDeleting(false);
        }
    }

    const filteredItems = items.filter(item => {
        const matchesTab = (item.saleType || "unit") === saleTypeTab;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLowStock = !showOnlyLowStock || 
            (parseFloat(item.quantity) - parseFloat(item.reserved || "0")) <= parseFloat(item.minStock || "0");
        return matchesTab && matchesSearch && matchesLowStock;
    });

    const config = getBusinessConfig(businessType);
    const displayLabel = config.itemLabel === "Product Name" 
        ? "Product" 
        : config.itemLabel === "Hair/Product Type" 
        ? "Hair/Product" 
        : config.itemLabel === "Garment Type" 
        ? "Garment" 
        : config.itemLabel === "Package Type" 
        ? "Package" 
        : config.itemLabel || "Asset";

    // Business Specific Logic
    const isLogistics = businessType === "logistics";
    const isTailoring = businessType === "tailoring";

    const activeTabItems = items.filter(item => (item.saleType || "unit") === saleTypeTab);
    const stats = {
        totalItems: activeTabItems.reduce((acc, item) => acc + parseFloat(item.quantity), 0),
        totalReserved: activeTabItems.reduce((acc, item) => acc + parseFloat(item.reserved || "0"), 0),
        lowStock: activeTabItems.filter(item => (parseFloat(item.quantity) - parseFloat(item.reserved || "0")) <= parseFloat(item.minStock || "0")).length,
        receivedToday: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
        totalStockValue: activeTabItems.reduce((acc, item) => acc + (parseFloat(item.totalEntered || "0") * parseFloat(item.unitCost || "0")), 0),
        totalAmountSold: activeTabItems.reduce((acc, item) => acc + (parseFloat(item.totalSold || "0") * parseFloat(item.unitCost || "0")), 0)
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
                            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[#191A43] items-center justify-center shadow-md shadow-[#191A43]/5 shrink-0">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h1 className="text-lg sm:text-xl font-bold text-[#191A43] tracking-tight">
                                    {isLogistics ? "Pipeline Control" : "Stock Intelligence"}
                                </h1>
                                <p className="hidden sm:block text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-1">
                                    {isLogistics ? "Shipment Flow & Backlog" : "Inventory & Asset Management"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                            <Input 
                                placeholder={`Search ${config.itemLabel || "assets"}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 sm:h-11 pl-11 sm:pl-12 pr-4 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#191A43]/5 transition-all text-xs sm:text-sm font-semibold"
                            />
                        </div>
                        <Button 
                            variant="outline"
                            onClick={() => setIsImportModalOpen(true)}
                            className="w-full sm:w-auto h-10 sm:h-11 border-slate-200 bg-white hover:bg-slate-50 text-[#191A43] rounded-xl px-5 gap-2 font-semibold text-xs sm:text-sm shadow-sm transition-all shrink-0"
                        >
                            <Upload className="w-4 h-4" />
                            Import Excel/CSV
                        </Button>
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto h-10 sm:h-11 bg-[#191A43] hover:bg-[#191A43]/95 text-white rounded-xl px-5 gap-2 font-semibold text-xs sm:text-sm shadow-md shadow-[#191A43]/5 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add {config.itemLabel || "Asset"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-10">
                {/* Metrics Bar */}
                <div className="flex overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-12 no-scrollbar">
                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white rounded-xl overflow-hidden group hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-105">
                                {isLogistics ? <Truck className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    {isLogistics ? "Shipments Today" : "Total Units"}
                                </p>
                                <p className="text-lg sm:text-xl font-bold text-[#191A43] mt-0.5">
                                    {isLogistics ? stats.receivedToday : stats.totalItems}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white rounded-xl overflow-hidden group hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-105">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Active SKUs
                                </p>
                                <p className="text-lg sm:text-xl font-bold text-[#191A43] mt-0.5">
                                    {items.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                        className={`min-w-[280px] sm:min-w-0 border-none shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-300 group ${
                            showOnlyLowStock 
                                ? "ring-1 ring-red-500/50 bg-red-50/10 shadow-[0_4px_20px_rgba(239,68,68,0.05)]" 
                                : "bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:-translate-y-0.5"
                        }`}
                    >
                        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                    showOnlyLowStock 
                                        ? "bg-red-500 text-white shadow-sm shadow-red-500/10" 
                                        : "bg-red-50 text-red-500 group-hover:scale-105"
                                }`}>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        Low Stock Alerts
                                        {showOnlyLowStock && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                    </p>
                                    <p className={`text-lg sm:text-xl font-bold mt-0.5 transition-colors ${showOnlyLowStock ? "text-red-700" : "text-red-600"}`}>
                                        {stats.lowStock}
                                    </p>
                                </div>
                            </div>
                            {showOnlyLowStock && (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all">
                                    Active
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-[#191A43] rounded-xl overflow-hidden group hover:scale-[1.01] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center transition-transform group-hover:rotate-6">
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                                    Total {displayLabel} Investment
                                </p>
                                <p className="text-lg sm:text-xl font-bold text-white mt-0.5">
                                    GH₵ {stats.totalStockValue.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-[#0D2D23] rounded-xl overflow-hidden group hover:scale-[1.01] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center transition-transform group-hover:rotate-6">
                                <CediIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                                    Total Amount Sold
                                </p>
                                <p className="text-lg sm:text-xl font-bold text-white mt-0.5">
                                    GH₵ {stats.totalAmountSold.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* sliding tab switcher */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative bg-slate-100/80 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200/50 self-start">
                        <button
                            onClick={() => {
                                setSaleTypeTab("unit");
                                setShowOnlyLowStock(false);
                            }}
                            className={`relative px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors duration-300 select-none ${
                                saleTypeTab === "unit"
                                    ? "text-[#191A43]"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <span className="relative z-10">Retail Catalog (Unit Sales)</span>
                            {saleTypeTab === "unit" && (
                                <motion.div
                                    layoutId="activeSaleTypeTab"
                                    className="absolute inset-0 bg-white rounded-lg shadow-sm z-0"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setSaleTypeTab("wholesale");
                                setShowOnlyLowStock(false);
                            }}
                            className={`relative px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors duration-300 select-none ${
                                saleTypeTab === "wholesale"
                                    ? "text-[#191A43]"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <span className="relative z-10">Wholesale Catalog</span>
                            {saleTypeTab === "wholesale" && (
                                <motion.div
                                    layoutId="activeSaleTypeTab"
                                    className="absolute inset-0 bg-white rounded-lg shadow-sm z-0"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Active filters pill */}
                    <AnimatePresence>
                        {showOnlyLowStock && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2"
                            >
                                <div className="bg-red-50 border border-red-100 text-red-700 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Showing Low Stock Alerts Only
                                    <button 
                                        onClick={() => setShowOnlyLowStock(false)}
                                        className="hover:bg-red-100 p-1 rounded-md transition-colors"
                                        title="Clear Filter"
                                    >
                                        <X className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Stock Table */}
                    <Card className="border border-slate-100 shadow-[0_2px_12px_rgb(0,0,0,0.02)] bg-white rounded-xl overflow-hidden">
                        <AnimatePresence mode="wait">
                            {filteredItems.length > 0 ? (
                                <motion.div
                                    key={`table-${saleTypeTab}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-x-auto no-scrollbar"
                                >
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/40">
                                                {isAdmin && (
                                                    <th className="pl-6 py-4 w-10">
                                                        <button
                                                            onClick={toggleSelectAll}
                                                            className="text-slate-400 hover:text-[#191A43] transition-colors"
                                                            title={selectedIds.size === filteredItems.length && filteredItems.length > 0 ? "Deselect all" : "Select all"}
                                                        >
                                                            {selectedIds.size === filteredItems.length && filteredItems.length > 0
                                                                ? <CheckSquare className="w-4 h-4 text-[#191A43]" />
                                                                : <Square className="w-4 h-4" />}
                                                        </button>
                                                    </th>
                                                )}
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{config.itemLabel || "Asset"} Narrative</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Initial Stock</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">On Hand (Value)</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Reserved</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Available</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Sold</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Control</th>
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
                                                        className={`group hover:bg-slate-50/50 transition-colors ${selectedIds.has(item.id) ? "bg-[#191A43]/[0.03] ring-1 ring-inset ring-[#191A43]/10" : ""}`}
                                                    >
                                                        {isAdmin && (
                                                            <td className="pl-6 py-4 w-10">
                                                                <button
                                                                    onClick={() => toggleSelectItem(item.id)}
                                                                    className="text-slate-300 hover:text-[#191A43] transition-colors"
                                                                >
                                                                    {selectedIds.has(item.id)
                                                                        ? <CheckSquare className="w-4 h-4 text-[#191A43]" />
                                                                        : <Square className="w-4 h-4" />}
                                                                </button>
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm ${getAvatarColor(item.name)}`}>
                                                                    {item.name[0]}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{item.name}</h3>
                                                                    <div className="flex flex-col gap-1 mt-1">
                                                                        {/* Category and SKU Tag Line */}
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className="text-[9px] font-semibold bg-slate-50 border-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                                                                {item.category || "General"}
                                                                            </Badge>
                                                                            <span className="text-[10px] text-slate-400 font-medium">{item.sku || "No SKU"}</span>
                                                                            <span className="text-[10px] text-slate-400 font-medium">• {item.unit || "Units"}</span>
                                                                        </div>
                                                                        
                                                                        {/* Premium Financials & Creation Timestamp Line */}
                                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] mt-0.5">
                                                                            <span className="text-[#9C7E41] font-semibold tracking-wide bg-[#9C7E41]/5 px-2 py-0.5 rounded-md border border-[#9C7E41]/10">
                                                                                Unit Cost: GH₵ {parseFloat(item.unitCost || "0").toLocaleString()}
                                                                            </span>
                                                                            <span className="text-slate-300 font-bold hidden sm:inline">•</span>
                                                                            <span className="text-slate-400 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                                                                Entered: {new Date(item.createdAt).toLocaleDateString(undefined, { 
                                                                                    year: 'numeric', 
                                                                                    month: 'short', 
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
 
                                                                        {/* Wholesale Pricing Tiers */}
                                                                        {saleTypeTab === "wholesale" && item.pricingTiers && Array.isArray(item.pricingTiers) && item.pricingTiers.length > 0 && (
                                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                                <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50 shrink-0">Wholesale:</span>
                                                                                {item.pricingTiers.map((tier: any, tIdx: number) => (
                                                                                    <Badge key={tIdx} variant="outline" className="text-[9px] font-semibold uppercase bg-white border-slate-200 text-slate-500 px-2 py-0.5">
                                                                                        {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} units: GH₵ {parseFloat(tier.price).toLocaleString()}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-semibold text-slate-500">
                                                                    {item.totalEntered || item.quantity}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">GH₵ {(parseFloat(item.totalEntered || item.quantity) * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-semibold text-slate-800">
                                                                    {item.quantity}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">GH₵ {(parseFloat(item.quantity) * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`text-sm font-semibold ${parseFloat(item.reserved || "0") > 0 ? "text-amber-600" : "text-slate-300"}`}>
                                                                {item.reserved || "0"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-sm font-bold ${(parseFloat(item.quantity) - parseFloat(item.reserved || "0")) <= parseFloat(item.minStock || "0") ? "text-red-600" : "text-emerald-600"}`}>
                                                                    {parseFloat(item.quantity) - parseFloat(item.reserved || "0")}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-semibold text-blue-600">
                                                                    {item.totalSold || "0"}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">GH₵ {(parseFloat(item.totalSold || "0") * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <StockAdjuster 
                                                                    item={item} 
                                                                    handleUpdateStock={handleUpdateStock} 
                                                                    type="out" 
                                                                    icon={Minus} 
                                                                    hoverClass="hover:bg-red-50 hover:text-red-600 hover:border-red-100" 
                                                                />
                                                                <StockAdjuster 
                                                                    item={item} 
                                                                    handleUpdateStock={handleUpdateStock} 
                                                                    type="in" 
                                                                    icon={Plus} 
                                                                    hoverClass="hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100" 
                                                                />
                                                                {isAdmin && (
                                                                    <>
                                                                        <div className="w-px h-5 bg-slate-100 mx-1" />
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            onClick={() => handleRemove(item.id)}
                                                                            className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-all"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={showOnlyLowStock ? `empty-low-stock-${saleTypeTab}` : `empty-${saleTypeTab}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="py-20 flex flex-col items-center justify-center text-center px-6"
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        {showOnlyLowStock ? (
                                            <AlertCircle className="w-8 h-8 text-emerald-400" />
                                        ) : (
                                            <Boxes className="w-8 h-8 text-slate-200" />
                                        )}
                                    </div>
                                    <h3 className="text-base font-black text-[#191A43]">
                                        {showOnlyLowStock ? "No Low Stock Alerts" : "Inventory Empty"}
                                    </h3>
                                    <p className="text-sm text-slate-400 max-w-xs mt-1">
                                        {showOnlyLowStock 
                                            ? "All items in this catalog are currently above their minimum stock thresholds." 
                                            : `Start tracking your ${isLogistics ? "packages" : "products"} by adding your first item.`}
                                    </p>
                                    {showOnlyLowStock && (
                                        <Button 
                                            onClick={() => setShowOnlyLowStock(false)}
                                            variant="outline" 
                                            className="mt-4 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider"
                                        >
                                            Clear Filter
                                        </Button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>

                {/* Bulk Delete Floating Action Bar */}
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                        >
                            <div className="flex items-center gap-3 bg-[#191A43] text-white px-5 py-3 rounded-2xl shadow-2xl shadow-[#191A43]/30 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <CheckCheck className="w-4 h-4 text-indigo-300" />
                                    <span className="text-sm font-bold">{selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected</span>
                                </div>
                                <div className="w-px h-5 bg-white/20" />
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-xs font-semibold text-white/60 hover:text-white transition-colors"
                                >
                                    Clear
                                </button>
                                <Button
                                    onClick={() => setIsBulkDeleteModalOpen(true)}
                                    className="h-8 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 gap-2 text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Selected
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bulk Delete Confirmation Modal */}
                <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
                    <DialogContent className="max-w-md rounded-2xl border border-slate-100 shadow-xl p-0 bg-white">
                        <DialogHeader className="p-6 pb-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold text-[#191A43]">Confirm Bulk Delete</DialogTitle>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">This action cannot be undone</p>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="px-6 pb-2">
                            <p className="text-sm text-slate-600 mb-3">
                                You are about to permanently delete <span className="font-bold text-[#191A43]">{selectedIds.size} item{selectedIds.size > 1 ? "s" : ""}</span> from your inventory:
                            </p>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 max-h-40 overflow-y-auto space-y-1.5">
                                {filteredItems
                                    .filter((item: any) => selectedIds.has(item.id))
                                    .map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                                            {parseFloat(item.reserved || "0") > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                                    {item.reserved} reserved — blocked
                                                </span>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                            {filteredItems.filter((item: any) => selectedIds.has(item.id) && parseFloat(item.reserved || "0") > 0).length > 0 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 font-medium">
                                    ⚠️ Items with active reservations cannot be deleted. Deselect them or release the reservations first.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsBulkDeleteModalOpen(false)}
                                className="h-9 rounded-xl border-slate-200 text-xs font-bold"
                                disabled={isBulkDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting || filteredItems.filter((item: any) => selectedIds.has(item.id) && parseFloat(item.reserved || "0") > 0).length > 0}
                                className="h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 gap-2 text-xs font-bold shadow-md shadow-red-500/20"
                            >
                                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.size} Item${selectedIds.size > 1 ? "s" : ""}`}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="max-w-2xl rounded-xl border border-slate-100 shadow-xl p-0 max-h-[90vh] overflow-y-auto no-scrollbar bg-white">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-[#191A43] flex items-center justify-center shadow-sm">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-[#191A43] tracking-tight">Add New {config.itemLabel || "Asset"}</DialogTitle>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{config.itemLabel || "Asset"} Stock Intake & Categorization</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAddItem} className="p-6 sm:p-8 pt-0 space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2 col-span-1 sm:col-span-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Sale Mode Type</Label>
                                <Select name="saleType" defaultValue="unit">
                                    <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs">
                                        <SelectValue placeholder="Select sale type mode" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-slate-100 bg-white">
                                        <SelectItem value="unit" className="text-xs font-medium">Retail Product (Unit Sales)</SelectItem>
                                        <SelectItem value="wholesale" className="text-xs font-medium">Wholesale Product (Bulk / B2B Discount Tiers)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">{config.itemLabel || "Asset Name"}</Label>
                                <Input 
                                    name="name" 
                                    placeholder={config.inventory?.assetPlaceholder || "e.g. Silk Thread"} 
                                    required 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">SKU / Reference</Label>
                                <Input 
                                    name="sku" 
                                    placeholder={config.inventory?.skuPlaceholder || "e.g. SLK-001"} 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Category</Label>
                                <Input 
                                    name="category" 
                                    placeholder={config.inventory?.categoryPlaceholder || "e.g. Raw Materials"} 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Measurement Unit</Label>
                                <Input 
                                    name="unit" 
                                    placeholder={config.inventory?.unitPlaceholder || "e.g. Rolls, Meters"} 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Physical Stock (Initial)</Label>
                                <Input 
                                    name="totalEntered" 
                                    type="number" 
                                    placeholder="0" 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Unit Cost (GH₵)</Label>
                                <Input 
                                    name="unitCost" 
                                    type="number" 
                                    placeholder="0.00" 
                                    step="0.01" 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Minimum Alert Threshold</Label>
                                <Input 
                                    name="minStock" 
                                    type="number" 
                                    placeholder="5" 
                                    className="h-10 rounded-lg border-slate-200 bg-slate-50/50 font-medium text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-10 w-full sm:w-auto px-6 rounded-lg font-semibold text-slate-500 hover:text-[#191A43] text-xs uppercase tracking-wider"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="h-10 w-full sm:w-auto px-6 rounded-lg bg-[#191A43] text-white font-semibold hover:bg-[#191A43]/95 shadow-sm text-xs transition-all"
                            >
                                Add {config.itemLabel || "Asset"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportModalOpen} onOpenChange={(open) => {
                setIsImportModalOpen(open);
                if (!open) {
                    setImportData([]);
                }
            }}>
                <DialogContent className="sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1200px] w-full rounded-xl border border-slate-100 shadow-xl p-0 bg-white max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#191A43] flex items-center justify-center shadow-sm">
                                    <FileSpreadsheet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-[#191A43] tracking-tight">
                                        {saleTypeTab === "wholesale" ? "Bulk Import" : "Import"} {config.itemLabel ? `${config.itemLabel}s` : "Assets"}
                                    </DialogTitle>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Excel & CSV Ingestion Engine</p>
                                </div>
                            </div>
                            <Button
                                onClick={downloadTemplate}
                                variant="outline"
                                className="h-10 border-slate-200 hover:bg-slate-50 text-[#191A43] font-semibold rounded-lg gap-2 text-xs shadow-sm transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Get Template
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="p-6 sm:p-8 pt-0 space-y-6">
                        {importData.length === 0 ? (
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`group border border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                                    dragActive
                                        ? "border-[#191A43] bg-[#191A43]/5"
                                        : "border-slate-200 bg-slate-50/50 hover:border-[#191A43]/40 hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className={`w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 duration-300`}>
                                    <Upload className="w-5 h-5 text-[#191A43]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-slate-700 text-sm">Drag & drop your Excel or CSV file here</p>
                                    <p className="text-xs text-slate-400 font-medium">or click anywhere to browse local files</p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-semibold tracking-wide text-[9px] px-2.5 py-0.5 rounded-md">
                                        .xlsx
                                    </Badge>
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-semibold tracking-wide text-[9px] px-2.5 py-0.5 rounded-md">
                                        .xls
                                    </Badge>
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-semibold tracking-wide text-[9px] px-2.5 py-0.5 rounded-md">
                                        .csv
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                                            {importData.filter(i => i.errors.length === 0).length}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Ready for Ingestion</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Valid records matched and parsed</p>
                                        </div>
                                    </div>
                                    {importData.filter(i => i.errors.length > 0).length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-black">
                                                {importData.filter(i => i.errors.length > 0).length}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-red-500 uppercase tracking-wider">Validation Errors</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Empty names or invalid values</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="max-h-[350px] overflow-auto border border-slate-100 rounded-2xl no-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 z-10">
                                            <tr className="border-b border-slate-100">
                                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Asset Name</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">SKU</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Unit</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Stock</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Unit Cost</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                                            {importData.map((row, idx) => (
                                                <tr key={idx} className={`group transition-colors ${row.errors.length > 0 ? "bg-red-50/20 hover:bg-red-50/30" : "hover:bg-slate-50/50"}`}>
                                                    <td className="px-5 py-3 font-bold text-slate-800">
                                                        {row.name ? row.name : <span className="text-red-400 italic font-medium">Missing Asset Name</span>}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-400">{row.sku || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[8px] py-0">
                                                            {row.category || "General"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">{row.unit || "Units"}</td>
                                                    <td className="px-4 py-3 text-center text-slate-800">{row.quantity}</td>
                                                    <td className="px-4 py-3 text-center text-[#9C7E41]">GH₵ {row.unitCost}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        {row.errors.length > 0 ? (
                                                            <div className="flex items-center justify-end gap-1.5 text-red-500 font-bold text-[10px] uppercase tracking-wider" title={row.errors.join(", ")}>
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                Invalid
                                                            </div>
                                                        ) : (
                                                            <Badge className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold uppercase tracking-wider text-[8px] px-2 py-0">
                                                                Ready
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setImportData([])}
                                        className="h-12 px-6 rounded-2xl font-bold text-slate-400 hover:text-red-500 text-xs uppercase tracking-widest"
                                    >
                                        Clear & Start Over
                                    </Button>

                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsImportModalOpen(false)}
                                            className="h-12 px-8 rounded-2xl font-bold text-slate-400 hover:text-[#191A43] text-xs uppercase tracking-widest"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleImportSubmit}
                                            disabled={isImporting || importData.filter(i => i.errors.length === 0).length === 0}
                                            className="h-12 px-10 rounded-2xl bg-[#191A43] text-white font-bold hover:bg-[#191A43]/90 shadow-xl shadow-[#191A43]/10 text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isImporting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Ingesting...
                                                </>
                                            ) : (
                                                `Import ${importData.filter(i => i.errors.length === 0).length} ${config.itemLabel ? `${config.itemLabel}s` : "Assets"}`
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
