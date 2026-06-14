"use client"

import { useState } from "react";
import { clockIn, clockOut } from "@/app/actions/operations";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Fingerprint, LogIn, LogOut, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ClockInTerminal() {
    const [pinCode, setPinCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<"in" | "out" | null>(null);

    const handleKeypad = (num: string) => {
        if (pinCode.length < 4) {
            setPinCode(prev => prev + num);
        }
    };

    const handleClear = () => {
        setPinCode("");
    };

    const handleDelete = () => {
        setPinCode(prev => prev.slice(0, -1));
    };

    const handleClockIn = async () => {
        if (pinCode.length !== 4) return toast.error("Enter a 4-digit PIN");
        setIsLoading(true);
        setActiveAction("in");
        try {
            const res = await clockIn(pinCode);
            if (res.success) {
                toast.success(`Welcome back, ${res.staffName}! Clocked in successfully.`, {
                    style: { background: "#10b981", color: "#fff", border: "none" }
                });
                setPinCode("");
            } else {
                toast.error(res.error || "Clock-in failed");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsLoading(false);
            setActiveAction(null);
        }
    };

    const handleClockOut = async () => {
        if (pinCode.length !== 4) return toast.error("Enter a 4-digit PIN");
        setIsLoading(true);
        setActiveAction("out");
        try {
            const res = await clockOut(pinCode);
            if (res.success) {
                toast.success(`Goodbye, ${res.staffName}. Clocked out successfully.`, {
                    style: { background: "#191A43", color: "#fff", border: "none" }
                });
                setPinCode("");
            } else {
                toast.error(res.error || "Clock-out failed");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsLoading(false);
            setActiveAction(null);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <Link href="/backoffice" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-[#191A43] font-bold transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Dashboard
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#191A43] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#191A43]/20">
                        <Fingerprint className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-[#191A43]">Staff Terminal</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Enter your 4-digit PIN to clock in or out</p>
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardContent className="p-8">
                        <div className="flex justify-center gap-3 mb-8">
                            {[0, 1, 2, 3].map((i) => (
                                <div 
                                    key={i}
                                    className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-black transition-all ${
                                        pinCode.length > i 
                                            ? "bg-[#191A43] text-white shadow-lg shadow-[#191A43]/30 scale-110" 
                                            : "bg-slate-100 text-slate-400"
                                    }`}
                                >
                                    {pinCode.length > i ? "•" : ""}
                                </div>
                            ))}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleKeypad(num.toString())}
                                    className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-2xl font-black text-[#191A43] transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleClear}
                                className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-sm font-bold text-red-600 transition-colors uppercase tracking-widest"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => handleKeypad("0")}
                                className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-2xl font-black text-[#191A43] transition-colors"
                            >
                                0
                            </button>
                            <button
                                onClick={handleDelete}
                                className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-sm font-bold text-slate-600 transition-colors uppercase tracking-widest"
                            >
                                Del
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handleClockIn}
                                disabled={pinCode.length !== 4 || isLoading}
                                className="h-14 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm"
                            >
                                {isLoading && activeAction === "in" ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <><LogIn className="w-5 h-5 mr-2" /> Clock In</>
                                )}
                            </Button>
                            <Button
                                onClick={handleClockOut}
                                disabled={pinCode.length !== 4 || isLoading}
                                className="h-14 rounded-xl bg-[#191A43] hover:bg-slate-800 text-white font-bold text-sm"
                            >
                                {isLoading && activeAction === "out" ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <><LogOut className="w-5 h-5 mr-2" /> Clock Out</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
