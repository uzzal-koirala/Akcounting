import { listPurchases } from "@/actions/purchases";
import { SuperAdminPurchasesPage } from "@/components/super-admin-purchases-page";

export default async function PurchasedPage() {
  const summary = await listPurchases();
  return <SuperAdminPurchasesPage summary={summary} />;
}
