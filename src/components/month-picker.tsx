"use client";

import { dateConfigMap } from "nepali-date-converter";
import NepaliDate from "nepali-date-converter";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AD_MONTH_NAMES, BS_MONTH_NAMES, monthLabelToKey, type CalendarPreference } from "@/lib/calendar";

const BS_YEARS = Object.keys(dateConfigMap).map(Number).sort((a, b) => a - b);
const BS_MIN_YEAR = BS_YEARS[0];
const BS_MAX_YEAR = BS_YEARS[BS_YEARS.length - 1];
const AD_MIN_YEAR = new Date().getFullYear() - 8;
const AD_MAX_YEAR = new Date().getFullYear() + 2;

const ACCENT = {
  violet: { active: "bg-violet-700 text-white", ring: "border-violet-400", hover: "hover:bg-violet-50", today: "border-violet-400 text-violet-700" },
  teal: { active: "bg-teal-700 text-white", ring: "border-teal-400", hover: "hover:bg-teal-50", today: "border-teal-400 text-teal-700" },
} as const;

function currentYearMonth(preference: CalendarPreference) {
  if (preference === "BS") { const now = NepaliDate.now(); return { year: now.getYear(), month: now.getMonth() }; }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function keyToYearMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month: month - 1 };
}

function toKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  preference,
  value,
  defaultValue,
  name,
  onChange,
  accent = "violet",
  placeholder = "Select month",
  allowClear = false,
}: {
  preference: CalendarPreference;
  /** Controlled mode: current value as a "YYYY-MM" key (empty string = none selected). */
  value?: string;
  /** Uncontrolled form mode: initial value as a "<Month> <Year>" label, submitted via a hidden input named `name`. */
  defaultValue?: string;
  name?: string;
  onChange?: (result: { key: string; label: string }) => void;
  accent?: keyof typeof ACCENT;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const monthNames = preference === "BS" ? BS_MONTH_NAMES : AD_MONTH_NAMES;
  const minYear = preference === "BS" ? BS_MIN_YEAR : AD_MIN_YEAR;
  const maxYear = preference === "BS" ? BS_MAX_YEAR : AD_MAX_YEAR;
  const fallback = currentYearMonth(preference);

  const isUncontrolled = value === undefined;
  const initialKey = isUncontrolled && defaultValue ? monthLabelToKey(defaultValue, preference) : "";
  const [internalKey, setInternalKey] = useState(initialKey);
  const activeKey = isUncontrolled ? internalKey : value ?? "";
  const selected = keyToYearMonth(activeKey);

  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const [viewYear, setViewYear] = useState(selected?.year ?? fallback.year);
  const containerRef = useRef<HTMLDivElement>(null);
  const tones = ACCENT[accent];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    setViewYear(selected?.year ?? fallback.year);
    const rect = event.currentTarget.getBoundingClientRect();
    setAlign(rect.left + 260 > window.innerWidth - 8 ? "right" : "left");
    setOpen((current) => !current);
  }

  function commit(key: string, label: string) {
    if (isUncontrolled) setInternalKey(key);
    onChange?.({ key, label });
    setOpen(false);
  }

  function pick(month: number) {
    commit(toKey(viewYear, month), `${monthNames[month]} ${viewYear}`);
  }

  const label = selected ? `${monthNames[selected.month]} ${selected.year}` : placeholder;

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={selected ? label : ""} />}
      <button
        type="button"
        onClick={toggle}
        className={`flex h-9 w-full items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-medium transition ${open ? tones.ring : "border-slate-200 hover:border-slate-300"} ${selected ? "text-slate-700" : "text-slate-400"}`}
      >
        <Calendar size={12} className="shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left">{label}</span>
      </button>
      {open && (
        <div className={`absolute z-30 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setViewYear((y) => Math.max(minYear, y - 1))} disabled={viewYear <= minYear} aria-label="Previous year" className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <p className="text-[11px] font-semibold text-slate-800">{viewYear}</p>
            <button type="button" onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))} disabled={viewYear >= maxYear} aria-label="Next year" className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {monthNames.map((monthName, index) => {
              const isSelected = selected?.year === viewYear && selected.month === index;
              const isCurrent = fallback.year === viewYear && fallback.month === index;
              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => pick(index)}
                  className={`rounded-lg border px-1 py-2 text-[9px] font-medium transition ${isSelected ? `${tones.active} border-transparent` : isCurrent ? `bg-white ${tones.today}` : `border-transparent text-slate-600 ${tones.hover}`}`}
                >
                  {monthName.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <button type="button" onClick={() => { setViewYear(fallback.year); commit(toKey(fallback.year, fallback.month), `${monthNames[fallback.month]} ${fallback.year}`); }} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">This month</button>
            {allowClear && <button type="button" onClick={() => commit("", "")} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-50">Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
