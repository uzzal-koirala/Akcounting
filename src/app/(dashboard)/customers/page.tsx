import { listCustomers } from "@/actions/customers";
import { CustomersPage } from "@/components/customers-page";

export default async function Page() {
  const customers = await listCustomers();
  return <CustomersPage initialCustomers={customers} />;
}
