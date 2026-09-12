"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import { useEffect, useRef, useState } from "react";

const BS_MONTHS = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"] as const;
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const SUPPORTED_YEARS = Object.keys(dateConfigMap).map(Number).sort((a, b) => a - b);
const MIN_YEAR = SUPPORTED_YEARS[0];
const MAX_YEAR = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];

function daysInBsMonth(year: number, month: number) {
  const row = dateConfigMap[String(year)];
  if (!row) return 30;
  return row[BS_MONTHS[month]];
}

function toAdIso(date: NepaliDate) {
  const ad = date.getAD();
  return `${ad.year}-${String(ad.month + 1).padStart(2, "0")}-${String(ad.date).padStart(2, "0")}`;
}

function fromAdIso(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  try {
    return NepaliDate.fromAD(new Date(year, month - 1, day));
  } catch {
    return null;
  }
}

const ACCENT = {
  violet: { ring: "border-violet-400", active: "bg-violet-700 text-white", today: "border-violet-400 text-violet-700", hover: "hover:bg-violet-50" },
  rose: { ring: "border-rose-400", active: "bg-rose-600 text-white", today: "border-rose-400 text-rose-700", hover: "hover:bg-rose-50" },
  teal: { ring: "border-teal-400", active: "bg-teal-700 text-white", today: "border-teal-400 text-teal-700", hover: "hover:bg-teal-50" },
} as const;

export function NepaliDatePicker({ name, defaultValue, accent = "violet", onChange }: { name: string; defaultValue?: string; accent?: keyof typeof ACCENT; onChange?: (adIso: string) => void }) {
  const initial = fromAdIso(defaultValue) ?? NepaliDate.now();
  const [selected, setSelected] = useState<NepaliDate>(initial);
  const [view, setView] = useState({ year: initial.getYear(), month: initial.getMonth() });
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const containerRef = useRef<HTMLDivElement>(null);
  const POPUP_WIDTH = 256;
  const today = NepaliDate.now();
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

  function changeMonth(delta: number) {
    let { year, month } = view;
    month += delta;
    if (month < 0) { month = 11; year -= 1; }
    else if (month > 11) { month = 0; year += 1; }
    if (year < MIN_YEAR || year > MAX_YEAR) return;
    setView({ year, month });
  }

  const dayCount = daysInBsMonth(view.year, view.month);
  const firstWeekday = new NepaliDate(view.year, view.month, 1).getDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={toAdIso(selected)} />
      <button
        type="button"
        onClick={(event) => {
          setView({ year: selected.getYear(), month: selected.getMonth() });
          const rect = event.currentTarget.getBoundingClientRect();
          setAlign(rect.left + POPUP_WIDTH > window.innerWidth - 8 ? "right" : "left");
          setOpen((current) => !current);
        }}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-800 outline-none transition ${open ? tones.ring : "hover:border-slate-300"}`}
      >
        <CalendarDays size={13} className="shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left">{selected.format("DD MMMM, YYYY")} B.S.</span>
      </button>
      {open && (
        <div className={`absolute z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronLeft size={14} /></button>
            <p className="text-[10px] font-semibold text-slate-800">{BS_MONTHS[view.month]} {view.year}</p>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronRight size={14} /></button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[8px] font-semibold text-slate-400">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />;
              const isSelected = selected.getYear() === view.year && selected.getMonth() === view.month && selected.getDate() === day;
              const isToday = today.getYear() === view.year && today.getMonth() === view.month && today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => { const next = new NepaliDate(view.year, view.month, day); setSelected(next); setOpen(false); onChange?.(toAdIso(next)); }}
                  className={`grid size-7 place-items-center rounded-md border text-[9px] font-medium transition ${isSelected ? `${tones.active} border-transparent` : isToday ? `bg-white ${tones.today}` : `border-transparent text-slate-600 ${tones.hover}`}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(today); setView({ year: today.getYear(), month: today.getMonth() }); setOpen(false); onChange?.(toAdIso(today)); }}
            className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today · {today.format("DD MMMM, YYYY")}
          </button>
        </div>
      )}
    </div>
  );
}
