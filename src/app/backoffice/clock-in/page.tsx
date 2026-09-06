"use client"

import { useState, useEffect } from "react";
import { clockIn, clockOut } from "@/app/actions/operations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Fingerprint, LogIn, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ClockInTerminal() {
    const [pinCode, setPinCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<"in" | "out" | null>(null);
    const { organization, isLoaded } = useOrganization();
    const router = useRouter();

    const isLogistics = (organization?.publicMetadata?.businessType as string) === "logistics";

    useEffect(() => {
        if (isLoaded && isLogistics) {
            router.replace("/backoffice");
        }
    }, [isLoaded, isLogistics, router]);

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

    if (isLogistics) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 bg-slate-50/50">
            <div className="w-full max-w-sm mb-4 flex items-center justify-start">
                <Link href="/backoffice" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#191A43] font-bold transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-[#191A43] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-[#191A43]/20">
                        <Fingerprint className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#191A43]">Staff Terminal</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Enter your 4-digit PIN to clock in or out</p>
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex justify-center gap-3 mb-6 sm:mb-8">
                            {[0, 1, 2, 3].map((i) => (
                                <div 
                                    key={i}
                                    className={`w-11 sm:w-12 h-13 sm:h-14 rounded-xl flex items-center justify-center text-2xl font-black transition-all ${
                                        pinCode.length > i 
                                            ? "bg-[#191A43] text-white shadow-lg shadow-[#191A43]/30 scale-105" 
                                            : "bg-slate-100 text-slate-400"
                                    }`}
                                >
                                    {pinCode.length > i ? "•" : ""}
                                </div>
                            ))}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleKeypad(num.toString())}
                                    className="h-14 sm:h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xl sm:text-2xl font-black text-[#191A43] transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleClear}
                                className="h-14 sm:h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-xs sm:text-sm font-bold text-red-600 transition-colors uppercase tracking-wider"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => handleKeypad("0")}
                                className="h-14 sm:h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xl sm:text-2xl font-black text-[#191A43] transition-colors"
                            >
                                0
                            </button>
                            <button
                                onClick={handleDelete}
                                className="h-14 sm:h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xs sm:text-sm font-bold text-slate-600 transition-colors uppercase tracking-wider"
                            >
                                Del
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handleClockIn}
                                disabled={pinCode.length !== 4 || isLoading}
                                className="h-12 sm:h-14 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm"
                            >
                                {isLoading && activeAction === "in" ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <><LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> Clock In</>
                                )}
                            </Button>
                            <Button
                                onClick={handleClockOut}
                                disabled={pinCode.length !== 4 || isLoading}
                                className="h-12 sm:h-14 rounded-xl bg-[#191A43] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm"
                            >
                                {isLoading && activeAction === "out" ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <><LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> Clock Out</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
