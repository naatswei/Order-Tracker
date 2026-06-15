"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { unlockTerminal, clockIn } from "@/app/actions/operations";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Loader2, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export const TerminalSessionContext = createContext<{
    activeStaff: { staffId: string, name: string } | null;
}>({ activeStaff: null });

export function useTerminalSession() {
    return useContext(TerminalSessionContext);
}

export function TerminalGuard({ children, hasSession, sessionData }: { children: React.ReactNode, hasSession: boolean, sessionData: any }) {
    const [pinCode, setPinCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(!hasSession);
    const router = useRouter();

    // If the server tells us there's a session, we are unlocked.
    useEffect(() => {
        setIsLocked(!hasSession);
    }, [hasSession]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pinCode.length !== 4) return;

        setIsLoading(true);
        try {
            // First try to just unlock.
            const result = await unlockTerminal(pinCode);
            if (result.success) {
                toast.success(`Welcome back, ${result.staffName}`);
                setIsLocked(false);
                setPinCode("");
                router.refresh(); // Refresh to update server components with new cookie
            } else {
                toast.error(result.error || "Invalid PIN");
                setPinCode("");
            }
        } catch (error) {
            toast.error("Failed to unlock terminal");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TerminalSessionContext.Provider value={{ activeStaff: sessionData }}>
            {/* The main app content */}
            <div className={`transition-all duration-500 ${isLocked ? 'blur-md pointer-events-none' : ''}`}>
                {children}
            </div>

            {/* The Lock Screen Overlay */}
            <AnimatePresence>
                {isLocked && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#191A43]/95 backdrop-blur-xl"
                    >
                        <div className="absolute top-8 left-8 text-white/50 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Terminal Locked
                        </div>
                        
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-2xl w-[90%] max-w-md flex flex-col items-center text-center space-y-8"
                        >
                            <div className="w-20 h-20 rounded-full bg-[#191A43]/5 flex items-center justify-center">
                                <Fingerprint className="w-10 h-10 text-[#191A43]" />
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Staff Access</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enter 4-Digit PIN to unlock terminal</p>
                            </div>

                            <form onSubmit={handleUnlock} className="w-full space-y-6">
                                <Input 
                                    type="password" 
                                    maxLength={4}
                                    placeholder="••••"
                                    value={pinCode}
                                    onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="h-16 text-center text-3xl font-black tracking-[1em] rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-[#191A43]"
                                    autoFocus
                                />
                                
                                <Button 
                                    type="submit" 
                                    disabled={pinCode.length !== 4 || isLoading}
                                    className="w-full h-14 rounded-xl bg-[#191A43] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[#191A43]/20 transition-all"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unlock Terminal"}
                                </Button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </TerminalSessionContext.Provider>
    );
}
