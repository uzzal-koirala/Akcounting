"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export type CouponRecord = {
  id: string;
  code: string;
  type: "Percent" | "Amount";
  value: number;
  active: boolean;
  maxRedemptions: number | null;
  redemptions: number;
  expiresAt: string | null;
  createdAt: string;
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session;
}

function toRecord(row: { id: string; code: string; type: string; value: number; active: boolean; maxRedemptions: number | null; redemptions: number; expiresAt: Date | null; createdAt: Date }): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    type: row.type === "Amount" ? "Amount" : "Percent",
    value: row.value,
    active: row.active,
    maxRedemptions: row.maxRedemptions,
    redemptions: row.redemptions,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCoupons(): Promise<CouponRecord[]> {
  await requireAdmin();
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

const couponSchema = z.object({
  code: z.string().trim().min(3, "Coupon code must be at least 3 characters.").max(30).toUpperCase(),
  type: z.enum(["Percent", "Amount"]),
  value: z.coerce.number().int().min(1, "Enter a value greater than 0."),
  maxRedemptions: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
  expiresAt: z.string().optional(),
});

export async function createCoupon(formData: FormData) {
  await requireAdmin();
  const parsed = couponSchema.parse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    maxRedemptions: formData.get("maxRedemptions") ?? "",
    expiresAt: formData.get("expiresAt") || undefined,
  });

  if (parsed.type === "Percent" && parsed.value > 100) throw new Error("Percent discounts cannot exceed 100.");

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.code } });
  if (existing) throw new Error("A coupon with this code already exists.");

  await prisma.coupon.create({
    data: {
      code: parsed.code,
      type: parsed.type,
      value: parsed.value,
      maxRedemptions: parsed.maxRedemptions ?? null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    },
  });

  revalidatePath("/super-admin/plans");
}

export async function toggleCoupon(id: string, active: boolean) {
  await requireAdmin();
  await prisma.coupon.update({ where: { id }, data: { active } });
  revalidatePath("/super-admin/plans");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/super-admin/plans");
}
