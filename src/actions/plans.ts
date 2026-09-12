"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { PLAN_NAMES, type PlanName } from "@/lib/plan";

export type PlanRecord = {
  id: string;
  name: PlanName;
  monthlyPrice: number;
  description: string;
  features: string[];
  maxTeamMembers: number;
  maxDocuments: number;
  canUploadImages: boolean;
  subscriberCount: number;
};

function parseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session.userId;
}

export async function listPlans(): Promise<PlanRecord[]> {
  await requireUserId();
  const [plans, counts] = await Promise.all([
    prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } }),
    prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
  ]);

  return plans
    .filter((row): row is typeof row & { name: PlanName } => (PLAN_NAMES as string[]).includes(row.name))
    .map((row) => ({
      id: row.id,
      name: row.name as PlanName,
      monthlyPrice: row.monthlyPrice,
      description: row.description,
      features: parseFeatures(row.features),
      maxTeamMembers: row.maxTeamMembers,
      maxDocuments: row.maxDocuments,
      canUploadImages: row.canUploadImages,
      subscriberCount: counts.find((count) => count.plan === row.name)?._count.plan ?? 0,
    }));
}

export async function getPlanLimits(planName: PlanName): Promise<{ maxTeamMembers: number; maxDocuments: number; canUploadImages: boolean }> {
  await requireUserId();
  const plan = await prisma.plan.findUnique({ where: { name: planName }, select: { maxTeamMembers: true, maxDocuments: true, canUploadImages: true } });
  return plan ?? { maxTeamMembers: 1, maxDocuments: 0, canUploadImages: false };
}

const updateSchema = z.object({
  monthlyPrice: z.coerce.number().int().min(0),
  description: z.string().trim().max(200),
  features: z.string().trim(),
  maxTeamMembers: z.coerce.number().int().min(1),
  maxDocuments: z.coerce.number().int().min(0),
  canUploadImages: z.enum(["on", "off"]).transform((value) => value === "on"),
});

export async function updatePlan(id: string, formData: FormData) {
  await requireAdminId();
  const parsed = updateSchema.parse({
    monthlyPrice: formData.get("monthlyPrice"),
    description: formData.get("description"),
    features: formData.get("features"),
    maxTeamMembers: formData.get("maxTeamMembers"),
    maxDocuments: formData.get("maxDocuments"),
    canUploadImages: formData.get("canUploadImages") ?? "off",
  });

  const featureList = parsed.features.split("\n").map((line) => line.trim()).filter(Boolean);

  await prisma.plan.update({
    where: { id },
    data: {
      monthlyPrice: parsed.monthlyPrice,
      description: parsed.description,
      features: JSON.stringify(featureList),
      maxTeamMembers: parsed.maxTeamMembers,
      maxDocuments: parsed.maxDocuments,
      canUploadImages: parsed.canUploadImages,
    },
  });

  revalidatePath("/super-admin/plans");
  revalidatePath("/subscription");
  revalidatePath("/documents");
  revalidatePath("/users");
}
