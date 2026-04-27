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
    ChevronUp
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignatureLoader } from "@/components/signature-loader";

export default function StaffPage() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [department, setDepartment] = useState("");
    const [reportsToId, setReportsToId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "hierarchy">("grid");

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
                department: department || undefined, 
                reportsToId: reportsToId === "none" ? undefined : reportsToId 
            });
            toast.success("New team member deployed!", {
                style: { background: "#191A43", color: "#fff", border: "none" }
            });
            setName("");
            setRole("");
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

    async function handleRemoveStaff(id: string) {
        if (!confirm("Relieve this staff member of their duties?")) return;

        try {
            await removeStaff(id);
            toast.success("Staff profile archived");
            loadStaff();
        } catch (error) {
            toast.error("Failed to remove staff");
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

        return roots.sort((a, b) => getWeight(b.role) - getWeight(a.role));
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

    if (isInitialLoad) {
        return <SignatureLoader fullScreen message="Syncing Team Intelligence" />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Strip */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 backdrop-blur-md bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/backoffice">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-50">
                                <ArrowLeft className="w-4 h-4 text-slate-400" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#191A43] flex items-center justify-center shadow-lg shadow-[#191A43]/20">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Team Hub</h1>
                                <p className="text-[10px] text-slate-400 font-bold">Manage Personnel & Hierarchy</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-8 pr-6 border-r border-slate-100">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Force</p>
                                <p className="text-lg font-black text-[#191A43] leading-none">{staffList.length}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Departments</p>
                                <p className="text-lg font-black text-[#C5A059] leading-none">
                                    {new Set(staffList.map(s => s.department).filter(Boolean)).size}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center bg-slate-100/50 p-1 rounded-xl">
                            <button 
                                onClick={() => setViewMode("grid")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "grid" ? "bg-white text-[#191A43] shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                Grid
                            </button>
                            <button 
                                onClick={() => setViewMode("hierarchy")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "hierarchy" ? "bg-white text-[#191A43] shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <GitGraph className="w-3.5 h-3.5" />
                                Hierarchy
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-12">
                {/* Enrollment Form */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#191A43]/5 rounded-[2.5rem] blur-2xl group-hover:bg-[#191A43]/10 transition-all" />
                    <Card className="relative z-10 border-white/50 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <CardContent className="p-8 sm:p-10">
                            <form onSubmit={handleAddStaff} className="space-y-8">
                                <div className="flex items-center gap-2 ml-1">
                                    <UserPlus className="w-4 h-4 text-[#191A43]" />
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Enroll New Staff Members</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                        <Input 
                                            placeholder="e.g. Kofi Mensah" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-bold"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Core Role</label>
                                        <Input 
                                            placeholder="e.g. Senior Tailor" 
                                            value={role} 
                                            onChange={(e) => setRole(e.target.value)}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                        <Input 
                                            placeholder="e.g. Couture" 
                                            value={department} 
                                            onChange={(e) => setDepartment(e.target.value)}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reports To</label>
                                        <Select value={reportsToId} onValueChange={setReportsToId}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-bold">
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

                                <div className="flex justify-end pt-4">
                                    <Button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        className="h-14 px-12 rounded-2xl bg-[#191A43] text-white hover:bg-[#191A43]/90 font-black uppercase tracking-widest transition-all shadow-2xl shadow-[#191A43]/20 active:scale-95"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Deploying...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Plus className="w-5 h-5" />
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
                                {staffList.map((person, index) => (
                                    <motion.div
                                        key={person.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="group relative border-slate-100 bg-white hover:border-[#191A43]/20 hover:shadow-2xl hover:shadow-[#191A43]/5 transition-all rounded-[2.5rem] overflow-hidden border">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col items-center text-center space-y-4">
                                                    <div className={`w-20 h-20 rounded-[2rem] border-4 border-white flex items-center justify-center shrink-0 shadow-xl transition-transform group-hover:scale-110 duration-500 ${getAvatarColor(person.name)}`}>
                                                        <User className="w-8 h-8 text-white" strokeWidth={2.5} />
                                                    </div>
                                                    
                                                    <div className="space-y-1 w-full">
                                                        <h3 className="text-base font-black text-slate-800 truncate">{person.name}</h3>
                                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider">{person.role || "Team Member"}</span>
                                                            {person.department && (
                                                                <span className="px-3 py-1 bg-[#191A43]/5 rounded-full text-[10px] font-black text-[#191A43] uppercase tracking-wider">{person.department}</span>
                                                            )}
                                                        </div>
                                                        {person.reportsToId && (
                                                            <div className="flex items-center justify-center gap-1.5 pt-2">
                                                                <Network className="w-3 h-3 text-slate-300" />
                                                                <span className="text-[10px] text-slate-400 font-bold">Reports to {staffList.find(s => s.id === person.reportsToId)?.name}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 w-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => handleRemoveStaff(person.id)}
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
