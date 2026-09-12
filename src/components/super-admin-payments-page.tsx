"use client";

import { Banknote, Check, ChevronDown, Clock3, CreditCard, ShieldCheck, TrendingUp, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { money } from "@/lib/mock-organizations";
import type { AdminPaymentRecord, AdminPaymentStatus, AdminPaymentSummary } from "@/actions/admin-payments";
import type { PlanName } from "@/lib/plan";

const PLAN_TONE: Record<PlanName, string> = { "Starter Package": "bg-slate-100 text-slate-600", "Growth Package": "bg-violet-50 text-violet-700", "Premium Package": "bg-amber-50 text-amber-700" };
const STATUS_TONE: Record<AdminPaymentStatus, string> = { Complete: "bg-emerald-50 text-emerald-700", Pending: "bg-amber-50 text-amber-700", Failed: "bg-rose-50 text-rose-700" };
const STATUS_ICON: Record<AdminPaymentStatus, typeof Check> = { Complete: Check, Pending: Clock3, Failed: X };

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
}

export function SuperAdminPaymentsPage({ summary }: { summary: AdminPaymentSummary }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | AdminPaymentStatus>("All");

  const filtered = useMemo(() => summary.payments.filter((payment) =>
    (status === "All" || payment.status === status) &&
    `${payment.buyerName} ${payment.buyerEmail} ${payment.transactionUuid}`.toLowerCase().includes(query.toLowerCase())
  ), [summary.payments, query, status]);

  const metrics = [
    { label: "Total revenue", value: money(summary.totalRevenue), note: "All completed transactions", icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
    { label: "This month", value: money(summary.monthRevenue), note: summary.monthChangePct === null ? "No revenue last month to compare" : `${summary.monthChangePct >= 0 ? "+" : ""}${summary.monthChangePct.toFixed(1)}% vs last month`, icon: TrendingUp, tone: "bg-violet-50 text-violet-600" },
    { label: "Pending", value: `${summary.pendingCount} · ${money(summary.pendingAmount)}`, note: "Awaiting eSewa confirmation", icon: Clock3, tone: "bg-amber-50 text-amber-600" },
    { label: "Failed", value: summary.failedCount.toString(), note: "Transactions that did not complete", icon: X, tone: "bg-rose-50 text-rose-600" },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Banknote size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Billing</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Revenue & payments</h1><p className="mt-1 text-xs text-slate-500">Every eSewa transaction and admin-granted subscription across the platform, live from the database.</p></div></div>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">{metric.label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1 text-[9px] text-slate-400">{metric.note}</p></div><span className={`grid size-10 place-items-center rounded-lg ${metric.tone}`}><Icon size={17} /></span></div></article>; })}</section>

    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white lg:max-w-sm"><CreditCard size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, email, or transaction..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label>
        <label className="relative flex h-10 min-w-40 items-center rounded-lg border border-slate-200 bg-white"><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-full w-full appearance-none bg-transparent pl-3 pr-8 text-[10px] font-medium text-slate-600 outline-none">{(["All", "Complete", "Pending", "Failed"] as const).map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-3 text-slate-400" /></label>
      </div>
    </section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Customer</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Transaction ID</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead>
        <tbody>{filtered.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}</tbody>
      </table></div>

      {filtered.length === 0 && <div className="grid min-h-64 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Banknote size={22} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">No payments found</h3><p className="mt-1 text-[10px] text-slate-400">Try changing the current filters.</p></div></div>}
    </section>
  </div>;
}

function PaymentRow({ payment }: { payment: AdminPaymentRecord }) {
  const StatusIcon = STATUS_ICON[payment.status];
  return <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
    <td className="px-4 py-3"><Link href={`/super-admin/organizations/user_${payment.userId}`} className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-[9px] font-semibold text-white">{initialsOf(payment.buyerName)}</span><div><p className="text-[10px] font-semibold text-slate-700 hover:text-violet-700">{payment.buyerName}</p><p className="mt-0.5 text-[8px] text-slate-400">{payment.buyerEmail}</p></div></Link></td>
    <td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-[8px] font-semibold ${PLAN_TONE[payment.plan]}`}>{payment.plan}</span></td>
    <td className="px-3 py-3">{payment.isAdminGrant ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[8px] font-semibold text-blue-700"><ShieldCheck size={9} />Admin granted</span> : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[8px] font-semibold text-violet-700"><CreditCard size={9} />eSewa</span>}</td>
    <td className="px-3 py-3 text-[9px] font-semibold text-slate-700">{money(payment.amount)}</td>
    <td className="px-3 py-3 text-[9px] text-slate-500">{payment.transactionUuid}</td>
    <td className="px-3 py-3 text-[9px] text-slate-500">{payment.refId ?? "—"}</td>
    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[payment.status]}`}><StatusIcon size={9} />{payment.status}</span></td>
    <td className="px-3 py-3 text-[9px] text-slate-500">{payment.date}</td>
  </tr>;
}
