"use client"

import { useState, useEffect } from "react";
import { addStaff, getStaff, removeStaff } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Plus, 
    Trash2, 
    User, 
    UserPlus, 
    ArrowLeft, 
    Users, 
    Target, 
    Activity,
    ShieldCheck,
    Briefcase,
    Network,
    GitGraph,
    ChevronDown,
    ChevronUp,
    Mail,
    Edit2,
    Save,
    X,
    AlertTriangle,
    Phone,
    MessageCircle,
    Search,
    Filter
} from "lucide-react";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { updateStaff } from "@/app/actions/operations";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignatureLoader } from "@/components/signature-loader";

export default function StaffPage() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [email, setEmail] = useState("");
    const [department, setDepartment] = useState("");
    const [reportsToId, setReportsToId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "hierarchy">("grid");
    
    // Edit State
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // Delete Confirmation State
    const [staffToDelete, setStaffToDelete] = useState<any | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [phone, setPhone] = useState("");

    useEffect(() => {
        let isMounted = true;
        const timeout = setTimeout(() => {
            if (isMounted) setIsInitialLoad(false);
        }, 5000); // 5s Safety Timeout

        async function init() {
            try {
                await loadStaff();
            } catch (error) {
                console.error("Team sync failed:", error);
            } finally {
                if (isMounted) {
                    setIsInitialLoad(false);
                    clearTimeout(timeout);
                }
            }
        }

        init();
        return () => { isMounted = false; clearTimeout(timeout); };
    }, []);

    async function loadStaff() {
        const data = await getStaff();
        setStaffList(data || []);
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        try {
            await addStaff({ 
                name, 
                role, 
                email: email || undefined,
                phone: phone || undefined,
                department: department || undefined, 
                reportsToId: reportsToId === "none" ? undefined : reportsToId 
            });
            toast.success("New team member deployed!", {
                style: { background: "#191A43", color: "#fff", border: "none" }
            });
            setName("");
            setRole("");
            setEmail("");
            setPhone("");
            setDepartment("");
            setReportsToId("");
            loadStaff();
        } catch (error: any) {
            console.error(error);
            toast.error("Deployment Failed: " + (error.message || "Check network"));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUpdateStaff(e: React.FormEvent) {
        e.preventDefault();
        if (!editingStaff || !editingStaff.name) return;

        setIsLoading(true);
        try {
            await updateStaff(editingStaff.id, {
                name: editingStaff.name,
                role: editingStaff.role,
                email: editingStaff.email,
                phone: editingStaff.phone,
                department: editingStaff.department,
                reportsToId: editingStaff.reportsToId === "none" ? null : editingStaff.reportsToId
            });
            toast.success("Profile updated successfully", {
                style: { background: "#191A43", color: "#fff", border: "none" }
            });
            setIsEditDialogOpen(false);
            setEditingStaff(null);
            loadStaff();
        } catch (error: any) {
            toast.error("Update failed: " + (error.message || "Try again"));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRemoveStaff(id: string) {
        setIsLoading(true);
        try {
            await removeStaff(id);
            toast.success("Staff profile archived", {
                style: { background: "#191A43", color: "#fff", border: "none" }
            });
            setIsDeleteDialogOpen(false);
            setStaffToDelete(null);
            loadStaff();
        } catch (error) {
            toast.error("Failed to remove staff");
        } finally {
            setIsLoading(false);
        }
    }

    const buildHierarchy = (items: any[]) => {
        const map: Record<string, any> = {};
        const roots: any[] = [];
        
        items.forEach(item => {
            map[item.id] = { ...item, subordinates: [] };
        });
        
        items.forEach(item => {
            if (item.reportsToId && map[item.reportsToId]) {
                map[item.reportsToId].subordinates.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

        // Sort roots by seniority keywords
        const getWeight = (role: string | null = "") => {
            const r = (role || "").toLowerCase();
            if (r.includes("ceo")) return 100;
            if (r.includes("founder")) return 90;
            if (r.includes("director")) return 80;
            if (r.includes("manager")) return 70;
            return 0;
        };

        const sortedRoots = roots.sort((a, b) => getWeight(b.role) - getWeight(a.role));

        // Smart Auto-Routing: If there is a clear CEO/Founder, make other independent staff report to them in the view
        if (sortedRoots.length > 1) {
            const grandMaster = sortedRoots[0];
            const masterWeight = getWeight(grandMaster.role);
            
            // Only auto-route if the first person is a high-level leader (CEO/Founder)
            if (masterWeight >= 90) {
                const finalRoots = [grandMaster];
                for (let i = 1; i < sortedRoots.length; i++) {
                    const currentWeight = getWeight(sortedRoots[i].role);
                    // If the other person isn't also a top-tier leader, move them under the Grand Master
                    if (currentWeight < 90) {
                        grandMaster.subordinates.push(sortedRoots[i]);
                    } else {
                        finalRoots.push(sortedRoots[i]);
                    }
                }
                return finalRoots;
            }
        }

        return sortedRoots;
    };

    const OrgChartNode = ({ person }: { person: any }) => {
        const [isExpanded, setIsExpanded] = useState(true);
        const hasChildren = person.subordinates?.length > 0;

        return (
            <div className="flex flex-col items-center flex-1 min-w-[300px]">
                {/* Card Container */}
                <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative bg-[#FCFDFF] border border-slate-200 rounded-xl shadow-sm p-5 w-64 group hover:border-[#191A43]/20 hover:shadow-md transition-all z-10"
                >
                    {/* Top Right Expand/Collapse Toggle */}
                    {hasChildren && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors z-20"
                        >
                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}

                    {/* Circular Avatar - Overlapping Top */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-white">
                        <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(person.name)}`}>
                            <User className="w-8 h-8 text-white/90" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Card Content - Centered */}
                    <div className="mt-8 text-center space-y-1">
                        <h4 className="text-[13px] font-black text-slate-800 tracking-tight">{person.name}</h4>
                        <p className="text-[10px] font-medium text-slate-400 tracking-wide">{person.role || "Team Member"}</p>
                        {person.department && (
                            <div className="mt-2">
                                <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[8px] font-black text-[#191A43]/60 uppercase tracking-tighter">
                                    {person.department}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Right Subordinate Count */}
                    {hasChildren && (
                        <div className="absolute bottom-2 right-3 flex items-center gap-1 opacity-60">
                            <span className="text-[10px] font-black text-slate-400">{person.subordinates.length}</span>
                            <ChevronDown className="w-2.5 h-2.5 text-slate-300" />
                        </div>
                    )}
                </motion.div>

                {/* Connecting Lines */}
                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col items-center w-full mt-12 relative"
                        >
                            {/* Stem from Parent */}
                            <div className="w-0.5 h-12 bg-slate-200" />
                            
                            <div className="flex justify-center w-full relative">
                                {/* Horizontal Connector Bar */}
                                {person.subordinates.length > 1 && (
                                    <div className="absolute top-0 h-0.5 bg-slate-200" 
                                         style={{ 
                                             left: `calc(100% / ${person.subordinates.length} / 2)`, 
                                             right: `calc(100% / ${person.subordinates.length} / 2)` 
                                         }} 
                                    />
                                )}
                                
                                {person.subordinates.map((sub: any) => (
                                    <div key={sub.id} className="flex flex-col items-center flex-1 relative pt-12">
                                        {/* Stem to Child */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-slate-200" />
                                        <OrgChartNode person={sub} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const departments = Array.from(new Set(staffList.map(s => s.department).filter(Boolean)));

    const filteredStaff = staffList.filter(person => {
        const matchesSearch = 
            person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (person.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (person.email || "").toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesDept = selectedDepartment === "all" || person.department === selectedDepartment;
        
        return matchesSearch && matchesDept;
    });

    if (isInitialLoad) {
        return <SignatureLoader fullScreen message="Syncing Team Intelligence" />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Premium Header Area */}
            <div className="bg-[#191A43] border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-12 py-4 sm:py-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="relative flex items-center justify-center sm:justify-start w-full lg:w-auto">
                        <Link href="/backoffice" className="absolute left-0 sm:relative sm:mr-8">
                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 shadow-2xl transition-all text-white/50 hover:text-white">
                                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-4">
                            <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-[0.15em] sm:tracking-[0.2em]">Team Hub</h1>
                            <div className="hidden sm:block">
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Global Personnel Management</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10 w-full lg:w-auto">
                        <div className="flex items-center gap-6 sm:gap-12 sm:pr-10 sm:border-r border-white/10 w-full sm:w-auto justify-center sm:justify-start">
                            <div className="flex items-center gap-2 sm:block text-center sm:text-left">
                                <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest sm:mb-1">Force:</p>
                                <p className="text-lg sm:text-3xl font-black text-white tracking-tighter">{staffList.length}</p>
                            </div>
                            <div className="flex items-center gap-2 sm:block text-center sm:text-left">
                                <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest sm:mb-1">Depts:</p>
                                <p className="text-lg sm:text-3xl font-black text-[#C5A059] tracking-tighter">
                                    {new Set(staffList.map(s => s.department).filter(Boolean)).size}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/5 p-1 rounded-xl sm:rounded-[20px] flex items-center gap-1 border border-white/10 shadow-2xl w-full sm:w-auto">
                            <button 
                                onClick={() => setViewMode("grid")}
                                className={`flex-1 sm:flex-none px-3 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-[15px] text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-300 ${viewMode === "grid" ? "bg-white text-[#191A43] shadow-xl" : "text-white/40 hover:text-white/70"}`}
                            >
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 inline-block mr-1.5 sm:mr-2" />
                                Grid
                            </button>
                            <button 
                                onClick={() => setViewMode("hierarchy")}
                                className={`flex-1 sm:flex-none px-3 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-[15px] text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-300 ${viewMode === "hierarchy" ? "bg-white text-[#191A43] shadow-xl" : "text-white/40 hover:text-white/70"}`}
                            >
                                <GitGraph className="w-3 h-3 sm:w-4 sm:h-4 inline-block mr-1.5 sm:mr-2" />
                                Hierarchy
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar - Glassmorphism */}
                <div className="bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-12 py-3 sm:py-5 flex flex-col md:flex-row gap-4 sm:gap-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <Input 
                                placeholder="Search by name, role..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 sm:h-14 pl-12 sm:pl-14 pr-6 rounded-xl sm:rounded-2xl border-white/5 bg-white/[0.03] focus:bg-white/[0.08] focus:ring-0 text-white placeholder:text-white/20 text-xs sm:text-sm font-bold transition-all shadow-inner"
                            />
                        </div>
                        <div className="relative min-w-full md:min-w-[240px]">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 z-10" />
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                <SelectTrigger className="pl-12 h-11 sm:h-14 rounded-xl sm:rounded-2xl border-white/5 bg-white/[0.03] text-white text-xs sm:text-sm font-bold shadow-inner">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl bg-white">
                                    <SelectItem value="all" className="text-sm font-bold">All Departments</SelectItem>
                                    {Array.from(new Set(staffList.map(s => s.department).filter(Boolean))).map((dept: any) => (
                                        <SelectItem key={dept} value={dept} className="text-sm font-bold">{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-16 space-y-16">
                {/* Enrollment Form */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#191A43]/5 rounded-[2.5rem] blur-2xl group-hover:bg-[#191A43]/10 transition-all" />
                    <Card className="relative z-10 border-white/50 bg-white/80 backdrop-blur-xl rounded-[1.5rem] shadow-xl overflow-hidden border border-slate-100">
                        <CardContent className="p-5 sm:p-8">
                            <form onSubmit={handleAddStaff} className="space-y-6 sm:space-y-8">
                                <div className="flex items-center gap-2 ml-1">
                                    <UserPlus className="w-3.5 h-3.5 text-[#191A43]" />
                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Enroll New Staff Members</span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                        <Input 
                                            placeholder="e.g. Kofi Mensah" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <Input 
                                            placeholder="e.g. kofi@hubtel.com" 
                                            type="email"
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Core Role</label>
                                        <Input 
                                            placeholder="e.g. Senior Tailor" 
                                            value={role} 
                                            onChange={(e) => setRole(e.target.value)}
                                            className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                        <Input 
                                            placeholder="e.g. Couture" 
                                            value={department} 
                                            onChange={(e) => setDepartment(e.target.value)}
                                            className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                        <Input 
                                            placeholder="e.g. 0541234567" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reports To</label>
                                        <Select value={reportsToId} onValueChange={setReportsToId}>
                                            <SelectTrigger className="h-9 sm:h-10 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs sm:text-sm font-bold">
                                                <SelectValue placeholder="Select Manager" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                                <SelectItem value="none" className="text-xs font-bold">No Manager (Lead)</SelectItem>
                                                {staffList.map((s) => (
                                                    <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2 sm:pt-4">
                                    <Button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        className="w-full sm:w-auto h-10 sm:h-11 px-8 rounded-xl bg-[#191A43] text-white hover:bg-[#191A43]/90 font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#191A43]/10 active:scale-95 text-[10px] sm:text-xs"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Deploying...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                <span>Enroll Member</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Team Content */}
                <div className="space-y-8">
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {filteredStaff.map((person, index) => (
                                    <motion.div
                                        key={person.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="group relative border-slate-100 bg-white hover:border-[#191A43]/20 hover:shadow-lg hover:shadow-[#191A43]/5 transition-all rounded-xl overflow-hidden border">
                                            <CardContent className="p-5">
                                                <div className="flex flex-col items-center text-center space-y-3">
                                                    <div className={`w-12 h-12 rounded-xl border-[2.5px] border-white flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-110 duration-500 ${getAvatarColor(person.name)}`}>
                                                        <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                                                    </div>
                                                    
                                                    <div className="space-y-0.5 w-full">
                                                        <h3 className="text-[15px] font-black text-slate-800 truncate">{person.name}</h3>
                                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider">{person.role || "Team Member"}</span>
                                                            {person.department && (
                                                                <span className="px-3 py-1 bg-[#191A43]/5 rounded-full text-[10px] font-black text-[#191A43] uppercase tracking-wider">{person.department}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1.5 px-2">
                                                            {person.email && (
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Mail className="w-2.5 h-2.5 text-slate-300" />
                                                                    <span className="text-[9px] text-slate-400 font-bold truncate">{person.email}</span>
                                                                </div>
                                                            )}
                                                            {person.phone && (
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Phone className="w-2.5 h-2.5 text-slate-300" />
                                                                    <span className="text-[9px] text-slate-400 font-bold truncate">{person.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {person.reportsToId && (
                                                            <div className="flex items-center justify-center gap-1.5 pt-1">
                                                                <Network className="w-2.5 h-2.5 text-slate-200" />
                                                                <span className="text-[9px] text-slate-400 font-bold">Reports to {staffList.find(s => s.id === person.reportsToId)?.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Communication Quick Actions */}
                                                    {person.phone && (
                                                        <div className="flex items-center gap-2 w-full pt-1">
                                                            <a href={`tel:${person.phone}`} className="flex-1 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors border border-emerald-100">
                                                                <Phone className="w-3 h-3" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Call</span>
                                                            </a>
                                                            <a href={`https://wa.me/${person.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center gap-2 hover:bg-green-100 transition-colors border border-green-100">
                                                                <MessageCircle className="w-3 h-3" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                                                            </a>
                                                        </div>
                                                    )}

                                                    <div className="pt-4 w-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => {
                                                                setEditingStaff({ ...person, reportsToId: person.reportsToId || "none" });
                                                                setIsEditDialogOpen(true);
                                                            }}
                                                            className="text-slate-400 hover:text-[#191A43] hover:bg-slate-50 rounded-xl px-4 font-bold text-[10px] uppercase tracking-wider"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5 mr-2" />
                                                            Edit
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => {
                                                                setStaffToDelete(person);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 font-bold text-[10px] uppercase tracking-wider"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                            Offboard
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto pb-20 pt-10 scrollbar-hide">
                            <div className="min-w-max flex justify-center px-20">
                                <div className="flex gap-20">
                                    {buildHierarchy(staffList).map((root: any) => (
                                        <OrgChartNode key={root.id} person={root} />
                                    ))}
                                </div>
                            </div>
                            {staffList.length === 0 && (
                                <div className="text-center py-20 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                                        <Users className="w-10 h-10 text-slate-200" strokeWidth={1} />
                                    </div>
                                    <h3 className="text-xl font-light text-slate-900 mb-2">No hierarchy established yet</h3>
                                    <p className="text-sm text-slate-400 max-w-xs mx-auto font-light">
                                        Enroll your team members and assign reporting lines to build your org chart.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Staff Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-lg rounded-[1.5rem] border-white/50 bg-white/90 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                <Edit2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Edit Profile</DialogTitle>
                                <p className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-tighter">Modify personnel record</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {editingStaff && (
                        <form onSubmit={handleUpdateStaff} className="p-6 pt-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</Label>
                                    <Input 
                                        value={editingStaff.name} 
                                        onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</Label>
                                    <Input 
                                        type="email"
                                        value={editingStaff.email || ""} 
                                        onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</Label>
                                    <Input 
                                        value={editingStaff.role || ""} 
                                        onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</Label>
                                    <Input 
                                        value={editingStaff.phone || ""} 
                                        onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</Label>
                                    <Input 
                                        value={editingStaff.department || ""} 
                                        onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reports To</Label>
                                    <Select 
                                        value={editingStaff.reportsToId || "none"} 
                                        onValueChange={(val) => setEditingStaff({...editingStaff, reportsToId: val})}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold">
                                            <SelectValue placeholder="Select Manager" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="none" className="text-xs font-bold">No Manager (Lead)</SelectItem>
                                            {staffList.filter(s => s.id !== editingStaff.id).map((s) => (
                                                <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setIsEditDialogOpen(false)}
                                    className="rounded-xl font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="bg-[#191A43] hover:bg-[#191A43]/90 text-white rounded-xl px-6 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    {isLoading ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md rounded-[1.5rem] border-white/50 bg-white/90 backdrop-blur-xl shadow-2xl p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-[#CE0003]" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black text-slate-800 uppercase tracking-widest mb-2">Offboard Staff?</DialogTitle>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Are you sure you want to relieve <span className="font-black text-slate-600">{staffToDelete?.name}</span> of their duties? This action will archive their profile.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 rounded-xl font-bold text-[10px] uppercase tracking-widest h-11"
                        >
                            Keep Member
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => staffToDelete && handleRemoveStaff(staffToDelete.id)}
                            disabled={isLoading}
                            className="flex-1 bg-[#CE0003] hover:bg-red-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest h-11 shadow-lg shadow-red-500/20"
                        >
                            {isLoading ? "Archiving..." : "Yes, Offboard"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
