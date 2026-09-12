import { listAllPayments } from "@/actions/admin-payments";
import { SuperAdminPaymentsPage } from "@/components/super-admin-payments-page";

export default async function PaymentsPage() {
  const summary = await listAllPayments();
  return <SuperAdminPaymentsPage summary={summary} />;
}
