"use client";

import { Check, Crown, Loader2, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { startFreeTrial } from "@/actions/subscription";
import { initiateEsewaPayment } from "@/actions/esewa";
import type { PlanRecord } from "@/actions/plans";
import type { PlanName } from "@/lib/plan";

const PLAN_STYLE: Record<PlanName, { icon: typeof WalletCards; popular: boolean }> = {
  "Starter Package": { icon: WalletCards, popular: false },
  "Growth Package": { icon: Sparkles, popular: true },
  "Premium Package": { icon: Crown, popular: false },
};

export function PlanSelectionGate({ plans, name }: { plans: PlanRecord[]; name: string }) {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<PlanName | null>(null);
  const [payingPlan, setPayingPlan] = useState<PlanName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formAction, setFormAction] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string> | null>(null);

  async function choosePlan(plan: PlanName) {
    setPendingPlan(plan);
    setError(null);
    try {
      await startFreeTrial(plan);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start your free trial. Please try again.");
      setPendingPlan(null);
    }
  }

  async function buySubscription(plan: PlanName) {
    setPayingPlan(plan);
    setError(null);
    try {
      const { formUrl, fields } = await initiateEsewaPayment(plan);
      setFormAction(formUrl);
      setFormFields(fields);
      requestAnimationFrame(() => formRef.current?.submit());
    } catch {
      setError("Could not start the eSewa checkout. Please try again.");
      setPayingPlan(null);
    }
  }

  const disabled = pendingPlan !== null || payingPlan !== null;

  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#f8f8fc]">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm"><Sparkles size={16} />Welcome to AKCounting, {name}</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Pick a plan to start your 7-day free trial</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-500">Choose whichever package fits your business — you won&apos;t be charged until your trial ends, and you can change plans anytime. Already know what you want? Buy the subscription outright instead.</p>
      </div>

      {error && <p role="alert" className="mx-auto mt-5 max-w-md rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-600">{error}</p>}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const style = PLAN_STYLE[plan.name] ?? PLAN_STYLE["Starter Package"];
          const Icon = style.icon;
          const isStartingTrial = pendingPlan === plan.name;
          const isPaying = payingPlan === plan.name;
          return <article key={plan.name} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl ${style.popular ? "border-violet-500 shadow-lg shadow-violet-100" : "border-slate-200"}`}>
            {style.popular && <div className="absolute right-0 top-0 rounded-bl-xl bg-violet-600 px-3.5 py-2 text-[11px] font-semibold text-white">MOST POPULAR</div>}
            <span className={`grid size-12 place-items-center rounded-xl ${style.popular ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}><Icon size={21} /></span>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-1.5 min-h-10 text-[13px] leading-5 text-slate-500">{plan.description}</p>
            <div className="mt-6 flex items-end gap-1.5"><span className="text-4xl font-semibold tracking-tight text-slate-950">Rs {plan.monthlyPrice.toLocaleString()}</span><span className="pb-1.5 text-[13px] text-slate-400">/ month</span></div>
            <button onClick={() => choosePlan(plan.name)} disabled={disabled} className={`mt-6 h-12 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${style.popular ? "bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{isStartingTrial ? "Starting trial..." : "Start 7-day free trial"}</button>
            <button onClick={() => buySubscription(plan.name)} disabled={disabled} className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">{isPaying ? <Loader2 size={14} className="animate-spin" /> : null}{isPaying ? "Redirecting to eSewa..." : "Buy subscription"}</button>
            <div className="my-6 border-t border-slate-100" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What&apos;s included</p>
            <ul className="mt-4 space-y-3.5">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2.5 text-[14px] font-medium text-slate-700"><span className={`grid size-6 shrink-0 place-items-center rounded-full ${style.popular ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}><Check size={12} strokeWidth={3} /></span>{feature}</li>)}</ul>
          </article>;
        })}
      </div>
    </div>

    {formAction && formFields && <form ref={formRef} action={formAction} method="POST" className="hidden">
      {Object.entries(formFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </form>}
  </div>;
}
