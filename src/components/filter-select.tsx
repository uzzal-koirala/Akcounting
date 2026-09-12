"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FilterOption = { value: string; label: string; count?: number; dot?: string };

export function FilterSelect({ options, value, onChange, className = "" }: { options: FilterOption[]; value: string; onChange: (value: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false); }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return <div ref={containerRef} className={`relative ${className}`}>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} className={`flex h-9 w-full items-center gap-2 rounded-lg border bg-white px-3 text-[9px] font-semibold outline-none transition ${open ? "border-violet-400" : "border-slate-200 hover:border-slate-300"}`}>
      {selected?.dot && <span className={`size-2 shrink-0 rounded-full ${selected.dot}`} />}
      <span className="flex-1 truncate text-left text-slate-700">{selected?.label ?? "All"}</span>
      {selected?.count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">{selected.count}</span>}
      <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      <div className="max-h-64 overflow-y-auto">
        {options.map((item) => { const active = item.value === value; return <button key={item.value} type="button" role="option" aria-selected={active} onClick={() => { onChange(item.value); setOpen(false); }} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[10px] font-medium transition ${active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
          {item.dot && <span className={`size-2 shrink-0 rounded-full ${item.dot}`} />}
          <span className="flex-1 truncate">{item.label}</span>
          {item.count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">{item.count}</span>}
          {active && <Check size={13} className="shrink-0 text-violet-600" />}
        </button>; })}
      </div>
    </div>}
  </div>;
}
