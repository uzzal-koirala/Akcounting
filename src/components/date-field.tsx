"use client";

import { NepaliDatePicker } from "@/components/nepali-date-picker";
import type { CalendarPreference } from "@/lib/calendar";

export function DateField({
  name,
  preference,
  defaultValue,
  value,
  onChange,
  accent = "violet",
  focusClassName = "focus:border-violet-400",
}: {
  name: string;
  preference: CalendarPreference;
  defaultValue?: string;
  value?: string;
  onChange?: (isoDate: string) => void;
  accent?: "violet" | "rose" | "teal";
  focusClassName?: string;
}) {
  if (preference === "BS") {
    return <NepaliDatePicker name={name} defaultValue={value ?? defaultValue} accent={accent} onChange={onChange} />;
  }
  if (onChange) {
    return <input required name={name} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none ${focusClassName}`} />;
  }
  return <input required name={name} type="date" defaultValue={defaultValue} className={`h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none ${focusClassName}`} />;
}
