"use client"

export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Mock Header */}
            <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center px-4 sm:px-8 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                    <div className="space-y-2">
                        <div className="w-24 h-5 bg-slate-100 animate-pulse rounded-md" />
                        <div className="w-16 h-3 bg-slate-50 animate-pulse rounded-md" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                    <div className="w-32 h-8 rounded-full bg-slate-100 animate-pulse" />
                </div>
            </header>

            <div className="container mx-auto px-4 pt-10 sm:pt-12 pb-8 max-w-[1400px] space-y-12">
                {/* Search Bar Skeleton */}
                <div className="h-12 w-full max-w-xl bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] animate-pulse" />

                {/* Cards Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="w-24 h-4 bg-slate-200 animate-pulse rounded-full" />
                        <div className="w-12 h-6 bg-slate-200 animate-pulse rounded-full" />
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div 
                            key={i} 
                            className="w-full h-[180px] bg-white rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-50 p-6 flex items-center justify-between"
                        >
                            <div className="space-y-4 flex-1">
                                <div className="w-1/4 h-6 bg-slate-100 animate-pulse rounded-lg" />
                                <div className="w-1/2 h-4 bg-slate-50 animate-pulse rounded-md" />
                                <div className="w-1/3 h-4 bg-slate-50 animate-pulse rounded-md" />
                            </div>
                            <div className="w-24 h-10 bg-slate-100 animate-pulse rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
