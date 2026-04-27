"use client"

import { useState, useEffect } from "react";
import { addStaff, getStaff, removeStaff, updateStaff } from "@/app/actions/operations";
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
    Hierarchy
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
        loadStaff().then(() => setIsInitialLoad(false));
    }, []);

    async function loadStaff() {
        const data = await getStaff();
        setStaffList(data);
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
        } catch (error) {
            toast.error("Failed to enroll staff");
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

    // Calculate Stats
    const totalStaff = staffList.length;
    const uniqueRoles = new Set(staffList.map(s => s.role?.toLowerCase().trim()).filter(Boolean)).size;

    // Helper to get deterministic color for avatar
    const getAvatarColor = (name: string) => {
        const colors = [
            "bg-indigo-500", "bg-emerald-500", "bg-rose-500", 
            "bg-amber-500", "bg-violet-500", "bg-cyan-500",
            "bg-blue-500", "bg-pink-500"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="bg-[#FBFBFF] min-h-screen">
            {/* Pro-HUD Header */}
            <div className="bg-white border-b border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.02)] relative z-30">
                <div className="w-full px-4 sm:px-8 py-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Title Area */}
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <Link href="/backoffice">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-400 hover:text-[#191A43]" title="Back to Dashboard">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#191A43] animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Management</span>
                            </div>
                            <h1 className="text-2xl font-black text-[#191A43] tracking-tight whitespace-nowrap uppercase">Team Hub</h1>
                        </div>
                    </div>

                    {/* Live Metrics Hub */}
                    <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 min-w-[140px]">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                <Users className="w-4 h-4 text-[#191A43]" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Staff</p>
                                <p className="text-lg font-black text-[#191A43] leading-none">{totalStaff}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 min-w-[140px]">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Roles</p>
                                <p className="text-lg font-black text-[#191A43] leading-none">{uniqueRoles}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 min-w-[140px]">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                <ShieldCheck className="w-4 h-4 text-[#CE0003]" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Access Level</p>
                                <p className="text-lg font-black text-[#CE0003] leading-none">Admin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 pb-20 space-y-12">
                
                {/* Add Staff Strip */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#191A43]/5 rounded-[2.5rem] blur-2xl group-hover:bg-[#191A43]/10 transition-all" />
                    <Card className="relative z-10 border-white/50 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                        <CardContent className="p-8 sm:p-10">
                            <form onSubmit={handleAddStaff} className="flex flex-col lg:flex-row items-center gap-6">
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <UserPlus className="w-3.5 h-3.5 text-[#191A43]" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enroll New Staff Members</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</p>
                                            <Input 
                                                placeholder="e.g. Kofi Mensah" 
                                                value={name} 
                                                onChange={(e) => setName(e.target.value)}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Core Role</p>
                                            <Input 
                                                placeholder="e.g. Senior Tailor" 
                                                value={role} 
                                                onChange={(e) => setRole(e.target.value)}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</p>
                                            <Input 
                                                placeholder="e.g. Couture" 
                                                value={department} 
                                                onChange={(e) => setDepartment(e.target.value)}
                                                className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reports To</p>
                                            <Select value={reportsToId} onValueChange={setReportsToId}>
                                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-xs font-bold">
                                                    <SelectValue placeholder="Select Manager" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                                    <SelectItem value="none" className="text-xs font-bold">No Manager (Lead)</SelectItem>
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
                                        <Card className="group relative border-slate-100 bg-white hover:border-[#191A43]/20 hover:shadow-2xl hover:shadow-[#191A43]/5 transition-all rounded-[2rem] overflow-hidden border">
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
                        <div className="max-w-4xl mx-auto space-y-12 bg-white/50 p-12 rounded-[3rem] border border-slate-100 shadow-inner">
                            {buildHierarchy(staffList).map((root: any) => (
                                <StaffNode key={root.id} person={root} />
                            ))}
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
