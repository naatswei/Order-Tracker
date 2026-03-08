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

    // Handle root route redirection squarely in middleware
    if (pathname === '/') {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.redirect(new URL(`/sign-in${search}`, req.url));
        }

        // If we have an orgId, go to backoffice. If not, go to onboarding/organization
        const target = orgId ? `/backoffice${search}` : `/onboarding/organization${search}`;
        return NextResponse.redirect(new URL(target, req.url));
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
