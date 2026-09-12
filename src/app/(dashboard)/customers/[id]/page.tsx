import { notFound } from "next/navigation";

import { getCustomer } from "@/actions/customers";
import { listDuesForContact } from "@/actions/dues";
import { CustomerProfile } from "@/components/customer-profile";

export default async function CustomerProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, dues] = await Promise.all([getCustomer(id), listDuesForContact(id)]);
  if (!customer) notFound();
  return <CustomerProfile customer={customer} dues={dues} />;
}
