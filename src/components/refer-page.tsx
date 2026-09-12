"use client";

import { useState, useTransition } from "react";
import { Banknote, Calendar, Check, CheckCircle2, Clock3, Copy, Gift, Landmark, Link2, Loader2, Lock, Mail, MessageCircle, Share2, Sparkles, UserPlus, Users, Wallet, X, XCircle } from "lucide-react";

import { requestWithdrawal, type ReferralInfo } from "@/actions/referral";
import { daysForWithdrawalAmount } from "@/lib/referral";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

export function ReferPage({ referral }: { referral: ReferralInfo }) {
  const steps = [
    { title: "Share your link", detail: "Send your unique referral link to a business owner who needs AKCounting.", icon: Share2 },
    { title: "They sign up", detail: "Your friend creates an account using your link and subscribes to any paid plan.", icon: UserPlus },
    { title: "You get rewarded", detail: `Once their payment is confirmed, Rs ${referral.rewardPerReferral} credit is added to your balance automatically.`, icon: Gift },
  ];
  const [copiedField, setCopiedField] = useState<"link" | "code" | "message" | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const referralLink = `${origin}/register?ref=${referral.code}`;
  const shareText = `Join me on AKCounting to manage your business finances! Sign up with my link and we both get rewarded: ${referralLink}`;

  function copy(field: "link" | "code" | "message", value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
  }

  const progressPct = referral.minWithdrawal > 0 ? Math.min(100, Math.round((referral.availableBalance / referral.minWithdrawal) * 100)) : 100;
  const eligible = referral.availableBalance >= referral.minWithdrawal;

  return <div className="flex w-full flex-col gap-5">
    <header className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 px-6 py-10 text-white shadow-[0_20px_60px_rgba(124,58,237,0.35)] sm:px-10">
      <span className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/25"><Gift size={30} /></span>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70">Refer & Earn</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Earn Rs {referral.rewardPerReferral} for every friend</h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-5 text-white/80">Share your link. When someone signs up through it and buys a plan, you get Rs {referral.rewardPerReferral} credited automatically.</p>
        </div>
      </div>
    </header>

    <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
          { title: "Friends invited", value: String(referral.invited), note: "Signed up with your link", icon: Users, tone: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
          { title: "Awaiting first purchase", value: String(referral.pendingInvites), note: "Not yet subscribed", icon: Clock3, tone: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
          { title: "Lifetime rewards", value: `Rs ${referral.rewardEarned}`, note: "Earned from all referrals", icon: Wallet, tone: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
          { title: "Available balance", value: `Rs ${referral.availableBalance}`, note: "Ready to withdraw", icon: Banknote, tone: "bg-violet-50 text-violet-600", dot: "bg-violet-500" },
        ].map((stat) => { const Icon = stat.icon; return <article key={stat.title} className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[13px] font-medium text-slate-400">{stat.title}</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{stat.value}</p></div><div className={`grid size-8 shrink-0 place-items-center rounded-full sm:size-9 ${stat.tone}`}><Icon size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${stat.dot}`} /><p className="text-[12px] text-slate-400">{stat.note}</p></div></article>; })}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700"><Link2 size={13} className="text-violet-600" />Your referral link</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex h-14 flex-1 min-w-0 items-center justify-between gap-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/60 px-5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-violet-700">{referralLink}</span>
              <button type="button" onClick={() => copy("link", referralLink)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700">{copiedField === "link" ? <Check size={13} /> : <Copy size={13} />}{copiedField === "link" ? "Copied" : "Copy link"}</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-medium text-slate-400">or share your code</span>
            <span className="flex items-center gap-2 rounded-lg bg-slate-100 py-1.5 pl-3 pr-1.5"><span className="font-mono text-[13px] font-bold tracking-[0.2em] text-slate-700">{referral.code}</span><button type="button" onClick={() => copy("code", referral.code)} className="grid size-6 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-violet-600">{copiedField === "code" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}</button></span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-95"><MessageCircle size={15} />Share on WhatsApp</a>
            <a href={`mailto:?subject=${encodeURIComponent("Try AKCounting")}&body=${encodeURIComponent(shareText)}`} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><Mail size={15} />Share via email</a>
            <button type="button" onClick={() => copy("message", shareText)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{copiedField === "message" ? <Check size={15} /> : <Share2 size={15} />}{copiedField === "message" ? "Message copied" : "Copy message"}</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-900">How it works</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="relative rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-200"><Icon size={17} /></span>
            <span className="absolute right-4 top-4 text-2xl font-bold text-slate-200">{index + 1}</span>
            <p className="mt-3 text-[13px] font-semibold text-slate-800">{step.title}</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{step.detail}</p>
          </div>; })}</div>
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-4 text-amber-700"><Sparkles size={13} className="shrink-0 text-amber-500" />There&apos;s no limit — invite as many people as you want and earn Rs {referral.rewardPerReferral} for every one who subscribes.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 p-4"><span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><Banknote size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Withdrawal history</h2><p className="mt-0.5 text-[10px] text-slate-400">Your cash-out and subscription-credit requests</p></div></div>
          {referral.withdrawals.length === 0 ? <div className="grid min-h-32 place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400"><Banknote size={16} /></span><p className="mt-2.5 text-[12px] font-semibold text-slate-600">No withdrawal requests yet</p></div></div> :
          <div className="divide-y divide-slate-50">{referral.withdrawals.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${row.method === "Cash" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{row.method === "Cash" ? <Landmark size={15} /> : <Sparkles size={15} />}</span><div><p className="text-[12px] font-semibold text-slate-700">{row.method === "Cash" ? "Cash withdrawal" : "Subscription credit"}</p><p className="mt-0.5 text-[10px] text-slate-400">{dateFormatter.format(new Date(row.createdAt))}</p></div></div>
            <div className="text-right"><p className="text-[13px] font-semibold text-slate-800">Rs {row.amount}</p>{row.status === "Paid" ? <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={10} />Approved</span> : row.status === "Rejected" ? <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600"><XCircle size={10} />Rejected</span> : <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600"><Clock3 size={10} />Pending review</span>}</div>
          </div>)}</div>}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-6 text-white shadow-xl">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-300"><Wallet size={13} />Available balance</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">Rs {referral.availableBalance}</p>
          <p className="mt-1 text-[11px] text-slate-400">Rs {referral.rewardEarned} earned lifetime{referral.rewardEarned !== referral.availableBalance ? " · rest already requested" : ""}</p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[10px] text-slate-400"><span>Progress to minimum withdrawal</span><span>{Math.min(referral.availableBalance, referral.minWithdrawal)}/{referral.minWithdrawal}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all" style={{ width: `${progressPct}%` }} /></div>
          </div>

          {referral.hasPendingWithdrawal ? <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-400/15 p-3 text-[11px] font-medium text-amber-200 ring-1 ring-amber-300/30"><Clock3 size={14} className="shrink-0" />You have a withdrawal request awaiting admin review.</div> :
          eligible ? <button type="button" onClick={() => setWithdrawOpen(true)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-semibold text-violet-800 shadow-lg transition hover:bg-violet-50"><Banknote size={15} />Request withdrawal</button> :
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-[11px] font-medium text-white/70 ring-1 ring-white/15"><Lock size={13} className="shrink-0" />Reach Rs {referral.minWithdrawal} to unlock withdrawals — Rs {Math.max(0, referral.minWithdrawal - referral.availableBalance)} to go.</div>}
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-950 p-5 text-white shadow-lg"><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-300">Two ways to cash out</p><div className="mt-4 space-y-3"><div className="flex items-start gap-2.5 rounded-lg bg-white/10 px-3 py-2.5"><Landmark size={14} className="mt-0.5 shrink-0 text-violet-300" /><p className="text-[11px] leading-4 text-slate-200"><b className="text-white">Cash</b> — paid to your bank account after admin approval.</p></div><div className="flex items-start gap-2.5 rounded-lg bg-white/10 px-3 py-2.5"><Sparkles size={14} className="mt-0.5 shrink-0 text-violet-300" /><p className="text-[11px] leading-4 text-slate-200"><b className="text-white">Subscription credit</b> — instantly extends your own AKCounting plan.</p></div></div></section>
      </aside>
    </div>

    {withdrawOpen && <WithdrawModal referral={referral} onClose={() => setWithdrawOpen(false)} />}
  </div>;
}

function WithdrawModal({ referral, onClose }: { referral: ReferralInfo; onClose: () => void }) {
  const [method, setMethod] = useState<"Cash" | "Subscription">("Cash");
  const [amount, setAmount] = useState(referral.availableBalance);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const estimatedDays = daysForWithdrawalAmount(amount || 0, referral.currentPlanPrice);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await requestWithdrawal(formData);
        setSuccess(true);
        setTimeout(onClose, 1400);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not submit your withdrawal request.");
      }
    });
  }

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="relative bg-gradient-to-br from-violet-700 to-fuchsia-700 px-6 py-5 text-white">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X size={15} /></button>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70"><Banknote size={12} />Request withdrawal</p>
        <h2 className="mt-1.5 text-lg font-semibold">Rs {referral.availableBalance} available</h2>
      </div>

      {success ? <div className="grid min-h-56 place-items-center p-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span><p className="mt-3 text-sm font-semibold text-slate-800">Request submitted</p><p className="mt-1 text-[12px] text-slate-400">We&apos;ll notify you once it&apos;s reviewed.</p></div></div> :
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setMethod("Cash")} className={`rounded-xl border-2 p-3.5 text-left transition ${method === "Cash" ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}><Landmark size={17} className={method === "Cash" ? "text-violet-600" : "text-slate-400"} /><p className="mt-2 text-[12px] font-semibold text-slate-800">Cash payout</p><p className="mt-0.5 text-[10px] text-slate-400">To your bank account</p></button>
          <button type="button" onClick={() => setMethod("Subscription")} className={`rounded-xl border-2 p-3.5 text-left transition ${method === "Subscription" ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}><Sparkles size={17} className={method === "Subscription" ? "text-violet-600" : "text-slate-400"} /><p className="mt-2 text-[12px] font-semibold text-slate-800">Subscription credit</p><p className="mt-0.5 text-[10px] text-slate-400">Extend your own plan</p></button>
        </div>
        <input type="hidden" name="method" value={method} />

        <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Amount to withdraw</span><div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100"><span className="text-[12px] font-semibold text-slate-400">Rs</span><input name="amount" type="number" min={referral.minWithdrawal} max={referral.availableBalance} required value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-full bg-transparent text-[14px] font-semibold text-slate-800 outline-none" /></div><p className="mt-1 text-[10px] text-slate-400">Min Rs {referral.minWithdrawal} · Max Rs {referral.availableBalance}</p></label>

        {method === "Subscription" && <p className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-[11px] font-medium text-violet-700"><Calendar size={13} className="shrink-0" />≈ {estimatedDays} extra day{estimatedDays === 1 ? "" : "s"} added to your subscription</p>}

        {method === "Cash" && <div className="mt-4 space-y-3">
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Bank name</span><input name="bankName" required value={bankName} onChange={(event) => setBankName(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Account holder</span><input name="accountName" required value={accountName} onChange={(event) => setAccountName(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Account number</span><input name="accountNumber" required value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400" /></label>
          </div>
        </div>}

        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">{error}</p>}

        <div className="mt-5 flex gap-2"><button type="button" onClick={onClose} disabled={pending} className="h-10 flex-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button disabled={pending} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 text-[11px] font-semibold text-white disabled:opacity-70">{pending && <Loader2 size={12} className="animate-spin" />}Submit request</button></div>
      </form>}
    </div>
  </div>;
}
