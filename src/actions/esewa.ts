"use server";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getEsewaConfig, signEsewaFields, decodeEsewaResponse, verifyEsewaSignature } from "@/lib/esewa";
import { toPlanName, AI_CREDIT_ALLOWANCE, type PlanName } from "@/lib/plan";
import { creditReferralReward } from "@/actions/referral";

export async function initiateEsewaPayment(planNameInput: string) {
  const userId = await requireUserId();
  const plan: PlanName = toPlanName(planNameInput);
  const planRow = await prisma.plan.findUnique({ where: { name: plan }, select: { monthlyPrice: true } });
  const amount = planRow?.monthlyPrice ?? 0;
  const { productCode, formUrl, appUrl } = getEsewaConfig();

  const transactionUuid = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  await prisma.payment.create({
    data: { userId, plan, amount, transactionUuid, productCode, status: "Pending" },
  });

  const totalAmount = amount;
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signature = signEsewaFields([["total_amount", String(totalAmount)], ["transaction_uuid", transactionUuid], ["product_code", productCode]]);

  return {
    formUrl,
    fields: {
      amount: String(amount),
      tax_amount: "0",
      product_service_charge: "0",
      product_delivery_charge: "0",
      total_amount: String(totalAmount),
      transaction_uuid: transactionUuid,
      product_code: productCode,
      success_url: `${appUrl}/subscription/esewa/success`,
      failure_url: `${appUrl}/subscription/esewa/failure`,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export async function confirmEsewaPayment(data: string) {
  const payload = decodeEsewaResponse(data);
  if (!verifyEsewaSignature(payload)) {
    return { ok: false as const, reason: "invalid_signature" as const };
  }
  const payment = await prisma.payment.findUnique({ where: { transactionUuid: payload.transaction_uuid } });
  if (!payment) return { ok: false as const, reason: "not_found" as const };

  if (payload.status !== "COMPLETE") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: payload.status, refId: payload.transaction_code } });
    return { ok: false as const, reason: "not_complete" as const };
  }

  const planRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const plan = toPlanName(payment.plan);
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "Complete", refId: payload.transaction_code } }),
    prisma.user.update({ where: { id: payment.userId }, data: { plan, planRenewsAt, aiTokenBalance: AI_CREDIT_ALLOWANCE[plan], aiTokensUsed: 0 } }),
  ]);
  await creditReferralReward(payment.userId);
  return { ok: true as const, plan: payment.plan };
}

export async function markEsewaPaymentFailed(transactionUuid: string | undefined) {
  if (!transactionUuid) return;
  await prisma.payment.updateMany({ where: { transactionUuid, status: "Pending" }, data: { status: "Failed" } });
}
