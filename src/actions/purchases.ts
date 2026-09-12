"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { toPlanName, type PlanName } from "@/lib/plan";

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session.userId;
}

export type PurchaseRecord = {
  id: string;
  userId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  plan: PlanName;
  amount: number;
  transactionUuid: string;
  refId: string | null;
  status: string;
  purchasedAt: string;
  isRenewal: boolean;
};

export type PurchaseSummary = {
  purchases: PurchaseRecord[];
  totalRevenue: number;
  totalPurchases: number;
  uniqueBuyers: number;
  totalRenewals: number;
};

export async function listPurchases(): Promise<PurchaseSummary> {
  await requireAdminId();

  const payments = await prisma.payment.findMany({
    where: { status: "Complete" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      plan: true,
      amount: true,
      transactionUuid: true,
      refId: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  const seenBuyers = new Set<string>();
  // Payments are already sorted newest first, so walk oldest-to-newest to correctly mark each
  // buyer's first payment as a new purchase and every payment after it as a renewal.
  const chronological = [...payments].reverse();
  const isRenewalByPaymentId = new Map<string, boolean>();
  for (const payment of chronological) {
    isRenewalByPaymentId.set(payment.id, seenBuyers.has(payment.userId));
    seenBuyers.add(payment.userId);
  }

  const purchases: PurchaseRecord[] = payments
    .filter((payment) => payment.user)
    .map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      buyerName: payment.user!.name,
      buyerEmail: payment.user!.email,
      buyerPhone: payment.user!.phone,
      plan: toPlanName(payment.plan),
      amount: Number(payment.amount),
      transactionUuid: payment.transactionUuid,
      refId: payment.refId,
      status: payment.status,
      purchasedAt: payment.createdAt.toISOString(),
      isRenewal: isRenewalByPaymentId.get(payment.id) ?? false,
    }));

  return {
    purchases,
    totalRevenue: purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
    totalPurchases: purchases.length,
    uniqueBuyers: new Set(purchases.map((purchase) => purchase.userId)).size,
    totalRenewals: purchases.filter((purchase) => purchase.isRenewal).length,
  };
}
