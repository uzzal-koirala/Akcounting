"use client";

import { Bot, Check, Crown, Loader2, MessageCircle, Plus, Sparkles, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { initiateAiCreditPurchase, type AiUsage } from "@/actions/ai-usage";
import { AI_CREDIT_PACKS, AI_CUSTOM_CREDIT_MAX, AI_CUSTOM_CREDIT_MIN, priceForCustomCredits } from "@/lib/plan";
import { AI_ASSISTANT_STORAGE_KEY, AI_ASSISTANT_TOGGLE_EVENT } from "@/lib/ai-assistant-preference";

const PACK_LABELS: Record<number, string> = { 200: "Small top-up", 1000: "Most popular", 5000: "Best value" };

const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;

export function AiUsageSettings({ initialUsage, purchaseStatus = null }: { initialUsage: AiUsage; purchaseStatus?: "success" | "failed" | null }) {
  const [usage] = useState(initialUsage);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customPending, setCustomPending] = useState(false);
  const [manualError, setManualError] = useState("");
  const [trialGateOpen, setTrialGateOpen] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState<{ credits: number; price: number; isCustom: boolean } | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const [formAction, setFormAction] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string> | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setAiAssistantEnabled(localStorage.getItem(AI_ASSISTANT_STORAGE_KEY) !== "off"), 0); return () => window.clearTimeout(timer); }, []);

  function toggleAiAssistant() {
    const next = !aiAssistantEnabled;
    setAiAssistantEnabled(next);
    localStorage.setItem(AI_ASSISTANT_STORAGE_KEY, next ? "on" : "off");
    window.dispatchEvent(new Event(AI_ASSISTANT_TOGGLE_EVENT));
  }

  const error = manualError || (purchaseStatus === "failed" ? "Your AI credit purchase was not completed. Please try again." : "");
  const notice = purchaseStatus === "success" ? "AI credits added to your balance." : "";
  function setError(message: string) { setManualError(message); }

  const totalCapacity = usage.balance + usage.used;
  const usedPercent = totalCapacity > 0 ? Math.min(100, Math.round((usage.used / totalCapacity) * 100)) : 0;
  const isLow = usage.balance <= Math.max(2, Math.round(usage.allowance * 0.15));

  function buyCredits(credits: number) {
    setConfirmPurchase(null);
    setPendingCredits(credits);
    setError("");
    initiateAiCreditPurchase(credits)
      .then(({ formUrl, fields }) => {
        setFormAction(formUrl);
        setFormFields(fields);
        requestAnimationFrame(() => formRef.current?.submit());
      })
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "Could not start the eSewa checkout. Please try again.";
        if (message.toLowerCase().includes("subscribe")) {
          setTrialGateOpen(true);
        } else {
          setError(message);
        }
        setPendingCredits(null);
      });
  }

  const customCredits = Number(customAmount);
  const customValid = Number.isInteger(customCredits) && customCredits >= AI_CUSTOM_CREDIT_MIN && customCredits <= AI_CUSTOM_CREDIT_MAX;

  function buyCustomCredits() {
    if (!customValid) return;
    setConfirmPurchase(null);
    setCustomPending(true);
    setError("");
    initiateAiCreditPurchase(customCredits)
      .then(({ formUrl, fields }) => {
        setFormAction(formUrl);
        setFormFields(fields);
        requestAnimationFrame(() => formRef.current?.submit());
      })
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "Could not start the eSewa checkout. Please try again.";
        if (message.toLowerCase().includes("subscribe")) {
          setTrialGateOpen(true);
        } else {
          setError(message);
        }
        setCustomPending(false);
      });
  }

  return <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
    <article className="relative overflow-hidden rounded-2xl bg-[#081b3a] p-6 text-white shadow-xl shadow-slate-200">
      <div className="absolute -right-20 -top-24 size-64 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-400/15 px-3 py-1.5 text-[8px] font-semibold text-violet-200"><Bot size={11} />AI ASSISTANT USAGE</span>
        <div className="mt-4 flex items-end gap-2"><h2 className="text-3xl font-semibold tracking-tight">{usage.balance}</h2><span className="mb-1 text-[10px] text-slate-300">credits remaining</span></div>
        <p className="mt-2 max-w-md text-[10px] leading-5 text-slate-300">Credits power every question you ask the AKCounting AI assistant about your income, expenses, invoices, and reports. Your plan includes {usage.allowance} free credits.</p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${isLow ? "bg-rose-400" : "bg-gradient-to-r from-violet-500 to-fuchsia-400"}`} style={{ width: `${Math.max(usedPercent, 3)}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-[8px] text-slate-400"><span>{usage.used} used</span><span>{totalCapacity} total</span></div>

        {isLow && <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-[9px] font-medium text-rose-200"><Zap size={12} />Running low — buy more credits below to avoid interruptions.</div>}
      </div>
    </article>

    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Sparkles size={17} /></span><div><h2 className="text-sm font-semibold text-slate-900">Buy more credits</h2><p className="mt-0.5 text-[8px] text-slate-400">Pay securely with eSewa and top up instantly</p></div></div>
      <div className="mt-4 space-y-2.5">{AI_CREDIT_PACKS.map((pack) => <button key={pack.credits} disabled={pendingCredits !== null || customPending} onClick={() => setConfirmPurchase({ credits: pack.credits, price: pack.price, isCustom: false })} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-60">
        <div><p className="text-[11px] font-semibold text-slate-800">+{pack.credits} credits</p><p className="mt-0.5 text-[8px] text-slate-400">{PACK_LABELS[pack.credits] ?? "AI credit pack"} · {money(pack.price)}</p></div>
        <span className="flex h-8 w-24 items-center justify-center gap-1 rounded-lg bg-[#60bb46] text-[9px] font-semibold text-white">{pendingCredits === pack.credits ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={11} />Buy</>}</span>
      </button>)}</div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-[10px] font-semibold text-slate-700">Custom amount</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center gap-1.5 rounded-lg border border-slate-200 px-3 focus-within:border-violet-300"><input type="number" min={AI_CUSTOM_CREDIT_MIN} max={AI_CUSTOM_CREDIT_MAX} value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="e.g. 30" className="w-full min-w-0 bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400" /><span className="shrink-0 text-[9px] font-medium text-slate-400">credits</span></div>
          <button disabled={!customValid || pendingCredits !== null || customPending} onClick={() => setConfirmPurchase({ credits: customCredits, price: priceForCustomCredits(customCredits), isCustom: true })} className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#60bb46] px-4 text-[9px] font-semibold text-white transition disabled:opacity-50">{customPending ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={11} />Buy</>}</button>
        </div>
        <p className="mt-1.5 text-[8px] text-slate-400">{customAmount && customValid ? `${customCredits} credits for ${money(priceForCustomCredits(customCredits))}` : `Any amount from ${AI_CUSTOM_CREDIT_MIN} to ${AI_CUSTOM_CREDIT_MAX} credits, Rs 20 per credit.`}</p>
      </div>

      {notice && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[9px] font-medium text-emerald-700"><Check size={11} />{notice}</p>}
      {error && <p role="alert" className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600"><X size={11} className="shrink-0" />{error}</p>}
    </article>

    <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500"><MessageCircle size={17} /></span>
        <div className="flex-1"><h2 className="text-sm font-semibold text-slate-900">Floating AI assistant</h2><p className="mt-0.5 text-[8px] text-slate-400">Show or hide the floating chat icon across the app</p></div>
        <Toggle checked={aiAssistantEnabled} onChange={toggleAiAssistant} />
      </div>
    </article>

    {formAction && formFields && <form ref={formRef} action={formAction} method="POST" className="hidden">
      {Object.entries(formFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </form>}

    {confirmPurchase && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmPurchase(null); }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Sparkles size={24} /></span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">Confirm your purchase</h2>
          <p className="mt-2 text-[12px] leading-5 text-slate-500">You&apos;re about to add <b className="text-slate-800">{confirmPurchase.credits} credits</b> at <b className="text-slate-800">{money(confirmPurchase.price)}</b>. You&apos;ll be redirected to eSewa to complete payment.</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirmPurchase(null)} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => confirmPurchase.isCustom ? buyCustomCredits() : buyCredits(confirmPurchase.credits)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#60bb46] text-[10px] font-semibold text-white hover:brightness-95">Continue to eSewa</button>
          </div>
        </div>
      </div>
    </div>}

    {trialGateOpen && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setTrialGateOpen(false); }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 to-fuchsia-700 px-6 py-7 text-center text-white">
          <button type="button" onClick={() => setTrialGateOpen(false)} className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X size={15} /></button>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/25"><Crown size={24} /></span>
          <h2 className="mt-4 text-lg font-semibold">Subscribe to buy AI credits</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-[11px] leading-5 text-slate-500">You&apos;re currently on a free trial. AI credit top-ups are only available once you&apos;ve subscribed to a paid plan.</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setTrialGateOpen(false)} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Not now</button>
            <Link href="/subscription" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 text-[10px] font-semibold text-white shadow-md shadow-violet-200 hover:bg-violet-700"><Sparkles size={13} />View plans</Link>
          </div>
        </div>
      </div>
    </div>}
  </section>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) { return <button type="button" onClick={onChange} aria-pressed={checked} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-violet-600" : "bg-slate-200"}`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button>; }
