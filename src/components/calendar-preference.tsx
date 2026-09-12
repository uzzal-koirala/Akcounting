"use client";

import { Calendar, Check, Globe } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { setCalendarPreference, setBusinessCycle, type BusinessCycle } from "@/actions/preferences";
import type { CalendarPreference } from "@/lib/calendar";

const OPTIONS: { id: CalendarPreference; title: string; subtitle: string; sample: string; icon: typeof Calendar }[] = [
  { id: "AD", title: "English calendar", subtitle: "Gregorian (A.D.) dates", sample: "Aug 30, 2026", icon: Globe },
  { id: "BS", title: "Nepali calendar", subtitle: "Bikram Sambat (B.S.) dates", sample: "Bha 14, 2083 B.S.", icon: Calendar },
];

function ordinal(day: number) {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function clampDay(value: number) {
  return Math.min(31, Math.max(1, Math.round(value)));
}

export function CalendarPreferenceSettings({ initialPreference, initialCycle }: { initialPreference: CalendarPreference; initialCycle: BusinessCycle }) {
  const router = useRouter();
  const [preference, setPreference] = useState(initialPreference);
  const [pending, setPending] = useState(false);
  const [cycle, setCycle] = useState(initialCycle);
  const [startInput, setStartInput] = useState(String(initialCycle.startDay));
  const [endInput, setEndInput] = useState(String(initialCycle.endDay));
  const [cyclePending, setCyclePending] = useState(false);
  const [cycleSaved, setCycleSaved] = useState(false);
  const [cycleError, setCycleError] = useState("");

  async function choose(next: CalendarPreference) {
    if (next === preference || pending) return;
    setPreference(next);
    setPending(true);
    try {
      await setCalendarPreference(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function updateCycle(next: BusinessCycle) {
    setCycle(next);
    setStartInput(String(next.startDay));
    setEndInput(String(next.endDay));
    setCycleError("");
    setCyclePending(true);
    try {
      await setBusinessCycle(next.startDay, next.endDay);
      setCycleSaved(true);
      window.setTimeout(() => setCycleSaved(false), 1800);
      router.refresh();
    } finally {
      setCyclePending(false);
    }
  }

  function commitStartDay() {
    const parsed = Number(startInput);
    if (!Number.isFinite(parsed) || startInput.trim() === "") { setCycleError("Enter a day between 1 and 31."); setStartInput(String(cycle.startDay)); return; }
    updateCycle({ ...cycle, startDay: clampDay(parsed) });
  }

  function commitEndDay() {
    const parsed = Number(endInput);
    if (!Number.isFinite(parsed) || endInput.trim() === "") { setCycleError("Enter a day between 1 and 31."); setEndInput(String(cycle.endDay)); return; }
    updateCycle({ ...cycle, endDay: clampDay(parsed) });
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Calendar size={15} /></span>
        <div><h2 className="text-sm font-semibold text-slate-900">Calendar</h2><p className="text-[8px] text-slate-400">Choose how dates are shown and picked throughout AKCounting</p></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = preference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              onClick={() => choose(option.id)}
              className={`relative rounded-2xl border-2 p-4 text-left transition disabled:cursor-wait ${active ? "border-violet-500 bg-violet-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              {active && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-violet-600 text-white"><Check size={13} strokeWidth={3} /></span>}
              <span className={`grid size-10 place-items-center rounded-xl ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}><Icon size={17} /></span>
              <p className="mt-3 text-[11px] font-semibold text-slate-800">{option.title}</p>
              <p className="mt-0.5 text-[8px] text-slate-400">{option.subtitle}</p>
              <p className="mt-3 inline-block rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600">{option.sample}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[8px] leading-4 text-slate-500">This applies everywhere a date appears — income, expenses, salaries, invoices, and date pickers — across the whole workspace.</p>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <div><h3 className="text-[11px] font-semibold text-slate-800">Business cycle dates</h3><p className="mt-0.5 text-[8px] text-slate-400">Some businesses run their month from the 1st, others from the 7th or any other date — set the start and end day yours uses</p></div>
          {cycleSaved && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-600"><Check size={10} strokeWidth={3} />Saved</span>}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-semibold text-slate-500">Cycle start day</span>
            <input
              type="number"
              min={1}
              max={31}
              disabled={cyclePending}
              value={startInput}
              onChange={(event) => setStartInput(event.target.value)}
              onBlur={commitStartDay}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-semibold text-slate-500">Cycle end day</span>
            <input
              type="number"
              min={1}
              max={31}
              disabled={cyclePending}
              value={endInput}
              onChange={(event) => setEndInput(event.target.value)}
              onBlur={commitEndDay}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
            />
          </label>
        </div>
        {cycleError && <p className="mt-2 text-[8px] font-medium text-rose-500">{cycleError}</p>}
        <p className="mt-3 rounded-xl bg-violet-50/60 px-3 py-2.5 text-[9px] font-semibold text-violet-700">Your business month runs from the {ordinal(cycle.startDay)} to the {ordinal(cycle.endDay)}{cycle.endDay < cycle.startDay ? " of the next month" : ""}.</p>
      </div>
    </section>
  );
}
