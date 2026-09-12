"use client";

import { Banknote, Check, ChevronDown, Landmark, ReceiptText, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";

const METHOD_META: Record<PaymentMethod, { icon: typeof Smartphone; tone: string }> = {
  eSewa: { icon: Smartphone, tone: "bg-emerald-50 text-emerald-600" },
  Khalti: { icon: Smartphone, tone: "bg-violet-50 text-violet-600" },
  "Bank transfer": { icon: Landmark, tone: "bg-blue-50 text-blue-600" },
  Cash: { icon: Banknote, tone: "bg-amber-50 text-amber-600" },
  Cheque: { icon: ReceiptText, tone: "bg-slate-100 text-slate-600" },
  Other: { icon: Sparkles, tone: "bg-rose-50 text-rose-600" },
};

const ACCENT = {
  indigo: { ring: "border-indigo-400", active: "bg-indigo-50" },
  violet: { ring: "border-violet-400", active: "bg-violet-50" },
  rose: { ring: "border-rose-400", active: "bg-rose-50" },
} as const;

function isPaymentMethod(value: string | undefined): value is PaymentMethod {
  return !!value && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function PaymentMethodSelect({
  name,
  required,
  defaultValue,
  accent = "indigo",
}: {
  name: string;
  required?: boolean;
  defaultValue?: string;
  accent?: keyof typeof ACCENT;
}) {
  const [value, setValue] = useState<PaymentMethod | "">(isPaymentMethod(defaultValue) ? defaultValue : "");
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

  const selectedMeta = value ? METHOD_META[value] : null;
  const SelectedIcon = selectedMeta?.icon;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium outline-none transition ${open ? tones.ring : "hover:border-slate-300"}`}
      >
        {SelectedIcon ? <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${selectedMeta.tone}`}><SelectedIcon size={13} /></span> : <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><ChevronDown size={13} /></span>}
        <span className={`flex-1 truncate text-left ${value ? "text-slate-700" : "text-slate-400"}`}>{value || "Select a payment method"}</span>
        <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {PAYMENT_METHODS.map((method) => {
            const meta = METHOD_META[method];
            const Icon = meta.icon;
            const active = value === method;
            return (
              <button
                key={method}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setValue(method); setOpen(false); }}
                className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium transition ${active ? tones.active : "hover:bg-slate-50"}`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${meta.tone}`}><Icon size={14} /></span>
                <span className="flex-1 text-left text-slate-700">{method}</span>
                {active && <Check size={14} className="text-indigo-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
