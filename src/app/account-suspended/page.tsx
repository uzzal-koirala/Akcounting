import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SuspendedNotice } from "@/components/suspended-notice";

export default async function AccountSuspendedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true, suspendReason: true } });
  if (!user || user.status !== "Suspended") redirect(session.role === "admin" ? "/super-admin" : "/dashboard");

  return <SuspendedNotice reason={user.suspendReason} />;
}
