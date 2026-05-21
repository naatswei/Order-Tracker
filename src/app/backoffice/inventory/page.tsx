"use client"

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { getInventory, addInventoryItem, updateStock, removeInventoryItem, getInventoryHistory, bulkAddInventoryItems, getClientOrganizations, addClientOrganization, removeClientOrganization, saveClientPricingOverrides } from "@/app/actions/operations";
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
    Users,
    Building2,
    DollarSign
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
    const [saleTypeTab, setSaleTypeTab] = useState<"unit" | "wholesale">("unit");

    // B2B Customer / Client States
    const [clients, setClients] = useState<any[]>([]);
    const [selectedImportClientId, setSelectedImportClientId] = useState<string>("");
    const [isB2BModalOpen, setIsB2BModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [isSavingClient, setIsSavingClient] = useState(false);

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
                } else if (['unitcost', 'unitcostghs', 'cost', 'costprice'].includes(header)) {
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

    async function handleCreateClient(e: React.FormEvent) {
        e.preventDefault();
        if (!newClientName.trim()) {
            toast.error("Client name is required");
            return;
        }

        setIsSavingClient(true);
        try {
            await addClientOrganization({
                name: newClientName.trim(),
                email: newClientEmail.trim() || undefined,
                phone: newClientPhone.trim() || undefined,
            });
            toast.success("B2B Client account created");
            setNewClientName("");
            setNewClientEmail("");
            setNewClientPhone("");
            loadData();
        } catch (error: any) {
            toast.error("Failed to add B2B client: " + (error.message || "Unknown error"));
        } finally {
            setIsSavingClient(false);
        }
    }

    async function handleRemoveClient(id: string) {
        if (!confirm("Are you sure you want to remove this client? This will delete all client-specific pricing overrides.")) return;
        try {
            await removeClientOrganization(id);
            toast.success("B2B Client removed");
            loadData();
        } catch (error) {
            toast.error("Failed to remove client");
        }
    }

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

            const response = await bulkAddInventoryItems(formatted);
            const clientId = selectedImportClientId === "none" ? "" : selectedImportClientId;
            
            if (response.success && response.inserted && clientId) {
                const overrides = response.inserted
                    .filter(item => item.pricingTiers && Array.isArray(item.pricingTiers) && item.pricingTiers.length > 0)
                    .map(item => ({
                        inventoryId: item.id,
                        pricingTiers: item.pricingTiers
                    }));

                if (overrides.length > 0) {
                    await saveClientPricingOverrides(clientId, overrides);
                }
            }

            toast.success(`Successfully imported ${validItems.length} items${clientId ? " with client pricing overrides" : ""}`);
            setIsImportModalOpen(false);
            setImportData([]);
            setSelectedImportClientId("");
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

        let headers = `Asset Name,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GHS),Minimum Alert Threshold${wholesaleHeaders}\n`;
        let exampleRow = `Silk Thread,SLK-001,Raw Materials,Rolls,150,25.00,10${wholesaleExample}\n`;
        
        if (businessType === "hair-retail") {
            headers = `Hair Type,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GHS),Minimum Alert Threshold${wholesaleHeaders}\n`;
            exampleRow = `22 Inch Straight Wig,HR-WIG22,Extensions,Pieces,50,450.00,5${wholesaleHairExample}\n`;
        } else if (businessType === "online-business") {
            headers = `Product Name,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GHS),Minimum Alert Threshold${wholesaleHeaders}\n`;
            exampleRow = `Smart Watch,SW-001,Electronics,Units,100,75.00,10${wholesaleOnlineExample}\n`;
        } else if (businessType === "logistics") {
            headers = `Package Type,SKU,Category,Unit,Initial Physical Stock,Unit Cost (GHS),Minimum Alert Threshold${wholesaleHeaders}\n`;
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
            const [inventoryData, ordersData, clientsData] = await Promise.all([
                getInventory(),
                getOrders(),
                getClientOrganizations()
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
            setClients(clientsData || []);
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

    const filteredItems = items.filter(item => 
        (item.saleType || "unit") === saleTypeTab &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                                placeholder={`Search ${config.itemLabel || "assets"}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 sm:h-12 pl-11 sm:pl-12 pr-4 rounded-xl sm:rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#191A43]/5 transition-all text-xs sm:text-sm font-semibold"
                            />
                        </div>
                        {saleTypeTab === "wholesale" && (
                            <Button 
                                variant="outline"
                                onClick={() => setIsB2BModalOpen(true)}
                                className="w-full sm:w-auto h-10 sm:h-12 border-slate-200 bg-white hover:bg-slate-50 text-[#191A43] rounded-xl sm:rounded-2xl px-6 gap-2 font-black uppercase tracking-widest text-xs sm:text-sm shadow-sm transition-all shrink-0"
                            >
                                <Users className="w-4 h-4" />
                                B2B Clients
                            </Button>
                        )}
                        <Button 
                            variant="outline"
                            onClick={() => setIsImportModalOpen(true)}
                            className="w-full sm:w-auto h-10 sm:h-12 border-slate-200 bg-white hover:bg-slate-50 text-[#191A43] rounded-xl sm:rounded-2xl px-6 gap-2 font-black uppercase tracking-widest text-xs sm:text-sm shadow-sm transition-all shrink-0"
                        >
                            <Upload className="w-4 h-4" />
                            Import Excel/CSV
                        </Button>
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto h-10 sm:h-12 bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-xl sm:rounded-2xl px-6 gap-2 font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl shadow-[#191A43]/20 shrink-0"
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
                                    Total {displayLabel} Investment
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-white">
                                    GHS {stats.totalStockValue.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[280px] sm:min-w-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-[#0D2D23] rounded-2xl sm:rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all shrink-0">
                        <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center transition-transform group-hover:rotate-12">
                                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-white/50 uppercase tracking-widest">
                                    Total Amount Sold
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-white">
                                    GHS {stats.totalAmountSold.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* sliding tab switcher */}
                <div className="mb-6 flex justify-start">
                    <div className="bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-200/50">
                        <button
                            onClick={() => setSaleTypeTab("unit")}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                saleTypeTab === "unit"
                                    ? "bg-white text-[#191A43] shadow-sm font-black"
                                    : "text-slate-400 hover:text-slate-600 font-bold"
                            }`}
                        >
                            Retail Catalog (Unit Sales)
                        </button>
                        <button
                            onClick={() => setSaleTypeTab("wholesale")}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                saleTypeTab === "wholesale"
                                    ? "bg-white text-[#191A43] shadow-sm font-black"
                                    : "text-slate-400 hover:text-slate-600 font-bold"
                            }`}
                        >
                            Wholesale Catalog (Bulk/B2B)
                        </button>
                    </div>
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
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">{config.itemLabel || "Asset"} Narrative</th>
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
                                                            <div className="flex flex-col gap-1.5 mt-1.5">
                                                                {/* Category and SKU Tag Line */}
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 border-slate-100 text-slate-400 px-2 py-0">
                                                                        {item.category || "General"}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{item.sku || "No SKU"}</span>
                                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">• {item.unit || "Units"}</span>
                                                                </div>
                                                                
                                                                {/* Premium Financials & Creation Timestamp Line */}
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                                                                    <span className="text-[#9C7E41] font-black tracking-wide bg-[#9C7E41]/5 px-2 py-0.5 rounded-md border border-[#9C7E41]/10">
                                                                        Unit Cost: GHS {parseFloat(item.unitCost || "0").toLocaleString()}
                                                                    </span>
                                                                    <span className="text-slate-300 font-bold hidden sm:inline">•</span>
                                                                    <span className="text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
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
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50 shrink-0">Wholesale:</span>
                                                                        {item.pricingTiers.map((tier: any, tIdx: number) => (
                                                                            <Badge key={tIdx} variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-200 text-slate-500 px-2 py-0.5">
                                                                                {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} units: GHS {parseFloat(tier.price).toLocaleString()}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Client Pricing Overrides */}
                                                                {saleTypeTab === "wholesale" && item.clientOverrides && Array.isArray(item.clientOverrides) && item.clientOverrides.length > 0 && (
                                                                    <div className="flex flex-col gap-1.5 mt-1.5 border-t border-slate-50 pt-1.5">
                                                                        {item.clientOverrides.map((override: any, oIdx: number) => (
                                                                            <div key={oIdx} className="flex flex-wrap items-center gap-1.5">
                                                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 shrink-0">
                                                                                    For {override.client?.name}:
                                                                                </span>
                                                                                {Array.isArray(override.pricingTiers) && override.pricingTiers.map((tier: any, tIdx: number) => (
                                                                                    <Badge key={tIdx} variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-200 text-slate-600 px-2 py-0.5">
                                                                                        {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} units: GHS {parseFloat(tier.price).toLocaleString()}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
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
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black text-blue-600">
                                                            {item.totalSold || "0"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold tracking-tight">GHS {(parseFloat(item.totalSold || "0") * parseFloat(item.unitCost || "0")).toLocaleString()}</span>
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
                    <DialogContent className="max-w-2xl rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto no-scrollbar bg-white">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-[#191A43] tracking-tight">Add New {config.itemLabel || "Asset"}</DialogTitle>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{config.itemLabel || "Asset"} Stock Intake & Categorization</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAddItem} className="p-6 sm:p-8 pt-0 space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2 col-span-1 sm:col-span-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Mode Type</Label>
                                <Select name="saleType" defaultValue="unit">
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold text-xs">
                                        <SelectValue placeholder="Select sale type mode" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 bg-white">
                                        <SelectItem value="unit" className="text-xs font-semibold">Retail Product (Unit Sales)</SelectItem>
                                        <SelectItem value="wholesale" className="text-xs font-semibold">Wholesale Product (Bulk / B2B Discount Tiers)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{config.itemLabel || "Asset Name"}</Label>
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

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-12 w-full sm:w-auto px-8 rounded-2xl font-bold text-slate-400 hover:text-[#191A43] text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="h-12 w-full sm:w-auto px-10 rounded-2xl bg-[#191A43] text-white font-bold hover:bg-[#191A43]/90 shadow-xl shadow-[#191A43]/10 text-xs uppercase tracking-widest transition-all active:scale-95"
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
                    setSelectedImportClientId("");
                }
            }}>
                <DialogContent className="sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1200px] w-full rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-2xl p-0 bg-white max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                    <FileSpreadsheet className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-[#191A43] tracking-tight">
                                        {saleTypeTab === "wholesale" ? "Bulk Import" : "Import"} {config.itemLabel ? `${config.itemLabel}s` : "Assets"}
                                    </DialogTitle>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Excel & CSV Ingestion Engine</p>
                                </div>
                            </div>
                            <Button
                                onClick={downloadTemplate}
                                variant="outline"
                                className="h-10 border-[#191A43]/10 hover:border-[#191A43]/20 text-[#191A43] font-bold rounded-xl gap-2 text-xs uppercase tracking-wider shadow-sm hover:bg-slate-50"
                            >
                                <Download className="w-4 h-4" />
                                Get Template
                            </Button>
                        </div>

                        {/* Optional Client Dropdown */}
                        {saleTypeTab === "wholesale" && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 p-8 py-4 bg-slate-50/50 mt-4 rounded-xl">
                                <div className="space-y-1 max-w-md text-left">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Assign Custom Rates to Client (Optional)</Label>
                                    <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">Select a customer account to save the spreadsheet volume discounts as their personalized pricing overrides sheet.</p>
                                </div>
                                <div className="w-full sm:w-72">
                                    <Select
                                        value={selectedImportClientId}
                                        onValueChange={setSelectedImportClientId}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-xs">
                                            <SelectValue placeholder="Standard Catalog Prices (Default)" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 bg-white">
                                            <SelectItem value="none" className="text-xs font-semibold">Standard Catalog Prices (Default)</SelectItem>
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id} className="text-xs font-semibold">
                                                    {client.name} (Custom overrides)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="p-8 pt-0 space-y-6">
                        {importData.length === 0 ? (
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`group border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                                    dragActive
                                        ? "border-[#191A43] bg-[#191A43]/5 scale-[0.99]"
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
                                <div className={`w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
                                    dragActive ? "scale-105" : ""
                                }`}>
                                    <Upload className="w-8 h-8 text-[#191A43]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-slate-700 text-sm">Drag & drop your Excel or CSV file here</p>
                                    <p className="text-xs text-slate-400 font-medium">or click anywhere to browse local files</p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5">
                                        .xlsx
                                    </Badge>
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5">
                                        .xls
                                    </Badge>
                                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5">
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
                                                    <td className="px-4 py-3 text-center text-[#9C7E41]">GHS {row.unitCost}</td>
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

            {/* B2B Customer Accounts Management Dialog */}
            <Dialog open={isB2BModalOpen} onOpenChange={setIsB2BModalOpen}>
                <DialogContent className="max-w-3xl rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[85vh] flex flex-col">
                    <DialogHeader className="p-8 pb-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-[#191A43] tracking-tight">B2B Customer Accounts</DialogTitle>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Client Management & Custom Catalog Overrides</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-8 pb-8 no-scrollbar space-y-6">
                        {/* New Client Form */}
                        <form onSubmit={handleCreateClient} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 text-left">
                            <h3 className="text-xs font-black text-[#191A43] uppercase tracking-widest">Register New Client Organization</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Organization Name</Label>
                                    <Input
                                        placeholder="e.g. Acme Wholesalers Ltd"
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Contact Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="e.g. billing@acme.com"
                                        value={newClientEmail}
                                        onChange={(e) => setNewClientEmail(e.target.value)}
                                        className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Contact Phone</Label>
                                    <Input
                                        placeholder="e.g. +233 24 123 4567"
                                        value={newClientPhone}
                                        onChange={(e) => setNewClientPhone(e.target.value)}
                                        className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-1">
                                <Button
                                    type="submit"
                                    disabled={isSavingClient}
                                    className="h-10 px-6 rounded-xl bg-[#191A43] text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#191A43]/90 border-0"
                                >
                                    {isSavingClient ? "Registering..." : "Add Client Account"}
                                </Button>
                            </div>
                        </form>

                        {/* Clients List */}
                        <div className="space-y-3 text-left">
                            <h3 className="text-xs font-black text-[#191A43] uppercase tracking-widest ml-1">Active Client Organizations</h3>
                            {clients.length === 0 ? (
                                <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                        <Building2 className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">No B2B Customer Accounts Registered</p>
                                    <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Add custom corporate accounts above to build dedicated pricing overrides sheets.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                                    {clients.map((client) => (
                                        <div key={client.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#191A43]/5 text-[#191A43] flex items-center justify-center font-bold text-sm shrink-0">
                                                    {client.name[0]}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-[#191A43]">{client.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                                                        <span>{client.email || "No Email"}</span>
                                                        <span>•</span>
                                                        <span>{client.phone || "No Phone"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleRemoveClient(client.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all border-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
