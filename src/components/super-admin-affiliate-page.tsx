"use client";

import { useMemo, useState, useTransition } from "react";
import { Award, BadgeCheck, Banknote, Check, CircleDollarSign, Clock3, Crown, Gift, Landmark, Loader2, Medal, Save, Search, Sparkles, Trophy, UserCheck, Users, Wallet, X } from "lucide-react";

import { decideWithdrawal, setRewardPaidOut, updateAffiliateSettings, type AffiliateOverview, type AffiliateRewardRow, type TopReferrer, type WithdrawalRequestRow } from "@/actions/admin-affiliate";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });
const RANK_TONE = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];
const RANK_ICON = [Trophy, Medal, Award];

export function SuperAdminAffiliatePage({ overview, topReferrers, rewards, withdrawals }: { overview: AffiliateOverview; topReferrers: TopReferrer[]; rewards: AffiliateRewardRow[]; withdrawals: WithdrawalRequestRow[] }) {
  const [rewardList, setRewardList] = useState(rewards);
  const [syncedRewards, setSyncedRewards] = useState(rewards);
  if (rewards !== syncedRewards) { setSyncedRewards(rewards); setRewardList(rewards); }

  const [withdrawalList, setWithdrawalList] = useState(withdrawals);
  const [syncedWithdrawals, setSyncedWithdrawals] = useState(withdrawals);
  if (withdrawals !== syncedWithdrawals) { setSyncedWithdrawals(withdrawals); setWithdrawalList(withdrawals); }

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Paid">("All");
  const [, startTransition] = useTransition();
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsPending, setSettingsPending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  const format = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;

  const metrics = [
    { label: "Active affiliates", value: String(overview.totalAffiliates), note: "Users with a referral code", icon: Users, tone: "bg-blue-50 text-blue-600" },
    { label: "Referred signups", value: String(overview.totalReferred), note: "Accounts created via referral", icon: UserCheck, tone: "bg-violet-50 text-violet-600" },
    { label: "Total rewards issued", value: format(overview.totalRewardsAmount), note: "Lifetime, all affiliates", icon: Gift, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Withdrawal requests", value: String(overview.pendingWithdrawalCount), note: `${format(overview.pendingWithdrawalAmount)} awaiting review`, icon: Banknote, tone: "bg-amber-50 text-amber-600" },
    { label: "Paid out", value: format(overview.paidOutAmount), note: "Already settled with affiliates", icon: Wallet, tone: "bg-rose-50 text-rose-600" },
  ];

  const filtered = useMemo(() => rewardList.filter((row) => {
    const matchesStatus = statusFilter === "All" || (statusFilter === "Paid" ? row.paidOut : !row.paidOut);
    const matchesQuery = `${row.referrerName} ${row.referrerEmail} ${row.referredName} ${row.referredEmail}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [rewardList, statusFilter, query]);

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError(null);
    const formData = new FormData(event.currentTarget);
    setSettingsPending(true);
    startTransition(async () => {
      try {
        await updateAffiliateSettings(formData);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      } catch (caught) {
        setSettingsError(caught instanceof Error ? caught.message : "Could not save affiliate settings.");
      } finally {
        setSettingsPending(false);
      }
    });
  }

  function decideRequest(row: WithdrawalRequestRow, action: "approve" | "reject") {
    setWithdrawalError(null);
    setDecidingId(row.id);
    startTransition(async () => {
      try {
        await decideWithdrawal(row.id, action);
        setWithdrawalList((current) => current.map((item) => item.id === row.id ? { ...item, status: action === "approve" ? "Paid" : "Rejected", decidedAt: new Date().toISOString() } : item));
      } catch (caught) {
        setWithdrawalError(caught instanceof Error ? caught.message : "Could not process this request.");
      } finally {
        setDecidingId(null);
      }
    });
  }

  function togglePaid(row: AffiliateRewardRow) {
    const next = !row.paidOut;
    setTogglingId(row.id);
    setRewardList((current) => current.map((item) => item.id === row.id ? { ...item, paidOut: next, paidOutAt: next ? new Date().toISOString() : null } : item));
    startTransition(async () => {
      try {
        await setRewardPaidOut(row.id, next);
      } finally {
        setTogglingId(null);
      }
    });
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-600 px-6 py-8 text-white shadow-[0_20px_60px_rgba(124,58,237,0.3)] sm:px-9">
      <span className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/25"><Gift size={26} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Growth</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Affiliate control center</h1><p className="mt-1 max-w-lg text-[11px] leading-5 text-white/80">Manage the refer-and-earn program: reward rate, payouts, and top-performing affiliates.</p></div></div>
        <span className={`flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[10px] font-semibold ${overview.programActive ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40" : "bg-white/10 text-white/70 ring-1 ring-white/20"}`}><span className={`size-1.5 rounded-full ${overview.programActive ? "bg-emerald-300" : "bg-white/50"}`} />{overview.programActive ? "Program active" : "Program paused"}</span>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[9px] font-medium text-slate-500">{item.label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p></div><span className={`grid size-9 place-items-center rounded-lg ${item.tone}`}><Icon size={16} /></span></div><p className="mt-3 text-[8px] text-slate-400">{item.note}</p></article>; })}</section>

    <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><CircleDollarSign size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Program settings</h2><p className="mt-0.5 text-[8px] text-slate-400">Controls how much every affiliate earns</p></div></div>
        <form onSubmit={saveSettings} className="mt-5 space-y-4">
          <label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Reward per successful referral</span><div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100"><span className="text-[10px] font-semibold text-slate-400">Rs</span><input name="rewardAmount" type="number" min={1} required defaultValue={overview.rewardAmount} className="w-full bg-transparent text-[12px] font-semibold text-slate-800 outline-none" /></div></label>
          <label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Minimum balance to request withdrawal</span><div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100"><span className="text-[10px] font-semibold text-slate-400">Rs</span><input name="minWithdrawal" type="number" min={1} required defaultValue={overview.minWithdrawal} className="w-full bg-transparent text-[12px] font-semibold text-slate-800 outline-none" /></div></label>
          <label className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3"><span><span className="block text-[10px] font-semibold text-slate-700">Program active</span><span className="block text-[8px] text-slate-400">New rewards are credited only while active</span></span><span className="relative"><input name="active" type="checkbox" defaultChecked={overview.programActive} className="peer sr-only" /><span className="block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500" /><span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" /></span></label>
          {settingsError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{settingsError}</p>}
          <button disabled={settingsPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">{settingsPending ? <Loader2 size={13} className="animate-spin" /> : settingsSaved ? <Check size={13} /> : <Save size={13} />}{settingsPending ? "Saving..." : settingsSaved ? "Saved" : "Save settings"}</button>
        </form>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-700"><Sparkles size={13} className="mt-0.5 shrink-0 text-amber-500" />Changes apply to every future referral instantly. Rewards already earned are not affected.</p>
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2.5 border-b border-slate-100 p-4"><span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600"><Crown size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Top affiliates</h2><p className="mt-0.5 text-[8px] text-slate-400">Ranked by total rewards earned</p></div></div>
        {topReferrers.length === 0 ? <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Trophy size={18} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No affiliate activity yet</p><p className="mt-1 text-[9px] text-slate-400">Rewards will appear here once referrals start converting.</p></div></div> :
        <div className="max-h-[400px] divide-y divide-slate-50 overflow-y-auto">{topReferrers.map((row, index) => { const RankIcon = RANK_ICON[index]; return <div key={row.userId} className="flex items-center gap-3 p-4">
          {RankIcon ? <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm ${RANK_TONE[index]}`}><RankIcon size={15} /></span> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{index + 1}</span>}
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-800">{row.name}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{row.email}{row.referralCode ? ` · ${row.referralCode}` : ""}</p></div>
          <div className="shrink-0 text-right"><p className="text-[11px] font-semibold text-emerald-600">{format(row.rewardTotal)}</p><p className="mt-0.5 text-[8px] text-slate-400">{row.referredCount} referral{row.referredCount === 1 ? "" : "s"}</p></div>
        </div>; })}</div>}
      </article>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2.5 border-b border-slate-100 p-4"><span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600"><Banknote size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Withdrawal requests</h2><p className="mt-0.5 text-[8px] text-slate-400">Affiliates cashing out or converting rewards to subscription time</p></div></div>
      {withdrawalError && <p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{withdrawalError}</p>}
      {withdrawalList.length === 0 ? <div className="grid min-h-40 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Banknote size={18} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No withdrawal requests yet</p><p className="mt-1 text-[9px] text-slate-400">Requests will appear here once affiliates reach the minimum balance.</p></div></div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Affiliate</th><th className="px-3 py-3">Method</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Requested</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead>
        <tbody>{withdrawalList.map((row) => <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
          <td className="px-4 py-3"><p className="text-[10px] font-semibold text-slate-700">{row.userName}</p><p className="mt-0.5 text-[8px] text-slate-400">{row.userEmail}</p></td>
          <td className="px-3 py-3">{row.method === "Cash" ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[8px] font-semibold text-blue-700"><Landmark size={9} />Cash{row.bankName ? ` · ${row.bankName}` : ""}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[8px] font-semibold text-violet-700"><Sparkles size={9} />Subscription credit</span>}{row.method === "Cash" && row.accountNumber && <p className="mt-1 text-[8px] text-slate-400">A/C {row.accountNumber} · {row.accountName}</p>}</td>
          <td className="px-3 py-3 text-[11px] font-semibold text-emerald-600">{format(row.amount)}</td>
          <td className="px-3 py-3 text-[9px] text-slate-500">{dateFormatter.format(new Date(row.createdAt))}</td>
          <td className="px-3 py-3">{row.status === "Paid" ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700"><Check size={9} />Approved</span> : row.status === "Rejected" ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[8px] font-semibold text-rose-700"><X size={9} />Rejected</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700"><Clock3 size={9} />Pending</span>}</td>
          <td className="px-3 py-3 text-right">{row.status === "Pending" ? <div className="flex justify-end gap-1.5"><button type="button" disabled={decidingId === row.id} onClick={() => decideRequest(row, "reject")} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">Reject</button><button type="button" disabled={decidingId === row.id} onClick={() => decideRequest(row, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[8px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">{decidingId === row.id ? <Loader2 size={10} className="animate-spin" /> : "Approve"}</button></div> : <span className="text-[8px] text-slate-400">{row.decidedAt ? dateFormatter.format(new Date(row.decidedAt)) : "—"}</span>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><BadgeCheck size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Referral rewards</h2><p className="mt-0.5 text-[8px] text-slate-400">{rewardList.length} reward{rewardList.length === 1 ? "" : "s"} total</p></div></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search affiliate or referral..." className="w-48 bg-transparent text-[10px] text-slate-700 outline-none" /></label>
          <div className="flex overflow-hidden rounded-lg border border-slate-200">{(["All", "Pending", "Paid"] as const).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 text-[9px] font-semibold transition ${statusFilter === status ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>{status}</button>)}</div>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Affiliate</th><th className="px-3 py-3">Referred user</th><th className="px-3 py-3">Reward</th><th className="px-3 py-3">Earned on</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
          <td className="px-4 py-3"><p className="text-[10px] font-semibold text-slate-700">{row.referrerName}</p><p className="mt-0.5 text-[8px] text-slate-400">{row.referrerEmail}</p></td>
          <td className="px-3 py-3"><p className="text-[10px] font-semibold text-slate-700">{row.referredName}</p><p className="mt-0.5 text-[8px] text-slate-400">{row.referredEmail}</p></td>
          <td className="px-3 py-3 text-[11px] font-semibold text-emerald-600">{format(row.amount)}</td>
          <td className="px-3 py-3 text-[9px] text-slate-500">{dateFormatter.format(new Date(row.createdAt))}</td>
          <td className="px-3 py-3">{row.paidOut ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700"><Check size={9} />Paid{row.paidOutAt ? ` · ${dateFormatter.format(new Date(row.paidOutAt))}` : ""}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700"><Clock3 size={9} />Pending</span>}</td>
          <td className="px-3 py-3 text-right"><button type="button" disabled={togglingId === row.id} onClick={() => togglePaid(row)} className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-semibold transition disabled:opacity-50 ${row.paidOut ? "border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" : "border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"}`}>{togglingId === row.id ? <Loader2 size={11} className="animate-spin" /> : row.paidOut ? "Mark pending" : "Mark paid"}</button></td>
        </tr>)}</tbody>
      </table>
      {filtered.length === 0 && <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Gift size={18} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No rewards found</p><p className="mt-1 text-[9px] text-slate-400">Try a different search or filter.</p></div></div>}
      </div>
    </section>
  </div>;
}
