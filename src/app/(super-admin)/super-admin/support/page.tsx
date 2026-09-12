import { listAllSupportTickets } from "@/actions/admin-support";
import { SupportTicketsPage } from "@/components/support-tickets-page";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const tickets = await listAllSupportTickets();
  const { ticket } = await searchParams;
  return <SupportTicketsPage initialTickets={tickets} initialTicketId={ticket ?? null} />;
}
