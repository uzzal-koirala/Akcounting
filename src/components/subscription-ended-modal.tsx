"use client";

import { AlertTriangle, Check, Clock3, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { extendMySubscriptionFree } from "@/actions/subscription";

type Reason = "subscription" | "trial";

export function SubscriptionEndedModal({ reason, canExtend, onClose, onExtended }: { reason: Reason; canExtend: boolean; onClose: () => void; onExtended: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const isTrial = reason === "trial";

  function handleExtend() {
    setError("");
    startTransition(async () => {
      try {
        await extendMySubscriptionFree();
        onExtended();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not extend your subscription. Please try again.");
      }
    });
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0b0714] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 size-56 rounded-full bg-amber-500/15 blur-3xl" />

      <div className={`relative mx-auto grid size-14 place-items-center rounded-2xl shadow-lg ring-1 ring-white/10 ${isTrial ? "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-900/40" : "bg-gradient-to-br from-amber-300 to-yellow-500 shadow-amber-900/40"}`}>
        {isTrial ? <AlertTriangle size={24} className="text-white" /> : <Clock3 size={24} className="text-amber-950" />}
      </div>

      <span className={`relative mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${isTrial ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : "border-amber-400/30 bg-amber-500/10 text-amber-300"}`}>
        {isTrial ? "Free trial ended" : "Subscription ended"}
      </span>

      <h2 className="relative mt-3 text-lg font-semibold text-white">{isTrial ? "Your free trial has ended" : "Your subscription has ended"}</h2>
      <p className="relative mt-2 text-[11px] leading-5 text-slate-400">
        {isTrial
          ? "Choose a subscription plan below to keep using your AKCounting workspace."
          : "Renew your plan below to regain access, or extend for 3 days free while you decide."}
      </p>

      {error && <p role="alert" className="relative mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10px] font-medium text-rose-300">{error}</p>}

      <div className="relative mt-5 flex flex-col gap-2">
        {!isTrial && canExtend && <button onClick={handleExtend} disabled={isPending} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isPending ? "Extending..." : "Extend for 3 days free"}
        </button>}
        <button onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-400 hover:to-violet-600">
          <Check size={14} />Choose a plan below
        </button>
      </div>

      {!isTrial && !canExtend && <p className="relative mt-4 text-[9px] text-slate-500">You&apos;ve already used your free extension for this billing cycle.</p>}
    </div>
  </div>;
}
