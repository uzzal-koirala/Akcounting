import { listSalaries } from "@/actions/salaries";
import { getCalendarPreference } from "@/actions/preferences";
import { SalariesPage } from "@/components/salaries-page";

export default async function Page() {
  const [records, calendarPreference] = await Promise.all([listSalaries(), getCalendarPreference()]);
  return <SalariesPage initialRecords={records} calendarPreference={calendarPreference} />;
}
