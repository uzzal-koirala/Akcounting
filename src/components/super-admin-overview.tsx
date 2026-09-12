"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, Bell, Building2, CalendarDays, ChevronDown, Clock3, CreditCard, Headphones, Search, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

import { money, type Organization } from "@/lib/mock-organizations";

const ORG_STATUS_TONE = { Active: "bg-emerald-50 text-emerald-700", Trial: "bg-blue-50 text-blue-700", "Past due": "bg-rose-50 text-rose-700", Suspended: "bg-slate-100 text-slate-600" } as const;
const CUSTOMER_STATUS_TONE = ORG_STATUS_TONE;
const PLAN_BAR_COLOR: Record<Organization["plan"], string> = { Business: "bg-slate-800", Growth: "bg-violet-600", Starter: "bg-slate-300" };

const recentTickets = [
  { id: "#4821", subject: "Payment mismatch on invoice #INV-1042", customer: "Rojina Lama", company: "Sagarmatha Traders", priority: "Urgent" as const, time: "18 min ago", tone: "from-rose-500 to-rose-700" },
  { id: "#4819", subject: "Cannot download PDF invoice", customer: "Suman Karki", company: "Cloud Nine Labs", priority: "High" as const, time: "52 min ago", tone: "from-amber-500 to-amber-700" },
  { id: "#4815", subject: "Requesting plan upgrade to Business", customer: "Priya Rai", company: "Himalayan Works", priority: "Normal" as const, time: "2 hours ago", tone: "from-blue-500 to-blue-700" },
  { id: "#4812", subject: "eSewa payout not received", customer: "Neha Shrestha", company: "Kathmandu Digital", priority: "High" as const, time: "4 hours ago", tone: "from-emerald-500 to-emerald-700" },
  { id: "#4808", subject: "Login OTP not arriving", customer: "Aarav Joshi", company: "Everest Commerce", priority: "Normal" as const, time: "Yesterday", tone: "from-violet-500 to-violet-700" },
];
const TICKET_PRIORITY_TONE = { Urgent: "bg-rose-50 text-rose-600", High: "bg-amber-50 text-amber-600", Normal: "bg-blue-50 text-blue-600" } as const;
const TICKET_BOX_TONE = { Urgent: "bg-rose-50/60 border-rose-100 hover:border-rose-200", High: "bg-amber-50/60 border-amber-100 hover:border-amber-200", Normal: "bg-blue-50/50 border-blue-100 hover:border-blue-200" } as const;

const healthItems = [
  { label: "API & services", value: "99.99%", note: "uptime this month", icon: ShieldCheck, tone: "text-emerald-500", bar: 99 },
  { label: "Avg response time", value: "184ms", note: "-12% vs last week", icon: TrendingUp, tone: "text-blue-500", bar: 82 },
  { label: "Support SLA", value: "96.4%", note: "resolved within target", icon: Headphones, tone: "text-violet-500", bar: 96 },
];

const recentActivity = [
  { text: "Everest Commerce upgraded to Business", time: "12 min ago", icon: ArrowUpRight, tone: "bg-violet-50 text-violet-600" },
  { text: "New organization: Cloud Nine Labs", time: "1 hour ago", icon: Building2, tone: "bg-blue-50 text-blue-600" },
  { text: "Ticket #4821 escalated — payment mismatch", time: "2 hours ago", icon: Headphones, tone: "bg-rose-50 text-rose-600" },
  { text: "Payout of Rs 45,000 released to Kathmandu Digital", time: "5 hours ago", icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
];

const RANGES = ["7 days", "30 days", "90 days"] as const;

export type OverviewMetrics = {
  totalRevenue: number;
  monthRevenue: number;
  monthChangePct: number | null;
  organizationCount: number;
  activeSubscriptions: number;
  trialCount: number;
};

export function SuperAdminOverview({ adminName, metrics: liveMetrics, organizations, recentCustomers, planDistribution }: { adminName: string; metrics: OverviewMetrics; organizations: Organization[]; recentCustomers: Organization[]; planDistribution: { name: string; value: number; percent: number }[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("30 days");

  const monthChangeLabel = liveMetrics.monthChangePct === null ? "No revenue last month to compare" : `${liveMetrics.monthChangePct >= 0 ? "+" : ""}${liveMetrics.monthChangePct.toFixed(1)}% vs last month`;
  const metrics = [
    { label: "Total revenue", value: money(liveMetrics.totalRevenue), note: "All completed subscription payments", change: null, positive: true, icon: Wallet, tone: "from-violet-500 to-violet-700", iconTone: "bg-violet-50 text-violet-600" },
    { label: "Monthly revenue", value: money(liveMetrics.monthRevenue), note: monthChangeLabel, change: liveMetrics.monthChangePct === null ? null : `${liveMetrics.monthChangePct >= 0 ? "+" : ""}${liveMetrics.monthChangePct.toFixed(1)}%`, positive: (liveMetrics.monthChangePct ?? 0) >= 0, icon: CreditCard, tone: "from-blue-500 to-blue-700", iconTone: "bg-blue-50 text-blue-600" },
    { label: "Organizations", value: liveMetrics.organizationCount.toString(), note: `${liveMetrics.activeSubscriptions} on a paid subscription`, change: null, positive: true, icon: Building2, tone: "from-emerald-500 to-emerald-700", iconTone: "bg-emerald-50 text-emerald-600" },
    { label: "On free trial", value: liveMetrics.trialCount.toString(), note: "Signed up, haven't paid yet", change: null, positive: true, icon: Headphones, tone: "from-amber-500 to-amber-700", iconTone: "bg-amber-50 text-amber-600" },
  ];

  return <div>
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-slate-400 sm:max-w-xs"><Search size={14} /><input placeholder="Search or type a command" className="w-full bg-transparent text-[11px] outline-none" /><kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold text-slate-400">⌘F</kbd></label>
      <div className="flex items-center gap-2.5">
        <button className="relative grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><Bell size={16} /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2.5 hover:bg-slate-50"><span className="grid size-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-semibold text-white">{adminName.slice(0, 1).toUpperCase()}</span><span className="text-left"><span className="block text-[11px] font-semibold text-slate-800">{adminName}</span><span className="block text-[8px] text-slate-400">Super Admin</span></span><ChevronDown size={13} className="text-slate-400" /></button>
      </div>
    </header>

    <div className="relative mt-4 overflow-hidden rounded-lg bg-gradient-to-br from-violet-950 via-violet-800 to-indigo-800 px-6 py-6 text-white shadow-[0_16px_40px_rgba(88,28,235,0.18)] sm:px-7">
      <span className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-16 left-16 size-44 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-medium text-violet-100 ring-1 ring-white/15"><ShieldCheck size={11} />Platform overview</span>
          <h1 className="mt-2.5 text-xl font-semibold tracking-tight sm:text-2xl">Hey, {adminName}! Look at your platform</h1>
          <p className="mt-1 text-[11px] text-violet-100/75">Here&apos;s how every organization is performing right now.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white/10 p-1 ring-1 ring-white/15">{RANGES.map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${range === item ? "bg-white text-violet-800 shadow-sm" : "text-violet-100 hover:bg-white/10"}`}>{item}</button>)}</div>
          <button className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[10px] font-medium text-violet-50 ring-1 ring-white/15 hover:bg-white/15"><CalendarDays size={13} />Today, 03 Sep 2026</button>
        </div>
      </div>
    </div>

    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
      <span className={`pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-gradient-to-br opacity-[0.07] transition group-hover:opacity-[0.12] ${metric.tone}`} />
      <div className="relative flex items-start justify-between"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{metric.label}</p><span className={`grid size-8 shrink-0 place-items-center rounded-md ${metric.iconTone}`}><Icon size={14} /></span></div>
      <p className="relative mt-2.5 text-xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
      <div className="relative mt-2 flex items-center gap-1.5">{metric.change !== null && <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${metric.positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{metric.positive ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}{metric.change}</span>}<p className="truncate text-[9px] leading-4 text-slate-400">{metric.note}</p></div>
    </article>; })}</section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[2.1fr_0.55fr]">
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="text-base font-semibold text-slate-900">Recently registered customers</h2><p className="mt-0.5 text-[11px] text-slate-400">Newest people who signed up on the platform</p></div><Link href="/super-admin/users" className="flex items-center gap-1 text-[11px] font-semibold text-violet-700">See all <ArrowRight size={13} /></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Customer</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Joined</th></tr></thead>
          <tbody>{recentCustomers.map((customer) => <tr key={customer.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
            <td className="px-4 py-3.5"><Link href={`/super-admin/organizations/${customer.id}`} className="flex items-center gap-2.5"><span className={`grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[12px] font-semibold text-white ${customer.tone}`}>{customer.owner.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{customer.owner}</p><p className="truncate text-[11px] text-slate-400">{customer.name}</p></div></Link></td>
            <td className="px-3 py-3.5 text-[12px] text-slate-600">{customer.email}</td>
            <td className="px-3 py-3.5 text-[12px] text-slate-600">{customer.phone}</td>
            <td className="px-3 py-3.5"><span className="rounded-md bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{customer.plan}</span></td>
            <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${CUSTOMER_STATUS_TONE[customer.status]}`}>{customer.status}</span></td>
            <td className="px-3 py-3.5 text-[12px] text-slate-400">{customer.joined}</td>
          </tr>)}</tbody>
        </table></div>
        {recentCustomers.length === 0 && <p className="p-6 text-center text-[10px] text-slate-400">No registered organizations yet.</p>}
      </article>

      <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold text-slate-900">Latest tickets raised</h2><Link href="/super-admin/support" className="text-[9px] font-semibold text-violet-700">See all</Link></div>
        <p className="mt-0.5 text-[8px] text-slate-400">Most recent tickets raised by customers</p>

        <div className="mt-3 flex flex-1 flex-col gap-2">{recentTickets.map((ticket) => <Link key={ticket.id} href="/super-admin/support" className={`group flex items-center gap-2.5 rounded-md border p-2 transition ${TICKET_BOX_TONE[ticket.priority]}`}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[9px] font-semibold text-white ${ticket.tone}`}>{ticket.customer.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-semibold text-slate-800">{ticket.subject}</p>
            <p className="mt-0.5 truncate text-[8px] text-slate-400">{ticket.customer} · {ticket.company}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${TICKET_PRIORITY_TONE[ticket.priority]}`}>{ticket.priority === "Urgent" && <AlertTriangle size={8} />}{ticket.priority}</span>
            <span className="flex items-center gap-1 text-[7px] text-slate-400"><Clock3 size={8} />{ticket.time}</span>
          </div>
        </Link>)}</div>
      </article>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="text-sm font-semibold text-slate-900">Top organizations</h2><p className="mt-0.5 text-[8px] text-slate-400">Highest monthly revenue on the platform</p></div><Link href="/super-admin/organizations" className="flex items-center gap-1 text-[9px] font-semibold text-violet-700">See all <ArrowRight size={11} /></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Organization</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">MRR</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Joined</th></tr></thead>
          <tbody>{organizations.map((org) => <tr key={org.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50"><td className="px-4 py-3"><Link href={`/super-admin/organizations/${org.id}`} className="flex items-center gap-2.5"><span className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br text-[9px] font-semibold text-white ${org.tone}`}>{org.initials}</span><div><p className="text-[10px] font-semibold text-slate-700">{org.name}</p><p className="mt-0.5 text-[8px] text-slate-400">{org.owner}</p></div></Link></td><td className="px-3 py-3"><span className="rounded-md bg-violet-50 px-2 py-1 text-[8px] font-semibold text-violet-700">{org.plan}</span></td><td className="px-3 py-3 text-[9px] font-semibold text-slate-700">{org.mrr > 0 ? money(org.mrr) : "—"}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${ORG_STATUS_TONE[org.status]}`}>{org.status}</span></td><td className="px-3 py-3 text-[9px] text-slate-400">{org.joined}</td></tr>)}</tbody>
        </table></div>
        {organizations.length === 0 && <p className="p-6 text-center text-[10px] text-slate-400">No organizations yet.</p>}
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <h2 className="text-sm font-semibold text-slate-900">Platform health</h2>
        <p className="mt-0.5 text-[8px] text-slate-400">Live status across services</p>
        <div className="mt-4 space-y-4">{healthItems.map((item) => { const Icon = item.icon; return <div key={item.label}>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[9px] font-medium text-slate-600"><Icon size={12} className={item.tone} />{item.label}</span><span className="text-[10px] font-semibold text-slate-800">{item.value}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.bar}%` }} /></div>
          <p className="mt-1 text-[8px] text-slate-400">{item.note}</p>
        </div>; })}</div>
        <Link href="/super-admin/system" className="mt-4 flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">View system settings <ArrowRight size={11} /></Link>
      </article>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
        <p className="mt-0.5 text-[8px] text-slate-400">Live platform events</p>
        <div className="relative mt-4 space-y-4 before:absolute before:bottom-1 before:left-[15px] before:top-1 before:w-px before:bg-slate-100">{recentActivity.map((item) => { const Icon = item.icon; return <div key={item.text} className="relative flex gap-3"><span className={`z-10 grid size-8 shrink-0 place-items-center rounded-lg ${item.tone}`}><Icon size={13} /></span><div className="min-w-0 flex-1 pt-1"><p className="text-[10px] font-medium text-slate-700">{item.text}</p><p className="mt-0.5 text-[8px] text-slate-400">{item.time}</p></div></div>; })}</div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Plan distribution</h2><p className="text-[9px] font-semibold text-slate-400">{liveMetrics.organizationCount} total</p></div>
        <div className="mt-5 space-y-4">{planDistribution.map((plan) => <div key={plan.name}><div className="flex items-center justify-between text-[9px]"><p className="font-medium text-slate-600">{plan.name}</p><p className="font-semibold text-slate-800">{plan.value} · {plan.percent}%</p></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${PLAN_BAR_COLOR[plan.name as Organization["plan"]] ?? "bg-slate-300"}`} style={{ width: `${plan.percent}%` }} /></div></div>)}</div>
        <Link href="/super-admin/plans" className="mt-5 flex h-9 items-center justify-center gap-2 rounded-md bg-violet-600 text-[9px] font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700">Manage subscription plans <ArrowRight size={11} /></Link>
      </article>
    </section>
  </div>;
}
