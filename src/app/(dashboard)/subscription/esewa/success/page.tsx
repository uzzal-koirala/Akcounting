import { redirect } from "next/navigation";

import { confirmEsewaPayment } from "@/actions/esewa";

export default async function EsewaSuccessPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  if (!data) redirect("/subscription?paid=0");

  const result = await confirmEsewaPayment(data);
  redirect(result.ok ? "/subscription?paid=1" : "/subscription?paid=0");
}
