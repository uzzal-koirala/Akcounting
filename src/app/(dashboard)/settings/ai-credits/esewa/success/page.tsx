import { redirect } from "next/navigation";

import { confirmAiCreditPurchase } from "@/actions/ai-usage";

export default async function AiCreditEsewaSuccessPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  if (!data) redirect("/settings?tab=ai&aiCredits=0");

  const result = await confirmAiCreditPurchase(data);
  redirect(result.ok ? "/settings?tab=ai&aiCredits=1" : "/settings?tab=ai&aiCredits=0");
}
