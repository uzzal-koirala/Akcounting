"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { toPlanName, type PlanName } from "@/lib/plan";

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session.userId;
}

export type AdminPaymentStatus = "Complete" | "Pending" | "Failed";
export type AdminPaymentRecord = {
  id: string;
  userId: string;
  buyerName: string;
  buyerEmail: string;
  plan: PlanName;
  amount: number;
  transactionUuid: string;
  productCode: string;
  refId: string | null;
  status: AdminPaymentStatus;
  isAdminGrant: boolean;
  date: string;
  dateISO: string;
};

export type AdminPaymentSummary = {
  payments: AdminPaymentRecord[];
  totalRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  monthChangePct: number | null;
  pendingAmount: number;
  completeCount: number;
  pendingCount: number;
  failedCount: number;
};

function toStatus(value: string): AdminPaymentStatus {
  return value === "Complete" || value === "Pending" ? value : "Failed";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });

export async function listAllPayments(): Promise<AdminPaymentSummary> {
  await requireAdminId();

  const rows = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      plan: true,
      amount: true,
      transactionUuid: true,
      productCode: true,
      refId: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const payments: AdminPaymentRecord[] = rows
    .filter((row) => row.user)
    .map((row) => ({
      id: row.id,
      userId: row.userId,
      buyerName: row.user!.name,
      buyerEmail: row.user!.email,
      plan: toPlanName(row.plan),
      amount: Number(row.amount),
      transactionUuid: row.transactionUuid,
      productCode: row.productCode,
      refId: row.refId,
      status: toStatus(row.status),
      isAdminGrant: row.productCode === "ADMIN-GRANT",
      date: dateFormatter.format(row.createdAt),
      dateISO: row.createdAt.toISOString().slice(0, 10),
    }));

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const complete = payments.filter((payment) => payment.status === "Complete");
  const totalRevenue = complete.reduce((sum, payment) => sum + payment.amount, 0);
  const monthRevenue = complete.filter((payment) => payment.dateISO.startsWith(thisMonthKey)).reduce((sum, payment) => sum + payment.amount, 0);
  const lastMonthRevenue = complete.filter((payment) => payment.dateISO.startsWith(lastMonthKey)).reduce((sum, payment) => sum + payment.amount, 0);
  const monthChangePct = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  const pending = payments.filter((payment) => payment.status === "Pending");
  const failed = payments.filter((payment) => payment.status === "Failed");

  return {
    payments,
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    monthChangePct,
    pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
    completeCount: complete.length,
    pendingCount: pending.length,
    failedCount: failed.length,
  };
}
