"use client";

import Link from "next/link";
import { Crown, Sparkles, X } from "lucide-react";

import { CURRENT_PLAN, type PlanName } from "@/lib/plan";

export function PremiumLockField({ label, message, onClick }: { label: string; message?: string; onClick: () => void }) {
  return (
    <div>
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-600">
        <span>{label}</span>
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-semibold text-amber-600"><Crown size={9} />Premium</span>
      </span>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-4 py-7 text-center transition hover:border-amber-300 hover:bg-amber-50"
      >
        <span className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-600"><Crown size={17} /></span>
        <span className="text-[9px] font-semibold text-amber-700">{message ?? "This is a Premium feature"}</span>
        <span className="text-[8px] text-amber-600/80">Tap to see upgrade options</span>
      </button>
    </div>
  );
}

export function UpgradeModal({ open, onClose, feature, reason = "locked", limit, plan = CURRENT_PLAN }: { open: boolean; onClose: () => void; feature: string; reason?: "locked" | "limit"; limit?: number; plan?: PlanName }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-600"><Crown size={20} /></span>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button>
        </div>
        <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{reason === "limit" ? `Upgrade for more ${feature}` : `Upgrade to unlock ${feature}`}</h2>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          {reason === "limit" ? (
            <>You&apos;re currently on the <span className="font-semibold text-slate-700">{plan}</span>, which is limited to {limit} {feature.toLowerCase()}. Upgrade to the Growth or Premium Package for a higher limit.</>
          ) : (
            <>You&apos;re currently on the <span className="font-semibold text-slate-700">{plan}</span>, which doesn&apos;t include {feature.toLowerCase()}. Upgrade to the Growth or Premium Package to unlock this and other advanced features.</>
          )}
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="h-10 flex-1 rounded-xl border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Maybe later</button>
          <Link href="/subscription" onClick={onClose} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 text-[10px] font-semibold text-white shadow-md shadow-amber-200 hover:bg-amber-600"><Sparkles size={13} />View plans</Link>
        </div>
      </div>
    </div>
  );
}
