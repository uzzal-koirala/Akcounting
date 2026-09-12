"use server";

import { randomUUID } from "node:crypto";

import { requireUserId } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { AI_CREDIT_ALLOWANCE, AI_CREDIT_PACKS, AI_CUSTOM_CREDIT_MAX, AI_CUSTOM_CREDIT_MIN, priceForCustomCredits, toPlanName } from "@/lib/plan";
import { getEsewaConfig, signEsewaFields, decodeEsewaResponse, verifyEsewaSignature } from "@/lib/esewa";

export type AiUsage = { balance: number; used: number; allowance: number };

export async function getMyAiUsage(): Promise<AiUsage> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiTokenBalance: true, aiTokensUsed: true, plan: true } });
  return { balance: user?.aiTokenBalance ?? 0, used: user?.aiTokensUsed ?? 0, allowance: AI_CREDIT_ALLOWANCE[toPlanName(user?.plan)] };
}

export async function initiateAiCreditPurchase(credits: number) {
  const userId = await requireUserId();
  const pack = AI_CREDIT_PACKS.find((item) => item.credits === credits);

  let orderCredits: number;
  let orderPrice: number;
  if (pack) {
    orderCredits = pack.credits;
    orderPrice = pack.price;
  } else {
    if (!Number.isInteger(credits) || credits < AI_CUSTOM_CREDIT_MIN || credits > AI_CUSTOM_CREDIT_MAX) {
      throw new Error(`Enter a custom amount between ${AI_CUSTOM_CREDIT_MIN} and ${AI_CUSTOM_CREDIT_MAX} credits.`);
    }
    orderCredits = credits;
    orderPrice = priceForCustomCredits(credits);
  }

  const paidCount = await prisma.payment.count({ where: { userId, status: "Complete" } });
  if (paidCount === 0) throw new Error("You're on a free trial. Please subscribe to a plan first before buying AI credits.");

  const { productCode, formUrl, appUrl } = getEsewaConfig();
  const transactionUuid = `aicredit-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await prisma.aiCreditOrder.create({
    data: { userId, credits: orderCredits, amount: orderPrice, transactionUuid, productCode, status: "Pending" },
  });

  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signature = signEsewaFields([["total_amount", String(orderPrice)], ["transaction_uuid", transactionUuid], ["product_code", productCode]]);

  return {
    formUrl,
    fields: {
      amount: String(orderPrice),
      tax_amount: "0",
      product_service_charge: "0",
      product_delivery_charge: "0",
      total_amount: String(orderPrice),
      transaction_uuid: transactionUuid,
      product_code: productCode,
      success_url: `${appUrl}/settings/ai-credits/esewa/success`,
      failure_url: `${appUrl}/settings/ai-credits/esewa/failure`,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export async function confirmAiCreditPurchase(data: string): Promise<{ ok: boolean }> {
  const payload = decodeEsewaResponse(data);
  if (!verifyEsewaSignature(payload)) return { ok: false };

  const order = await prisma.aiCreditOrder.findUnique({ where: { transactionUuid: payload.transaction_uuid } });
  if (!order) return { ok: false };
  if (order.status === "Complete") return { ok: true };

  if (payload.status !== "COMPLETE") {
    await prisma.aiCreditOrder.update({ where: { id: order.id }, data: { status: payload.status, refId: payload.transaction_code } });
    return { ok: false };
  }

  await prisma.$transaction([
    prisma.aiCreditOrder.update({ where: { id: order.id }, data: { status: "Complete", refId: payload.transaction_code } }),
    prisma.user.update({ where: { id: order.userId }, data: { aiTokenBalance: { increment: order.credits } } }),
  ]);
  return { ok: true };
}

export async function markAiCreditPurchaseFailed(transactionUuid: string | undefined) {
  if (!transactionUuid) return;
  await prisma.aiCreditOrder.updateMany({ where: { transactionUuid, status: "Pending" }, data: { status: "Failed" } });
}
