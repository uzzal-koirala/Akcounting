import { ArrowRight, Clock3, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

export function SubscriptionEndedNotice() {
  return <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0b0714] p-6">
    <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-amber-500/15 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 top-1/3 size-80 rounded-full bg-violet-600/25 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-400/15 to-transparent" />

      <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-900/40 ring-1 ring-white/10">
        <Crown size={28} className="relative text-amber-950" strokeWidth={2.25} />
      </div>

      <span className="relative mx-auto mt-5 flex w-fit items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300"><Clock3 size={11} />Subscription ended</span>

      <h1 className="relative mt-4 text-xl font-semibold tracking-tight text-white">Your subscription has ended</h1>
      <p className="relative mt-2.5 text-[12px] leading-6 text-slate-400">Your billing cycle is over, so most of your AKCounting workspace is on hold. Renew your plan to pick up right where you left off.</p>

      <div className="relative mt-5 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4 text-left">
        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300"><Sparkles size={11} />What you get back instantly</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-slate-300">
          <li className="flex items-center gap-2"><span className="size-1 rounded-full bg-violet-400" />Full access to income, expenses, and reports</li>
          <li className="flex items-center gap-2"><span className="size-1 rounded-full bg-violet-400" />Invoicing, documents, and team tools</li>
          <li className="flex items-center gap-2"><span className="size-1 rounded-full bg-violet-400" />All your existing data, untouched and ready</li>
        </ul>
      </div>

      <Link href="/subscription" className="relative mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-400 hover:to-violet-600">Renew your subscription<ArrowRight size={14} /></Link>

      <p className="relative mt-4 text-[10px] text-slate-500">You can only access the subscription page until your plan is renewed.</p>
    </div>
  </div>;
}
