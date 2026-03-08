"use client"

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { AppLoader } from "@/components/app-loader";

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

  return <AppLoader />;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
