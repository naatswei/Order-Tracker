"use client"

import { motion } from "framer-motion";

interface SignatureLoaderProps {
    message?: string;
    fullScreen?: boolean;
}

export function SignatureLoader({ 
    message = "Syncing Base", 
    fullScreen = false 
}: SignatureLoaderProps) {
    return (
        <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-[#FBFBFF]' : 'min-h-[40vh]'} space-y-10`}>
            <div className="relative">
                {/* Outer Kinetic Frame */}
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        borderRadius: ["30%", "50%", "30%"]
                    }}
                    transition={{ 
                        rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                        borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-24 h-24 border-[0.5px] border-[#CE0003]/30 bg-white/50 backdrop-blur-sm shadow-[0_0_40px_rgba(206,0,3,0.05)]"
                />
                
                {/* Pulsing Branded Core */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                        animate={{ 
                            scale: [0.95, 1.05, 0.95],
                            boxShadow: [
                                "0 10px 40px -10px rgba(25,26,67,0.1)",
                                "0 20px 50px -10px rgba(206,0,3,0.15)",
                                "0 10px 40px -10px rgba(25,26,67,0.1)"
                            ]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center relative z-10"
                    >
                        <span className="text-[#CE0003] font-black text-2xl tracking-tighter">O</span>
                    </motion.div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CE0003] animate-pulse" />
                    <p className="text-[10px] font-black text-[#191A43] uppercase tracking-[0.4em] text-center px-4">{message}</p>
                </div>
                
                {/* Kinetic Progress Shimmer */}
                <div className="w-32 h-[1px] bg-slate-100 relative overflow-hidden rounded-full">
                    <motion.div 
                        animate={{ x: [-128, 128] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CE0003] to-transparent w-full"
                    />
                </div>
            </div>
        </div>
    );
}
