import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { userId } = await auth();
  const params = await searchParams;

  // Forward search parameters (crucial for Clerk invite links like ?__clerk_db_jwt=...)
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const suffix = queryString ? `?${queryString}` : "";

  if (userId) {
    redirect(`/backoffice${suffix}`);
  }

  redirect(`/sign-in${suffix}`);
}
