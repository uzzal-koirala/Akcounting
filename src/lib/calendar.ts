import NepaliDate, { dateConfigMap } from "nepali-date-converter";

export type CalendarPreference = "AD" | "BS";

// Extracts the calendar date using local (wall-clock) getters, matching NepaliDate.fromAD and
// NepaliDatePicker's AD-ISO output — using toISOString() here would shift the date by the
// server's UTC offset and break date filters (e.g. entering 22 Bhadra but needing to filter 21).
export function toLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: Date, preference: CalendarPreference): string {
  if (preference === "BS") {
    try {
      return `${NepaliDate.fromAD(date).format("MMM DD, YYYY")} B.S.`;
    } catch {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const AD_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const BS_MONTH_NAMES = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

// Generates "<Month> <Year>" labels for a month picker, newest first, matching the selected calendar.
export function recentMonthOptions(preference: CalendarPreference, count: number): { label: string; key: string }[] {
  const options: { label: string; key: string }[] = [];
  if (preference === "BS") {
    const now = NepaliDate.now();
    let year = now.getYear();
    let month = now.getMonth();
    for (let i = 0; i < count; i++) {
      options.push({ label: `${BS_MONTH_NAMES[month]} ${year}`, key: `${year}-${String(month + 1).padStart(2, "0")}` });
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return options;
  }
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  for (let i = 0; i < count; i++) {
    options.push({ label: `${AD_MONTH_NAMES[month]} ${year}`, key: `${year}-${String(month + 1).padStart(2, "0")}` });
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
  }
  return options;
}

function daysInBsMonth(year: number, month: number) {
  const row = dateConfigMap[String(year)];
  if (!row) return 30;
  return row[BS_MONTH_NAMES[month] as keyof typeof row] as number;
}

// Computes the default "from"/"to" filter range (as AD ISO strings) from the user's business-cycle
// start day (Settings → Calendar/Financial Period): from = the start day in the current month/year
// of the active calendar, clamped to today if the cycle hasn't started yet; to = today.
export function getDefaultDateRange(preference: CalendarPreference, startDay: number): { from: string; to: string } {
  if (preference === "BS") {
    const today = NepaliDate.now();
    const day = Math.min(Math.max(1, startDay), daysInBsMonth(today.getYear(), today.getMonth()));
    const from = day > today.getDate() ? today : new NepaliDate(today.getYear(), today.getMonth(), day);
    const ad = from.getAD();
    const toAd = today.getAD();
    return {
      from: `${ad.year}-${String(ad.month + 1).padStart(2, "0")}-${String(ad.date).padStart(2, "0")}`,
      to: `${toAd.year}-${String(toAd.month + 1).padStart(2, "0")}-${String(toAd.date).padStart(2, "0")}`,
    };
  }
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const day = Math.min(Math.max(1, startDay), daysInMonth);
  const from = day > today.getDate() ? today : new Date(today.getFullYear(), today.getMonth(), day);
  return { from: toLocalDateISO(from), to: toLocalDateISO(today) };
}

// Converts a "<Month> <Year>" label (in either calendar) back to a sortable "YYYY-MM" key.
export function monthLabelToKey(label: string, preference: CalendarPreference): string {
  const trimmed = label.trim();
  if (preference === "BS") {
    const [name, year] = trimmed.split(/\s+/);
    const index = BS_MONTH_NAMES.findIndex((month) => month === name);
    if (index === -1 || !year) return "";
    return `${year}-${String(index + 1).padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}
