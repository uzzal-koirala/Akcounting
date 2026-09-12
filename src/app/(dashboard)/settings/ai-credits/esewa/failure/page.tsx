import { redirect } from "next/navigation";

import { markAiCreditPurchaseFailed } from "@/actions/ai-usage";

export default async function AiCreditEsewaFailurePage({ searchParams }: { searchParams: Promise<{ transaction_uuid?: string }> }) {
  const { transaction_uuid } = await searchParams;
  await markAiCreditPurchaseFailed(transaction_uuid);
  redirect("/settings?tab=ai&aiCredits=0");
}
