import { listExpenses } from "@/actions/expenses";
import { listExpenseCategories } from "@/actions/expense-categories";
import { getCalendarPreference, getBusinessCycle } from "@/actions/preferences";
import { getCurrentPlan } from "@/actions/plan";
import { ExpensesPage } from "@/components/expenses-page";

export default async function Page() {
  const [records, categories, calendarPreference, plan, businessCycle] = await Promise.all([listExpenses(), listExpenseCategories(), getCalendarPreference(), getCurrentPlan(), getBusinessCycle()]);
  return <ExpensesPage initialRecords={records} initialCategories={categories} calendarPreference={calendarPreference} plan={plan} businessCycleStartDay={businessCycle.startDay} />;
}
