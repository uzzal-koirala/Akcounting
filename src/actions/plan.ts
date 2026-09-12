"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { toPlanName, type PlanName } from "@/lib/plan";

export async function getCurrentPlan(): Promise<PlanName> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  return toPlanName(user?.plan);
}
