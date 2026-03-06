"use client"

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

function HomeRedirect() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoaded) return;

    const queryString = searchParams.toString();
    const suffix = queryString ? `?${queryString}` : "";

    // If the middleware somehow missed the redirect, this client-side 
    // hook will catch it and finish the job.
    if (userId) {
      router.replace(`/backoffice${suffix}`);
    } else {
      router.replace(`/sign-in${suffix}`);
    }
  }, [isLoaded, userId, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#F9FCFF] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-[#191A43] animate-spin" />
      <p className="text-slate-400 font-medium animate-pulse">Entering OTracker...</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
