import { listLoans, listLoanPayments } from "@/actions/loans";
import { getCalendarPreference } from "@/actions/preferences";
import { LoansPage } from "@/components/loans-page";

export default async function Page() {
  const [loans, payments, calendarPreference] = await Promise.all([listLoans(), listLoanPayments(), getCalendarPreference()]);
  return <LoansPage initialLoans={loans} initialPayments={payments} calendarPreference={calendarPreference} />;
}
