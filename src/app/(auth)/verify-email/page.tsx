import { redirect } from "next/navigation";

import { verifyEmailToken } from "@/actions/auth";
import { getSession } from "@/lib/auth/session";
import { VerifyEmailCard } from "@/components/verify-email-card";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  let error: string | undefined;
  if (token) {
    const result = await verifyEmailToken(token);
    if (!result.error) {
      const session = await getSession();
      redirect(session?.role === "admin" ? "/super-admin" : "/dashboard");
    }
    error = result.error;
  }

  const session = await getSession();
  return <VerifyEmailCard email={session?.email ?? null} error={error} />;
}
