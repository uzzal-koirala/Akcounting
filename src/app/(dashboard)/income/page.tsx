import { listIncome } from "@/actions/income";
import { getCalendarPreference, getBusinessCycle } from "@/actions/preferences";
import { getCurrentPlan } from "@/actions/plan";
import { IncomePage } from "@/components/income-page";

export default async function Page() {
  const [records, calendarPreference, plan, businessCycle] = await Promise.all([listIncome(), getCalendarPreference(), getCurrentPlan(), getBusinessCycle()]);
  return <IncomePage initialRecords={records} calendarPreference={calendarPreference} plan={plan} businessCycleStartDay={businessCycle.startDay} />;
}
