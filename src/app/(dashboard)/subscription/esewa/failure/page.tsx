import { redirect } from "next/navigation";

import { markEsewaPaymentFailed } from "@/actions/esewa";

export default async function EsewaFailurePage({ searchParams }: { searchParams: Promise<{ transaction_uuid?: string }> }) {
  const { transaction_uuid } = await searchParams;
  await markEsewaPaymentFailed(transaction_uuid);
  redirect("/subscription?paid=0");
}
