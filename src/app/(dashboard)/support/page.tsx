import { listSupportTickets } from "@/actions/support";
import { SupportPage } from "@/components/support-page";

export default async function SupportRoute() {
  const tickets = await listSupportTickets();
  return <SupportPage initialTickets={tickets} />;
}
