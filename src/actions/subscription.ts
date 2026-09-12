"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isPlanExpired, daysUntil } from "@/lib/subscription";
import { planLimits, toPlanName, isPlanName, AI_CREDIT_ALLOWANCE, type PlanName } from "@/lib/plan";
import { formatDisplayDate, toLocalDateISO } from "@/lib/calendar";

const FREE_EXTENSION_DAYS = 3;
const NEW_TRIAL_DAYS = 7;

// Lets a brand-new (never-paid) account pick which plan they want to try, starting a fresh
// 7-day free trial on that plan without charging anything — used by the mandatory plan-picker
// gate the dashboard layout shows until a user has chosen a plan.
export async function startFreeTrial(planNameInput: string) {
  const userId = await requireUserId();
  if (!isPlanName(planNameInput)) throw new Error("Select a valid plan.");

  const paidCount = await prisma.payment.count({ where: { userId, status: "Complete" } });
  if (paidCount > 0) throw new Error("You already have a paid subscription. Manage it from Settings instead.");

  const planRenewsAt = new Date(Date.now() + NEW_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { plan: planNameInput, planRenewsAt, aiTokenBalance: AI_CREDIT_ALLOWANCE[planNameInput], aiTokensUsed: 0 } });

  revalidatePath("/", "layout");
  revalidatePath("/subscription");
  revalidatePath("/settings");
  return { plan: planNameInput, planRenewsAt: planRenewsAt.toISOString() };
}

export type ExtensionRecord = { id: string; days: number; extendedAt: string; endsAt: string; extendedAtLabel?: string; endsAtLabel?: string };
export type MySubscriptionStatus = {
  isExpired: boolean;
  hasPaid: boolean;
  canExtend: boolean;
  planRenewsAt: string | null;
  extensions: ExtensionRecord[];
  isOnFreeExtension: boolean;
};

export async function getMySubscriptionStatus(): Promise<MySubscriptionStatus> {
  const userId = await requireUserId();

  const [user, paidCount, lastPayment, extensions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { planRenewsAt: true } }),
    prisma.payment.count({ where: { userId, status: "Complete" } }),
    prisma.payment.findFirst({ where: { userId, status: "Complete" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.subscriptionExtension.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, days: true, createdAt: true } }),
  ]);

  const hasPaid = paidCount > 0;
  const expired = isPlanExpired(user?.planRenewsAt);
  const latestExtension = extensions[0];
  const usedExtensionThisCycle = lastPayment ? extensions.some((extension) => extension.createdAt.getTime() > lastPayment.createdAt.getTime()) : extensions.length > 0;
  const isOnFreeExtension = !expired && Boolean(latestExtension) && (!lastPayment || latestExtension.createdAt.getTime() > lastPayment.createdAt.getTime());

  return {
    isExpired: expired,
    hasPaid,
    canExtend: hasPaid && expired && !usedExtensionThisCycle,
    planRenewsAt: user?.planRenewsAt?.toISOString() ?? null,
    extensions: extensions.map((extension) => ({ id: extension.id, days: extension.days, extendedAt: extension.createdAt.toISOString(), endsAt: new Date(extension.createdAt.getTime() + extension.days * 24 * 60 * 60 * 1000).toISOString() })),
    isOnFreeExtension,
  };
}

export type MyPaymentRecord = {
  id: string;
  invoice: string;
  plan: PlanName;
  amount: number;
  method: string;
  status: string;
  date: string;
  dateISO: string;
};

export type MySubscriptionOverview = {
  plan: PlanName;
  planPrice: number;
  status: "Active" | "Trial" | "Expired";
  planRenewsAt: string | null;
  planRenewsAtLabel: string | null;
  daysLeft: number;
  cycleDays: number;
  percentElapsed: number;
  memberSince: string;
  successfulPayments: number;
  teamSeatsUsed: number;
  teamSeatsLimit: number;
  documentsUsed: number;
  documentsLimit: number;
  hasPaid: boolean;
  isOnFreeExtension: boolean;
  extensions: ExtensionRecord[];
  payments: MyPaymentRecord[];
};

const CYCLE_DAYS = 30;

export async function getMySubscriptionOverview(): Promise<MySubscriptionOverview> {
  const userId = await requireUserId();

  const [user, paymentRows, teamMemberCount, documentCount, extensionRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planRenewsAt: true, createdAt: true, calendarPreference: true } }),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, plan: true, amount: true, transactionUuid: true, productCode: true, status: true, createdAt: true } }),
    prisma.teamMember.count({ where: { ownerId: userId, status: { not: "Invited" } } }),
    prisma.document.count({ where: { userId } }),
    prisma.subscriptionExtension.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, days: true, createdAt: true } }),
  ]);

  const plan = toPlanName(user?.plan);
  const calendarPreference = user?.calendarPreference === "BS" ? "BS" : "AD";
  const planRow = await prisma.plan.findUnique({ where: { name: plan }, select: { monthlyPrice: true } });
  const limits = planLimits(plan);
  const completePayments = paymentRows.filter((row) => row.status === "Complete");
  const hasPaid = completePayments.length > 0;
  const lastPayment = completePayments[0];
  const expired = isPlanExpired(user?.planRenewsAt);

  const isOnFreeExtension = !expired && extensionRows.length > 0 && (!lastPayment || extensionRows[0].createdAt.getTime() > lastPayment.createdAt.getTime());
  const status: MySubscriptionOverview["status"] = expired ? "Expired" : hasPaid || isOnFreeExtension ? "Active" : "Trial";

  const daysLeft = daysUntil(user?.planRenewsAt);
  const percentElapsed = user?.planRenewsAt ? Math.min(100, Math.max(0, Math.round(((CYCLE_DAYS - daysLeft) / CYCLE_DAYS) * 100))) : 0;

  const payments: MyPaymentRecord[] = paymentRows.map((row) => ({
    id: row.id,
    invoice: `BILL-${row.createdAt.getFullYear()}-${row.id.slice(-6).toUpperCase()}`,
    plan: toPlanName(row.plan),
    amount: Number(row.amount),
    method: row.productCode === "ADMIN-GRANT" ? "Admin granted" : "eSewa",
    status: row.status,
    date: formatDisplayDate(row.createdAt, calendarPreference),
    dateISO: toLocalDateISO(row.createdAt),
  }));

  return {
    plan,
    planPrice: planRow?.monthlyPrice ?? 0,
    status,
    planRenewsAt: user?.planRenewsAt?.toISOString() ?? null,
    planRenewsAtLabel: user?.planRenewsAt ? formatDisplayDate(user.planRenewsAt, calendarPreference) : null,
    daysLeft,
    cycleDays: CYCLE_DAYS,
    percentElapsed,
    memberSince: user?.createdAt ? formatDisplayDate(user.createdAt, calendarPreference) : "—",
    successfulPayments: completePayments.length,
    teamSeatsUsed: teamMemberCount + 1,
    teamSeatsLimit: limits.maxTeamMembers,
    documentsUsed: documentCount,
    documentsLimit: limits.maxDocuments,
    hasPaid,
    isOnFreeExtension,
    extensions: extensionRows.map((extension) => { const endsAt = new Date(extension.createdAt.getTime() + extension.days * 24 * 60 * 60 * 1000); return { id: extension.id, days: extension.days, extendedAt: extension.createdAt.toISOString(), endsAt: endsAt.toISOString(), extendedAtLabel: formatDisplayDate(extension.createdAt, calendarPreference), endsAtLabel: formatDisplayDate(endsAt, calendarPreference) }; }),
    payments,
  };
}

export async function extendMySubscriptionFree() {
  const userId = await requireUserId();
  const status = await getMySubscriptionStatus();

  if (!status.hasPaid) throw new Error("Free extensions are only available for previously paid subscriptions.");
  if (!status.isExpired) throw new Error("Your subscription is still active.");
  if (!status.canExtend) throw new Error("You've already used your free extension for this billing cycle.");

  const planRenewsAt = new Date(Date.now() + FREE_EXTENSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.subscriptionExtension.create({ data: { userId, days: FREE_EXTENSION_DAYS } }),
    prisma.user.update({ where: { id: userId }, data: { planRenewsAt } }),
  ]);

  revalidatePath("/subscription");
  revalidatePath("/settings");
  return { planRenewsAt: planRenewsAt.toISOString() };
}
