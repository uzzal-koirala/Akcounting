import { listDues } from "@/actions/dues";
import { listContacts } from "@/actions/contacts";
import { getCalendarPreference } from "@/actions/preferences";
import { DuesPage } from "@/components/dues-page";

export default async function DuesRoute({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const [dues, contacts, calendarPreference] = await Promise.all([listDues(), listContacts(), getCalendarPreference()]);
  const { customer } = await searchParams;
  const customers = contacts.filter((contact) => contact.type === "Client");
  return <DuesPage initialDues={dues} contacts={customers} initialContactId={customer ?? null} calendarPreference={calendarPreference} />;
}
