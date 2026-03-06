import { Loader2 } from "lucide-react";

export default function HomePage() {
  // Redirection is handled entirely by src/middleware.ts.
  // This page is a fallback to avoid server-side auth() errors.
  return (
    <div className="min-h-screen bg-[#F9FCFF] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-[#191A43] animate-spin" />
      <p className="text-slate-400 font-medium animate-pulse">Entering OTracker...</p>
    </div>
  );
}
