import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    '/backoffice(.*)',
    '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const { pathname, search } = req.nextUrl;

    if (isProtectedRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Match all request paths except for the ones starting with:
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico (favicon file)
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
