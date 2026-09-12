import { listInvoices } from "@/actions/invoices";
import { listContacts } from "@/actions/contacts";
import { getBusinessProfile } from "@/actions/business-profile";
import { getCalendarPreference } from "@/actions/preferences";
import { InvoicesPage } from "@/components/invoices-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const [invoices, contacts, business, calendarPreference, { customer }] = await Promise.all([listInvoices(), listContacts(), getBusinessProfile(), getCalendarPreference(), searchParams]);
  return <InvoicesPage initialInvoices={invoices} initialContacts={contacts} business={business} calendarPreference={calendarPreference} presetContactId={customer} />;
}
