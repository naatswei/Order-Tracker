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
    Briefcase
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignatureLoader } from "@/components/signature-loader";

export default function StaffPage() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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
            await addStaff(name, role);
            toast.success("New team member deployed!", {
                style: { background: "#191A43", color: "#fff", border: "none" }
            });
            setName("");
            setRole("");
            loadStaff();
        } catch (error) {
            toast.error("Deployment failed");
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
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enroll New Member</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input 
                                            placeholder="Full Name (e.g., Kofi Mensah)" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-medium"
                                            required
                                        />
                                        <Input 
                                            placeholder="Core Role (e.g., Senior Tailor)" 
                                            value={role} 
                                            onChange={(e) => setRole(e.target.value)}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-[#191A43] focus:border-[#191A43] text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="w-full lg:w-auto h-12 px-10 rounded-xl bg-[#191A43] text-white hover:bg-[#191A43]/90 font-bold transition-all shadow-xl shadow-indigo-500/10 active:scale-95 shrink-0"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Deploying...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Plus className="w-4 h-4" />
                                            <span>Add Member</span>
                                        </div>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Team Grid */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#191A43]" />
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Deployed Personnel</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{totalStaff} Members Active</span>
                    </div>

                    {isInitialLoad ? (
                        <SignatureLoader message="Syncing Team Profiles" />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <AnimatePresence>
                                {staffList.map((person, index) => (
                                    <motion.div
                                        key={person.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="group relative border-slate-100 bg-white hover:border-[#191A43]/20 hover:shadow-xl hover:shadow-[#191A43]/5 transition-all rounded-2xl overflow-hidden">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Avatar */}
                                                    <div className={`w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-500 ${getAvatarColor(person.name)}`}>
                                                        <User className="w-5 h-5 text-white" strokeWidth={2} />
                                                    </div>
                                                    
                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                            <h3 className="text-sm font-black text-[#191A43] truncate">
                                                                {person.name}
                                                            </h3>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate leading-none">
                                                            {person.role || "Operator"}
                                                        </p>
                                                    </div>

                                                    {/* Remove Action */}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveStaff(person.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg transition-all shrink-0"
                                                        title="Remove Member"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {staffList.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full py-32 flex flex-col items-center justify-center bg-white/50 border-2 border-dashed border-slate-100 rounded-[3rem] text-center"
                                >
                                    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                                        <Users className="w-10 h-10 text-slate-200" strokeWidth={1} />
                                    </div>
                                    <h3 className="text-xl font-light text-slate-900 mb-2">The team is currently empty</h3>
                                    <p className="text-sm text-slate-400 max-w-xs mx-auto font-light">
                                        Start by enrolling your first team member using the deployment module above.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
