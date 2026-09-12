"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { REFERRAL_REWARD_AMOUNT, DEFAULT_MIN_WITHDRAWAL, daysForWithdrawalAmount } from "@/lib/referral";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session;
}

export type AffiliateOverview = {
  rewardAmount: number;
  minWithdrawal: number;
  programActive: boolean;
  totalAffiliates: number;
  totalReferred: number;
  totalRewardsAmount: number;
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  paidOutAmount: number;
  pendingWithdrawalCount: number;
  pendingWithdrawalAmount: number;
};

export async function getAffiliateOverview(): Promise<AffiliateOverview> {
  await requireAdmin();

  const [settings, totalAffiliates, totalReferred, allRewards, pendingRewards, paidRewards, pendingWithdrawals] = await Promise.all([
    prisma.affiliateSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default", rewardAmount: REFERRAL_REWARD_AMOUNT, minWithdrawal: DEFAULT_MIN_WITHDRAWAL } }),
    prisma.user.count({ where: { referralCode: { not: null } } }),
    prisma.user.count({ where: { referredByUserId: { not: null } } }),
    prisma.referralReward.aggregate({ _sum: { amount: true } }),
    prisma.referralReward.aggregate({ where: { paidOut: false }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.referralReward.aggregate({ where: { paidOut: true }, _sum: { amount: true } }),
    prisma.affiliateWithdrawal.aggregate({ where: { status: "Pending" }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return {
    rewardAmount: settings.rewardAmount,
    minWithdrawal: settings.minWithdrawal,
    programActive: settings.active,
    totalAffiliates,
    totalReferred,
    totalRewardsAmount: allRewards._sum.amount ?? 0,
    pendingPayoutAmount: pendingRewards._sum.amount ?? 0,
    pendingPayoutCount: pendingRewards._count._all,
    paidOutAmount: paidRewards._sum.amount ?? 0,
    pendingWithdrawalCount: pendingWithdrawals._count._all,
    pendingWithdrawalAmount: pendingWithdrawals._sum.amount ?? 0,
  };
}

export type TopReferrer = { userId: string; name: string; email: string; referralCode: string | null; referredCount: number; rewardTotal: number };

export async function listTopReferrers(): Promise<TopReferrer[]> {
  await requireAdmin();

  const grouped = await prisma.referralReward.groupBy({ by: ["referrerId"], _sum: { amount: true }, _count: { _all: true }, orderBy: { _sum: { amount: "desc" } }, take: 10 });
  if (grouped.length === 0) return [];

  const referrers = await prisma.user.findMany({ where: { id: { in: grouped.map((row) => row.referrerId) } }, select: { id: true, name: true, email: true, referralCode: true } });
  const referrerMap = new Map(referrers.map((row) => [row.id, row]));

  return grouped.map((row) => {
    const referrer = referrerMap.get(row.referrerId);
    return {
      userId: row.referrerId,
      name: referrer?.name ?? "Deleted user",
      email: referrer?.email ?? "—",
      referralCode: referrer?.referralCode ?? null,
      referredCount: row._count._all,
      rewardTotal: row._sum.amount ?? 0,
    };
  });
}

export type AffiliateRewardRow = {
  id: string;
  amount: number;
  paidOut: boolean;
  paidOutAt: string | null;
  createdAt: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
};

export async function listAffiliateRewards(): Promise<AffiliateRewardRow[]> {
  await requireAdmin();
  const rewards = await prisma.referralReward.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  if (rewards.length === 0) return [];

  const userIds = Array.from(new Set(rewards.flatMap((row) => [row.referrerId, row.referredUserId])));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((row) => [row.id, row]));

  return rewards.map((row) => ({
    id: row.id,
    amount: row.amount,
    paidOut: row.paidOut,
    paidOutAt: row.paidOutAt ? row.paidOutAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    referrerName: userMap.get(row.referrerId)?.name ?? "Deleted user",
    referrerEmail: userMap.get(row.referrerId)?.email ?? "—",
    referredName: userMap.get(row.referredUserId)?.name ?? "Deleted user",
    referredEmail: userMap.get(row.referredUserId)?.email ?? "—",
  }));
}

export async function setRewardPaidOut(id: string, paidOut: boolean) {
  await requireAdmin();
  await prisma.referralReward.update({ where: { id }, data: { paidOut, paidOutAt: paidOut ? new Date() : null } });
  revalidatePath("/super-admin/affiliates");
}

const settingsSchema = z.object({
  rewardAmount: z.coerce.number().int().min(1, "Enter a reward amount greater than 0."),
  minWithdrawal: z.coerce.number().int().min(1, "Enter a minimum withdrawal amount greater than 0."),
  active: z.enum(["on", "off"]).transform((value) => value === "on"),
});

export async function updateAffiliateSettings(formData: FormData) {
  await requireAdmin();
  const parsed = settingsSchema.parse({
    rewardAmount: formData.get("rewardAmount"),
    minWithdrawal: formData.get("minWithdrawal"),
    active: formData.get("active") ?? "off",
  });

  await prisma.affiliateSettings.upsert({
    where: { id: "default" },
    update: { rewardAmount: parsed.rewardAmount, minWithdrawal: parsed.minWithdrawal, active: parsed.active },
    create: { id: "default", rewardAmount: parsed.rewardAmount, minWithdrawal: parsed.minWithdrawal, active: parsed.active },
  });

  revalidatePath("/super-admin/affiliates");
  revalidatePath("/refer");
}

export type WithdrawalRequestRow = {
  id: string;
  userId: string;
  amount: number;
  method: "Cash" | "Subscription";
  status: "Pending" | "Paid" | "Rejected";
  bankName: string;
  accountName: string;
  accountNumber: string;
  adminNote: string;
  createdAt: string;
  decidedAt: string | null;
  userName: string;
  userEmail: string;
};

export async function listWithdrawalRequests(): Promise<WithdrawalRequestRow[]> {
  await requireAdmin();
  const rows = await prisma.affiliateWithdrawal.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  if (rows.length === 0) return [];

  const users = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((row) => row.userId))) } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    method: row.method === "Subscription" ? "Subscription" : "Cash",
    status: row.status === "Paid" ? "Paid" : row.status === "Rejected" ? "Rejected" : "Pending",
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    userName: userMap.get(row.userId)?.name ?? "Deleted user",
    userEmail: userMap.get(row.userId)?.email ?? "—",
  }));
}

export async function decideWithdrawal(id: string, action: "approve" | "reject", adminNote?: string) {
  await requireAdmin();
  const request = await prisma.affiliateWithdrawal.findUnique({ where: { id } });
  if (!request) throw new Error("This withdrawal request could not be found.");
  if (request.status !== "Pending") throw new Error("This request has already been reviewed.");

  if (action === "reject") {
    await prisma.affiliateWithdrawal.update({ where: { id }, data: { status: "Rejected", adminNote: adminNote ?? "", decidedAt: new Date() } });
    revalidatePath("/super-admin/affiliates");
    return;
  }

  if (request.method === "Subscription") {
    const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { plan: true, planRenewsAt: true } });
    const planRow = user ? await prisma.plan.findUnique({ where: { name: user.plan }, select: { monthlyPrice: true } }) : null;
    const days = daysForWithdrawalAmount(request.amount, planRow?.monthlyPrice ?? 0);
    const base = user?.planRenewsAt && user.planRenewsAt.getTime() > Date.now() ? user.planRenewsAt : new Date();
    const planRenewsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.subscriptionExtension.create({ data: { userId: request.userId, days } }),
      prisma.user.update({ where: { id: request.userId }, data: { planRenewsAt } }),
      prisma.affiliateWithdrawal.update({ where: { id }, data: { status: "Paid", adminNote: adminNote ?? `Applied as ${days} extra day${days === 1 ? "" : "s"} of subscription.`, decidedAt: new Date() } }),
    ]);
  } else {
    await prisma.affiliateWithdrawal.update({ where: { id }, data: { status: "Paid", adminNote: adminNote ?? "", decidedAt: new Date() } });
  }

  revalidatePath("/super-admin/affiliates");
  revalidatePath("/refer");
  revalidatePath("/subscription");
}
