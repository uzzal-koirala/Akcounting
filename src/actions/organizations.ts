"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { AI_CREDIT_ALLOWANCE, type PlanName } from "@/lib/plan";
import { isAccountLocked } from "@/lib/account-lock";
import { passwordError } from "@/lib/password";
import { LIVE_TONES, toMockPlanTier, type Organization, type OrgStatus, type OrgMember, type OrgInvoice, type OrgTicket } from "@/lib/mock-organizations";

const REAL_PLAN_BY_TIER: Record<Organization["plan"], PlanName> = { Starter: "Starter Package", Growth: "Growth Package", Business: "Premium Package" };

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session.userId;
}

const CYCLE_DAYS = 30;
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function computeSubscriptionState(input: { hasChosenPlan: boolean; expired: boolean; hasPaid: boolean; lastPaymentAt: Date | null; latestExtensionAt: Date | null }): Organization["subscriptionState"] {
  const { hasChosenPlan, expired, hasPaid, lastPaymentAt, latestExtensionAt } = input;
  if (!hasChosenPlan) return "Not started";
  const isOnFreeExtension = !expired && Boolean(latestExtensionAt) && (!lastPaymentAt || latestExtensionAt!.getTime() > lastPaymentAt.getTime());
  if (expired) return "Expired";
  if (isOnFreeExtension) return "Extended";
  if (hasPaid) return "Subscribed";
  return "Trial";
}

function buildOrganization(
  user: { id: string; name: string; email: string; phone: string | null; plan: string; createdAt: Date; status: string; suspendReason: string; planRenewsAt: Date | null; lockedAt: Date | null },
  businessProfile: { tradingName: string; legalName: string; email: string; phone: string; address: string; panVat: string } | null,
  monthlyPrice: number,
  index: number,
  extensionRows: { id: string; days: number; createdAt: Date }[] = [],
  memberCount = 1,
  subscriptionState: Organization["subscriptionState"] = "Trial",
  firstPaymentAt: Date | null = null,
): Organization {
  const name = businessProfile?.tradingName || businessProfile?.legalName || user.name;
  const now = Date.now();
  // A user who hasn't picked a plan yet (blocked behind the mandatory plan-picker gate) has no
  // real planRenewsAt — don't fabricate a 30-day countdown or show a plan/price for them.
  const hasChosenPlan = Boolean(user.planRenewsAt);
  const daysLeft = hasChosenPlan ? Math.max(0, Math.ceil((user.planRenewsAt!.getTime() - now) / (1000 * 60 * 60 * 24))) : 0;

  return {
    id: `user_${user.id}`,
    name,
    initials: initialsOf(name),
    owner: user.name,
    email: businessProfile?.email || user.email,
    phone: businessProfile?.phone || user.phone || "—",
    address: businessProfile?.address || "—",
    panVat: businessProfile?.panVat || "—",
    plan: toMockPlanTier(user.plan),
    status: (user.status === "Suspended" ? "Suspended" : "Active") as OrgStatus,
    members: memberCount,
    // Only counts as real recurring revenue once they're actually paying — a chosen-but-unpaid
    // trial plan shouldn't be reported as revenue anywhere in the admin dashboard.
    mrr: subscriptionState === "Subscribed" || subscriptionState === "Extended" ? monthlyPrice : 0,
    joined: dateFormatter.format(user.createdAt),
    renewsOn: hasChosenPlan ? dateFormatter.format(user.planRenewsAt!) : "Not started",
    subscriptionDate: firstPaymentAt ? dateFormatter.format(firstPaymentAt) : null,
    daysLeft,
    totalDays: CYCLE_DAYS,
    tone: LIVE_TONES[index % LIVE_TONES.length],
    suspendReason: user.suspendReason || undefined,
    isLive: true,
    isLocked: isAccountLocked(user.lockedAt),
    extensions: extensionRows.map((extension) => ({ id: extension.id, days: extension.days, extendedAt: extension.createdAt.toISOString(), endsAt: new Date(extension.createdAt.getTime() + extension.days * 24 * 60 * 60 * 1000).toISOString() })),
    subscriptionState,
  };
}

const liveUserSelect = { id: true, name: true, email: true, phone: true, plan: true, createdAt: true, status: true, suspendReason: true, planRenewsAt: true, lockedAt: true, businessProfile: { select: { tradingName: true, legalName: true, email: true, phone: true, address: true, panVat: true } } } as const;

export async function listLiveOrganizations(): Promise<Organization[]> {
  await requireAdminId();
  const [users, plans, memberCounts, paymentStats, extensionStats] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "admin" } }, orderBy: { createdAt: "desc" }, select: liveUserSelect }),
    prisma.plan.findMany({ select: { name: true, monthlyPrice: true } }),
    prisma.teamMember.groupBy({ by: ["ownerId"], where: { status: { not: "Suspended" } }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["userId"], where: { status: "Complete" }, _max: { createdAt: true }, _min: { createdAt: true } }),
    prisma.subscriptionExtension.groupBy({ by: ["userId"], _max: { createdAt: true } }),
  ]);

  const priceByPlan = new Map(plans.map((plan) => [plan.name, plan.monthlyPrice]));
  const memberCountByOwner = new Map(memberCounts.map((row) => [row.ownerId, row._count._all]));
  const lastPaymentByUser = new Map(paymentStats.map((row) => [row.userId, row._max.createdAt]));
  const firstPaymentByUser = new Map(paymentStats.map((row) => [row.userId, row._min.createdAt]));
  const latestExtensionByUser = new Map(extensionStats.map((row) => [row.userId, row._max.createdAt]));

  return users.map((user, index) => {
    const expired = Boolean(user.planRenewsAt && user.planRenewsAt.getTime() < Date.now());
    const lastPaymentAt = lastPaymentByUser.get(user.id) ?? null;
    const subscriptionState = computeSubscriptionState({ hasChosenPlan: Boolean(user.planRenewsAt), expired, hasPaid: lastPaymentByUser.has(user.id), lastPaymentAt, latestExtensionAt: latestExtensionByUser.get(user.id) ?? null });
    return buildOrganization(user, user.businessProfile, priceByPlan.get(user.plan) ?? 0, index, [], 1 + (memberCountByOwner.get(user.id) ?? 0), subscriptionState, firstPaymentByUser.get(user.id) ?? null);
  });
}

export type SubscriptionMetrics = { organizationCount: number; activeSubscriptions: number; trialCount: number; planDistribution: { name: Organization["plan"]; value: number; percent: number }[] };

export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  await requireAdminId();
  const users = await prisma.user.findMany({ where: { role: { not: "admin" } }, select: { id: true, plan: true } });
  const organizationCount = users.length;

  const paidUserIds = await prisma.payment.findMany({ where: { status: "Complete", userId: { in: users.map((user) => user.id) } }, distinct: ["userId"], select: { userId: true } });
  const activeSubscriptions = paidUserIds.length;

  const counts = { Starter: 0, Growth: 0, Business: 0 } as Record<Organization["plan"], number>;
  for (const user of users) counts[toMockPlanTier(user.plan)] += 1;
  const planDistribution = (Object.keys(counts) as Organization["plan"][])
    .map((name) => ({ name, value: counts[name], percent: organizationCount > 0 ? Math.round((counts[name] / organizationCount) * 100) : 0 }))
    .filter((row) => row.value > 0);

  return { organizationCount, activeSubscriptions, trialCount: organizationCount - activeSubscriptions, planDistribution };
}

export async function getLiveOrganization(userId: string): Promise<Organization | null> {
  await requireAdminId();
  const [user, plans, extensionRows, memberCount, lastPayment, firstPayment] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: liveUserSelect }),
    prisma.plan.findMany({ select: { name: true, monthlyPrice: true } }),
    prisma.subscriptionExtension.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, days: true, createdAt: true } }),
    prisma.teamMember.count({ where: { ownerId: userId, status: { not: "Suspended" } } }),
    prisma.payment.findFirst({ where: { userId, status: "Complete" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.payment.findFirst({ where: { userId, status: "Complete" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  if (!user) return null;
  const priceByPlan = new Map(plans.map((plan) => [plan.name, plan.monthlyPrice]));
  const expired = Boolean(user.planRenewsAt && user.planRenewsAt.getTime() < Date.now());
  const subscriptionState = computeSubscriptionState({ hasChosenPlan: Boolean(user.planRenewsAt), expired, hasPaid: Boolean(lastPayment), lastPaymentAt: lastPayment?.createdAt ?? null, latestExtensionAt: extensionRows[0]?.createdAt ?? null });
  return buildOrganization(user, user.businessProfile, priceByPlan.get(user.plan) ?? 0, 0, extensionRows, 1 + memberCount, subscriptionState, firstPayment?.createdAt ?? null);
}

export type OrganizationDetail = { members: OrgMember[]; invoices: OrgInvoice[]; tickets: OrgTicket[] };

export async function getOrganizationDetail(userId: string): Promise<OrganizationDetail> {
  await requireAdminId();

  const [owner, teamMembers, payments, tickets] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.teamMember.findMany({ where: { ownerId: userId, status: { not: "Suspended" } }, orderBy: { createdAt: "asc" }, select: { name: true, email: true, role: true } }),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, amount: true, status: true, productCode: true, createdAt: true } }),
    prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, subject: true, status: true, priority: true, createdAt: true } }),
  ]);

  const members: OrgMember[] = [
    ...(owner ? [{ name: owner.name, role: "Owner", email: owner.email, initials: initialsOf(owner.name) }] : []),
    ...teamMembers.map((member) => ({ name: member.name, role: member.role, email: member.email, initials: initialsOf(member.name) })),
  ];

  const invoices: OrgInvoice[] = payments.map((payment) => ({
    id: `PAY-${payment.id.slice(-6).toUpperCase()}`,
    date: dateFormatter.format(payment.createdAt),
    amount: Number(payment.amount),
    status: payment.status === "Complete" ? "Paid" : payment.status === "Pending" ? "Pending" : "Failed",
    method: payment.productCode === "ADMIN-GRANT" ? "Admin granted" : "eSewa",
  }));

  const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  function relativeTime(date: Date) {
    const diffMs = date.getTime() - Date.now();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours) < 24) return relativeTimeFormatter.format(diffHours, "hour");
    return relativeTimeFormatter.format(Math.round(diffHours / 24), "day");
  }

  const orgTickets: OrgTicket[] = tickets.map((ticket) => ({
    id: `TKT-${ticket.id.slice(-6).toUpperCase()}`,
    subject: ticket.subject,
    raisedBy: owner?.name ?? "—",
    status: (["Open", "In progress", "Resolved"].includes(ticket.status) ? ticket.status : "Open") as OrgTicket["status"],
    priority: (["High", "Medium", "Low"].includes(ticket.priority) ? ticket.priority : "Medium") as OrgTicket["priority"],
    time: relativeTime(ticket.createdAt),
  }));

  return { members, invoices, tickets: orgTickets };
}

export async function createOrganizationAccount(input: { owner: string; email: string; password: string; phone: string; tradingName: string; address: string; panVat: string }) {
  await requireAdminId();
  const owner = input.owner.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  const phone = input.phone.trim();
  const tradingName = input.tradingName.trim();

  if (!owner) throw new Error("Owner name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const pwError = passwordError(password);
  if (pwError) throw new Error(pwError);
  if (!phone) throw new Error("Phone number is required.");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: owner,
      email,
      phone,
      passwordHash,
      // Provisioned directly by a trusted super admin, not self-registered — no need to make
      // them click an email-verification link before they can use the account.
      emailVerifiedAt: new Date(),
      ...(tradingName || input.address.trim() || input.panVat.trim()
        ? { businessProfile: { create: { tradingName, email, phone, address: input.address.trim(), panVat: input.panVat.trim() } } }
        : {}),
    },
  });

  revalidatePath("/super-admin/organizations");
  return `user_${user.id}`;
}

export async function updateOrganizationDetails(userId: string, input: { owner: string; email: string; phone: string; address: string; panVat: string }) {
  await requireAdminId();
  const owner = input.owner.trim();
  if (!owner) throw new Error("Owner name is required.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name: owner, phone: input.phone.trim() || null } }),
    prisma.businessProfile.upsert({
      where: { userId },
      update: { email: input.email.trim(), phone: input.phone.trim(), address: input.address.trim(), panVat: input.panVat.trim() },
      create: { userId, email: input.email.trim(), phone: input.phone.trim(), address: input.address.trim(), panVat: input.panVat.trim() },
    }),
  ]);

  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
}

export async function deleteOrganizationAccount(userId: string, adminPassword: string) {
  const adminId = await requireAdminId();
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { passwordHash: true } });
  if (!admin) throw new Error("Your admin account could not be found.");
  const passwordMatches = await bcrypt.compare(adminPassword, admin.passwordHash);
  if (!passwordMatches) throw new Error("Incorrect password. Please try again.");

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/super-admin/organizations");
}

export async function suspendUser(userId: string, reason: string) {
  await requireAdminId();
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error("A suspension reason is required.");
  await prisma.user.update({ where: { id: userId }, data: { status: "Suspended", suspendReason: trimmedReason } });
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
}

export async function reactivateUser(userId: string) {
  await requireAdminId();
  await prisma.user.update({ where: { id: userId }, data: { status: "Active", suspendReason: "" } });
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
}

export async function updateUserCredentials(userId: string, input: { email?: string; password?: string }) {
  await requireAdminId();

  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim();

  if (!email && !password) throw new Error("Enter a new email or password to update.");

  const data: { email?: string; passwordHash?: string } = {};

  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing && existing.id !== userId) throw new Error("Another account already uses this email address.");
    data.email = email;
  }

  if (password) {
    const pwError = passwordError(password);
    if (pwError) throw new Error(pwError);
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
}

export async function unlockUser(userId: string) {
  await requireAdminId();
  await prisma.user.update({ where: { id: userId }, data: { lockedAt: null, failedLoginAttempts: 0 } });
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
}

export async function extendLiveSubscription(userId: string, days: number) {
  await requireAdminId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { planRenewsAt: true, createdAt: true } });
  if (!user) throw new Error("User not found.");
  const base = user.planRenewsAt && user.planRenewsAt.getTime() > Date.now() ? user.planRenewsAt : new Date();
  const planRenewsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.subscriptionExtension.create({ data: { userId, days } }),
    prisma.user.update({ where: { id: userId }, data: { planRenewsAt } }),
  ]);
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
  revalidatePath("/subscription");
  revalidatePath("/settings");
}

// Admin-granted subscriptions are recorded as a real, completed Payment (not just a plan/date bump)
// so the user's trial banner, billing history, and MRR reporting all treat it as an actual paid
// subscription instead of leaving paidPaymentCount at 0 and showing "you're on a free trial" forever.
export async function setLiveSubscription(userId: string, planTier: Organization["plan"]) {
  await requireAdminId();
  const plan = REAL_PLAN_BY_TIER[planTier];
  const planRenewsAt = new Date(Date.now() + CYCLE_DAYS * 24 * 60 * 60 * 1000);
  const planRow = await prisma.plan.findUnique({ where: { name: plan }, select: { monthlyPrice: true } });
  const amount = planRow?.monthlyPrice ?? 0;
  const transactionUuid = `admin-${userId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { plan, planRenewsAt, status: "Active", suspendReason: "", aiTokenBalance: AI_CREDIT_ALLOWANCE[plan], aiTokensUsed: 0 } }),
    prisma.payment.create({ data: { userId, plan, amount, transactionUuid, productCode: "ADMIN-GRANT", status: "Complete" } }),
  ]);
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/user_${userId}`);
  revalidatePath("/subscription");
  revalidatePath("/settings");
}
