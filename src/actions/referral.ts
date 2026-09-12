"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireUserId } from "@/lib/auth/require-user";
import { REFERRAL_REWARD_AMOUNT, DEFAULT_MIN_WITHDRAWAL } from "@/lib/referral";

export type WithdrawalMethod = "Cash" | "Subscription";
export type WithdrawalStatus = "Pending" | "Paid" | "Rejected";
export type WithdrawalRecord = {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  bankName: string;
  accountName: string;
  accountNumber: string;
  adminNote: string;
  createdAt: string;
  decidedAt: string | null;
};

export type ReferralInfo = {
  code: string;
  name: string;
  invited: number;
  pendingInvites: number;
  rewardEarned: number;
  rewardPerReferral: number;
  minWithdrawal: number;
  availableBalance: number;
  hasPendingWithdrawal: boolean;
  withdrawals: WithdrawalRecord[];
  currentPlanPrice: number;
};

function generateCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function ensureReferralCode(userId: string, existingCode: string | null): Promise<string> {
  if (existingCode) return existingCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // code collision — try again with a new random code
    }
  }
  throw new Error("Could not generate a referral code. Please try again.");
}

function toWithdrawalRecord(row: { id: string; amount: number; method: string; status: string; bankName: string; accountName: string; accountNumber: string; adminNote: string; createdAt: Date; decidedAt: Date | null }): WithdrawalRecord {
  return {
    id: row.id,
    amount: row.amount,
    method: row.method === "Subscription" ? "Subscription" : "Cash",
    status: row.status === "Paid" ? "Paid" : row.status === "Rejected" ? "Rejected" : "Pending",
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

export async function getReferralInfo(): Promise<ReferralInfo> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in to do this.");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, referralCode: true, plan: true } });
  if (!user) throw new Error("Account not found.");

  const code = await ensureReferralCode(user.id, user.referralCode);

  const [invited, rewards, settings, withdrawalRows, planRow] = await Promise.all([
    prisma.user.count({ where: { referredByUserId: user.id } }),
    prisma.referralReward.aggregate({ where: { referrerId: user.id }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.affiliateSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default", rewardAmount: REFERRAL_REWARD_AMOUNT, minWithdrawal: DEFAULT_MIN_WITHDRAWAL } }),
    prisma.affiliateWithdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.plan.findUnique({ where: { name: user.plan }, select: { monthlyPrice: true } }),
  ]);

  const rewardEarned = rewards._sum.amount ?? 0;
  const claimedOrPending = withdrawalRows.filter((row) => row.status !== "Rejected").reduce((sum, row) => sum + row.amount, 0);

  return {
    code,
    name: user.name,
    invited,
    pendingInvites: invited - rewards._count._all,
    rewardEarned,
    rewardPerReferral: settings.rewardAmount,
    minWithdrawal: settings.minWithdrawal,
    availableBalance: Math.max(0, rewardEarned - claimedOrPending),
    hasPendingWithdrawal: withdrawalRows.some((row) => row.status === "Pending"),
    withdrawals: withdrawalRows.map(toWithdrawalRecord),
    currentPlanPrice: planRow?.monthlyPrice ?? 0,
  };
}

export async function findReferrerByCode(code: string) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const referrer = await prisma.user.findUnique({ where: { referralCode: trimmed }, select: { id: true } });
  return referrer?.id ?? null;
}

export async function creditReferralReward(purchasedUserId: string) {
  const purchasedUser = await prisma.user.findUnique({ where: { id: purchasedUserId }, select: { id: true, referredByUserId: true } });
  if (!purchasedUser?.referredByUserId) return;

  const existingReward = await prisma.referralReward.findUnique({ where: { referredUserId: purchasedUser.id } });
  if (existingReward) return;

  const settings = await prisma.affiliateSettings.findUnique({ where: { id: "default" } });
  if (settings && !settings.active) return;

  await prisma.referralReward.create({
    data: { referrerId: purchasedUser.referredByUserId, referredUserId: purchasedUser.id, amount: settings?.rewardAmount ?? REFERRAL_REWARD_AMOUNT },
  });
}

const withdrawalSchema = z.object({
  amount: z.coerce.number().int().min(1, "Enter a withdrawal amount."),
  method: z.enum(["Cash", "Subscription"]),
  bankName: z.string().trim().max(120).optional().default(""),
  accountName: z.string().trim().max(120).optional().default(""),
  accountNumber: z.string().trim().max(60).optional().default(""),
});

export async function requestWithdrawal(formData: FormData) {
  const userId = await requireUserId();
  const parsed = withdrawalSchema.parse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    bankName: formData.get("bankName") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: formData.get("accountNumber") ?? "",
  });

  if (parsed.method === "Cash" && (!parsed.bankName || !parsed.accountName || !parsed.accountNumber)) {
    throw new Error("Bank name, account holder name, and account number are required for a cash withdrawal.");
  }

  const info = await getReferralInfo();
  if (info.hasPendingWithdrawal) throw new Error("You already have a withdrawal request awaiting review.");
  if (parsed.amount < info.minWithdrawal) throw new Error(`The minimum withdrawal amount is Rs ${info.minWithdrawal}.`);
  if (parsed.amount > info.availableBalance) throw new Error("You cannot withdraw more than your available balance.");

  await prisma.affiliateWithdrawal.create({
    data: {
      userId,
      amount: parsed.amount,
      method: parsed.method,
      bankName: parsed.method === "Cash" ? parsed.bankName : "",
      accountName: parsed.method === "Cash" ? parsed.accountName : "",
      accountNumber: parsed.method === "Cash" ? parsed.accountNumber : "",
    },
  });

  revalidatePath("/refer");
  revalidatePath("/super-admin/affiliates");
}
