import { listIncome } from "@/actions/income";
import { listExpenses } from "@/actions/expenses";
import { listSalaries } from "@/actions/salaries";
import { listLoanPayments } from "@/actions/loans";
import { getCalendarPreference, getBusinessCycle } from "@/actions/preferences";
import { ReportsPage } from "@/components/reports-page";

export default async function Page() {
  const [income, expenses, salaries, loanPayments, calendarPreference, businessCycle] = await Promise.all([listIncome(), listExpenses(), listSalaries(), listLoanPayments(), getCalendarPreference(), getBusinessCycle()]);
  return <ReportsPage initialIncome={income} initialExpenses={expenses} initialSalaries={salaries} initialLoanPayments={loanPayments} calendarPreference={calendarPreference} businessCycleStartDay={businessCycle.startDay} />;
}
