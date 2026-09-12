"use client";

import { BadgeCheck, Check, ChevronRight, Crown, Headphones, Infinity, Loader2, ReceiptText, ShieldCheck, Sparkles, Users, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { initiateEsewaPayment } from "@/actions/esewa";
import type { PlanRecord } from "@/actions/plans";
import type { PlanName } from "@/lib/plan";
import { SubscriptionEndedModal } from "@/components/subscription-ended-modal";

const PLAN_STYLE: Record<PlanName, { color: string; icon: typeof WalletCards; premium: boolean; popular: boolean }> = {
  "Starter Package": { color: "slate", icon: WalletCards, premium: false, popular: false },
  "Growth Package": { color: "violet", icon: Sparkles, premium: false, popular: true },
  "Premium Package": { color: "navy", icon: Crown, premium: true, popular: false },
};

export function SubscriptionPage({ currentPlan, plans, paidStatus, endedReason, canExtend, isExpired, hasPaid, trialDaysLeft }: { currentPlan: PlanName; plans: PlanRecord[]; paidStatus: "success" | "failed" | null; endedReason: "subscription" | "trial" | null; canExtend: boolean; isExpired: boolean; hasPaid: boolean; trialDaysLeft: number | null }) {
  const router = useRouter();
  const [annual, setAnnual] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanRecord | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formAction, setFormAction] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string> | null>(null);
  const [extendedNotice, setExtendedNotice] = useState(false);
  const price = (monthly: number) => annual ? Math.round(monthly * 0.8) : monthly;

  // Derived straight from the `ended` search param rather than local state: a client-side
  // transition back to /subscription?ended=... (e.g. clicking a sidebar link while blocked)
  // reuses this component instance rather than remounting it, so the modal needs to open
  // whenever this prop is truthy and close itself the moment the param is cleared.
  const endedModalOpen = Boolean(endedReason);

  useEffect(() => {
    if (!extendedNotice) return;
    const timer = window.setTimeout(() => setExtendedNotice(false), 3500);
    return () => window.clearTimeout(timer);
  }, [extendedNotice]);

  function closeEndedModal() {
    router.replace("/subscription");
  }

  function handleExtended() {
    setExtendedNotice(true);
    router.replace("/subscription");
    router.refresh();
  }

  async function payWithEsewa(plan: PlanName) {
    setRedirecting(true);
    setCheckoutError(null);
    try {
      const { formUrl, fields } = await initiateEsewaPayment(plan);
      setFormAction(formUrl);
      setFormFields(fields);
      requestAnimationFrame(() => formRef.current?.submit());
    } catch {
      setCheckoutError("Could not start the eSewa checkout. Please try again.");
      setRedirecting(false);
    }
  }

  return <div className="mx-auto max-w-7xl pb-10">
    {paidStatus && <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-semibold ${paidStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{paidStatus === "success" ? <Check size={14} /> : <X size={14} />}{paidStatus === "success" ? "Payment successful — your plan has been upgraded." : "Payment was not completed. Your plan is unchanged."}</div>}
    {trialDaysLeft !== null && <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] font-semibold text-amber-800"><Sparkles size={14} className="shrink-0" />You&apos;re on a free trial of the <b>{currentPlan}</b> — {trialDaysLeft === 0 ? "ends today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}. Subscribe anytime to keep your plan after it ends.</div>}

    <header className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50 to-blue-50 px-6 py-8 shadow-[0_12px_40px_rgba(99,102,241,0.10)] sm:px-9">
      <div className="absolute -right-20 -top-24 size-72 rounded-full bg-violet-200/50 blur-3xl" /><div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_360px] lg:items-center"><div><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-violet-700 shadow-sm"><Sparkles size={12} />Simple plans for every business</span><h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">The right tools to manage your finances with confidence.</h1><p className="mt-3 max-w-xl text-xs leading-6 text-slate-600">Choose a package that fits your business today. Upgrade whenever your team, documents, or reporting needs grow.</p>{currentPlan !== "Growth Package" && <button onClick={() => setCheckoutPlan(plans.find((p) => p.name === "Growth Package") ?? null)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-violet-600 px-5 text-[11px] font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700">Explore Growth <ChevronRight size={14} /></button>}</div><div className="rounded-xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/70 backdrop-blur"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-lg bg-violet-100 text-violet-700"><Crown size={20} /></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">Secure eSewa checkout</span></div><p className="mt-5 text-[10px] font-semibold text-slate-500">Available across our plans</p><div className="mt-3 grid grid-cols-2 gap-2">{[[Infinity, "More entries"], [Users, "Team access"], [ReceiptText, "Smart reports"], [Headphones, "Helpful support"]].map(([Icon, label]) => { const ItemIcon = Icon as typeof Infinity; return <div key={label as string} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3"><ItemIcon size={14} className="text-violet-600" /><span className="text-[9px] font-semibold text-slate-600">{label as string}</span></div>; })}</div></div></div>
    </header>

    <section className="mt-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Simple, transparent pricing</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Choose the plan that fits you</h2><p className="mt-1 text-[11px] text-slate-500">No hidden fees. Upgrade, downgrade, or cancel whenever you need.</p></div><div className="flex w-fit items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm"><button onClick={() => setAnnual(false)} className={`h-9 rounded-md px-4 text-[10px] font-semibold transition ${!annual ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Monthly</button><button onClick={() => setAnnual(true)} className={`flex h-9 items-center gap-2 rounded-md px-4 text-[10px] font-semibold transition ${annual ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Yearly <span className={annual ? "text-violet-100" : "text-emerald-600"}>Save 20%</span></button></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">{plans.map((plan) => {
        const style = PLAN_STYLE[plan.name] ?? PLAN_STYLE["Starter Package"];
        const Icon = style.icon;
        const isCurrent = !isExpired && plan.name === currentPlan && hasPaid;
        const isOnTrial = trialDaysLeft !== null && plan.name === currentPlan && !isCurrent;
        const monthly = plan.monthlyPrice;
        if (style.premium) {
          return <article key={plan.name} className={`relative flex flex-col overflow-hidden rounded-2xl border p-5 text-white shadow-xl transition hover:-translate-y-1 ${isCurrent ? "border-emerald-400" : "border-amber-400/60 shadow-amber-900/30"}`} style={{ background: "radial-gradient(120% 140% at 100% 0%, #3a2c05 0%, #0b0d16 55%, #05060a 100%)" }}>
            <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-amber-300/20" />
            {isCurrent ? <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-600 px-3 py-1.5 text-[8px] font-semibold text-white">CURRENT PLAN</div> : isOnTrial ? <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-amber-500 px-3 py-1.5 text-[8px] font-bold text-amber-950"><Sparkles size={10} />{trialDaysLeft} DAY{trialDaysLeft === 1 ? "" : "S"} TRIAL LEFT</div> : <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-1.5 text-[8px] font-bold text-amber-950"><Crown size={10} />PREMIUM</div>}
            <span className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-lg shadow-amber-900/40"><Icon size={19} /></span>
            <h3 className="relative mt-4 text-lg font-semibold text-amber-50">{plan.name}</h3>
            <p className="relative mt-1 min-h-8 text-[9px] leading-4 text-amber-100/60">{plan.description}</p>
            <div className="relative mt-5 flex items-end gap-1"><span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">Rs {price(monthly).toLocaleString()}</span><span className="pb-1 text-[9px] text-amber-100/50">/ month</span></div>
            {annual && <p className="relative mt-1 text-[8px] font-medium text-amber-300">Billed yearly · save Rs {(monthly * 12 - price(monthly) * 12).toLocaleString()}</p>}
            <button onClick={() => !isCurrent && setCheckoutPlan(plan)} disabled={isCurrent} className={`relative mt-5 h-10 rounded-xl text-[9px] font-bold ${isCurrent ? "cursor-not-allowed border border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "bg-gradient-to-r from-amber-300 to-yellow-400 text-amber-950 shadow-md shadow-amber-900/40 hover:from-amber-200 hover:to-yellow-300"}`}>{isCurrent ? <span className="flex items-center justify-center gap-1.5"><Check size={12} strokeWidth={3} />Your current plan</span> : "Choose Premium"}</button>
            <div className="relative my-5 border-t border-amber-200/10" />
            <p className="relative text-[9px] font-semibold uppercase tracking-wider text-amber-200/50">What&apos;s included</p>
            <ul className="relative mt-3 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-[11px] font-semibold text-amber-50/90"><BadgeCheck size={16} strokeWidth={2.4} className="shrink-0 fill-sky-400 text-white" />{feature}</li>)}</ul>
          </article>;
        }
        return <article key={plan.name} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl ${isCurrent ? "border-emerald-400 shadow-lg shadow-emerald-100" : isOnTrial ? "border-amber-400 shadow-lg shadow-amber-100" : style.popular ? "border-violet-500 shadow-lg shadow-violet-100" : "border-slate-200"}`}>{isCurrent ? <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-600 px-3 py-1.5 text-[8px] font-semibold text-white">CURRENT PLAN</div> : isOnTrial ? <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-amber-500 px-3 py-1.5 text-[8px] font-bold text-white"><Sparkles size={10} />{trialDaysLeft} DAY{trialDaysLeft === 1 ? "" : "S"} TRIAL LEFT</div> : style.popular && <div className="absolute right-0 top-0 rounded-bl-xl bg-violet-600 px-3 py-1.5 text-[8px] font-semibold text-white">MOST POPULAR</div>}<span className={`grid size-10 place-items-center rounded-xl ${style.color === "violet" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}><Icon size={17} /></span><h3 className="mt-4 text-lg font-semibold text-slate-900">{plan.name}</h3><p className="mt-1 min-h-8 text-[9px] leading-4 text-slate-400">{plan.description}</p><div className="mt-5 flex items-end gap-1"><span className="text-3xl font-semibold tracking-tight text-slate-950">Rs {price(monthly).toLocaleString()}</span><span className="pb-1 text-[9px] text-slate-400">/ month</span></div>{annual && <p className="mt-1 text-[8px] font-medium text-emerald-600">Billed yearly · save Rs {(monthly * 12 - price(monthly) * 12).toLocaleString()}</p>}<button onClick={() => !isCurrent && setCheckoutPlan(plan)} disabled={isCurrent} className={`mt-5 h-10 rounded-xl text-[9px] font-semibold ${isCurrent ? "cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700" : style.popular ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{isCurrent ? <span className="flex items-center justify-center gap-1.5"><Check size={12} strokeWidth={3} />Your current plan</span> : plan.name === "Starter Package" ? "Choose Starter" : "Choose Growth"}</button><div className="my-5 border-t border-slate-100" /><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">What&apos;s included</p><ul className="mt-3 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700"><span className={`grid size-5 place-items-center rounded-full ${style.popular ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}><Check size={10} strokeWidth={3} /></span>{feature}</li>)}</ul></article>;
      })}</div>
    </section>

    <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">{[[ShieldCheck, "Secure billing", "Payments are processed securely through eSewa."], [Users, "Built for teams", "Invite your team and control what each person can access."], [Headphones, "Human support", "Get friendly help whenever you have a question."]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof ShieldCheck; return <div key={title as string} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><ItemIcon size={15} /></span><div><p className="text-[10px] font-semibold text-slate-800">{title as string}</p><p className="mt-1 text-[8px] leading-4 text-slate-400">{text as string}</p></div></div>; })}</section>

    {checkoutPlan && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !redirecting) setCheckoutPlan(null); }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles size={20} /></span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Switch to {checkoutPlan.name}</h2>
        <p className="mt-2 text-[9px] leading-5 text-slate-500">Rs {price(checkoutPlan.monthlyPrice).toLocaleString()}/month, billed {annual ? "yearly" : "monthly"}. You&apos;ll be redirected to eSewa&apos;s secure test checkout to complete payment.</p>
        {checkoutError && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{checkoutError}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={() => setCheckoutPlan(null)} disabled={redirecting} className="h-10 flex-1 rounded-lg border border-slate-200 text-[9px] font-semibold text-slate-600 disabled:opacity-50">Not now</button>
          <button onClick={() => payWithEsewa(checkoutPlan.name)} disabled={redirecting} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#60bb46] text-[9px] font-semibold text-white disabled:opacity-70">{redirecting ? <Loader2 size={13} className="animate-spin" /> : null}{redirecting ? "Redirecting..." : "Pay with eSewa"}</button>
        </div>
      </div>
    </div>}

    {formAction && formFields && <form ref={formRef} action={formAction} method="POST" className="hidden">
      {Object.entries(formFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </form>}

    {endedModalOpen && endedReason && <SubscriptionEndedModal reason={endedReason} canExtend={canExtend} onClose={closeEndedModal} onExtended={handleExtended} />}

    {extendedNotice && <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[9px] font-semibold text-white shadow-xl"><Check size={13} className="text-emerald-400" />Your subscription has been extended by 3 days.</div>}
  </div>;
}
