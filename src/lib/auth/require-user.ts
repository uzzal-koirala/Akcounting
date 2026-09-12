import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Team members act on their workspace owner's data, not their own TeamMember row —
// resolving to ownerId here is what makes every existing per-user query (income,
// expenses, invoices, etc.) automatically shared across the whole workspace.
export async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in to do this.");

  const ownerId = session.ownerId ?? session.userId;
  const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { status: true } });
  if (!user || user.status === "Suspended") {
    redirect("/account-suspended");
  }

  return ownerId;
}
