"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Received: { dot: "bg-emerald-500", text: "text-emerald-700" },
  Paid: { dot: "bg-emerald-500", text: "text-emerald-700" },
  Pending: { dot: "bg-amber-500", text: "text-amber-700" },
  Processing: { dot: "bg-blue-500", text: "text-blue-700" },
};
const FALLBACK_STYLE = { dot: "bg-slate-400", text: "text-slate-600" };

const ACCENT = {
  violet: { ring: "border-violet-400", active: "bg-violet-50" },
  rose: { ring: "border-rose-400", active: "bg-rose-50" },
  teal: { ring: "border-teal-400", active: "bg-teal-50" },
} as const;

export function StatusSelect<T extends string>({ name, options, defaultValue, accent = "violet" }: { name: string; options: readonly T[]; defaultValue?: T; accent?: keyof typeof ACCENT }) {
  const [value, setValue] = useState<T>(defaultValue ?? options[0]);
  const [open, setOpen] = useState(false);
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

  const style = STATUS_STYLES[value] ?? FALLBACK_STYLE;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none transition ${open ? tones.ring : "hover:border-slate-300"}`}
      >
        <span className={`size-2 shrink-0 rounded-full ${style.dot}`} />
        <span className={`flex-1 truncate text-left ${style.text}`}>{value}</span>
        <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {options.map((option) => {
            const optionStyle = STATUS_STYLES[option] ?? FALLBACK_STYLE;
            const active = value === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setValue(option); setOpen(false); }}
                className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[10px] font-semibold transition ${active ? tones.active : "hover:bg-slate-50"} ${optionStyle.text}`}
              >
                <span className={`size-2 shrink-0 rounded-full ${optionStyle.dot}`} />
                <span className="flex-1 text-left">{option}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
