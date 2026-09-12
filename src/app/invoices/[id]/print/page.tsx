import { notFound } from "next/navigation";

import { getInvoice } from "@/actions/invoices";
import { getBusinessProfile } from "@/actions/business-profile";
import { InvoicePrintView } from "@/components/invoice-print-view";

export default async function InvoicePrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ download?: string }> }) {
  const { id } = await params;
  const { download } = await searchParams;
  const [invoice, business] = await Promise.all([getInvoice(id), getBusinessProfile()]);
  if (!invoice) notFound();
  return <InvoicePrintView invoice={invoice} business={business} autoDownload={download === "1"} />;
}
