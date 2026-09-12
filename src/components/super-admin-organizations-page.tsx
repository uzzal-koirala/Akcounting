"use client";

import { ArrowUpRight, Building2, Calendar, CircleSlash, CreditCard, Eye, EyeOff, Grid3x3, List, Lock, Mail, MapPin, Phone, Plus, Search, Sparkles, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { createOrganizationAccount } from "@/actions/organizations";
import { money, PLAN_BORDER_TONE, PLAN_CARD_BORDER, PLAN_SOFT_BG, PLAN_TONE, STATUS_TONE, SUBSCRIPTION_STATE_TONE, type Organization, type OrgStatus } from "@/lib/mock-organizations";
import { FilterSelect } from "@/components/filter-select";

const PLAN_DOT: Record<Organization["plan"], string> = { Starter: "bg-slate-400", Growth: "bg-violet-500", Business: "bg-blue-500" };
const STATUS_DOT: Record<OrgStatus, string> = { Active: "bg-emerald-500", Trial: "bg-blue-500", "Past due": "bg-rose-500", Suspended: "bg-slate-400" };

export function SuperAdminOrganizationsPage({ liveOrganizations }: { liveOrganizations: Organization[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"All" | Organization["plan"]>("All");
  const [status, setStatus] = useState<"All" | OrgStatus>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const allOrganizations = liveOrganizations;
  const topOrgId = useMemo(() => [...allOrganizations].sort((a, b) => b.mrr - a.mrr)[0]?.id, [allOrganizations]);

  const filtered = useMemo(() => allOrganizations.filter((org) =>
    (plan === "All" || org.plan === plan) &&
    (status === "All" || org.status === status) &&
    `${org.name} ${org.owner} ${org.email}`.toLowerCase().includes(query.toLowerCase())
  ), [allOrganizations, query, plan, status]);

  const trialCount = allOrganizations.filter((org) => org.subscriptionState === "Trial" || org.subscriptionState === "Not started").length;
  const activeSubCount = allOrganizations.filter((org) => org.subscriptionState === "Subscribed" || org.subscriptionState === "Extended").length;
  const inactiveSubCount = allOrganizations.filter((org) => org.subscriptionState === "Expired").length;

  const metrics = [
    { label: "Total organizations", value: allOrganizations.length.toString(), note: "Registered AKCounting workspaces", icon: Building2, tone: "bg-violet-50 text-violet-600" },
    { label: "Free trial users", value: trialCount.toString(), note: "Haven't paid yet", icon: Sparkles, tone: "bg-blue-50 text-blue-600" },
    { label: "Active subscriptions", value: activeSubCount.toString(), note: "Currently paying", icon: UsersRound, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Inactive subscriptions", value: inactiveSubCount.toString(), note: "Expired and not renewed", icon: CircleSlash, tone: "bg-rose-50 text-rose-600" },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Building2 size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Platform management</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Organizations</h1><p className="mt-1 text-xs text-slate-500">Every business workspace running on AKCounting.</p></div></div>
        <button onClick={() => setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-[11px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"><Plus size={15} />Add organization</button>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">{metric.label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1 text-[9px] text-slate-400">{metric.note}</p></div><span className={`grid size-10 place-items-center rounded-lg ${metric.tone}`}><Icon size={17} /></span></div></article>; })}</section>

    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white lg:max-w-sm"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organization or owner..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect className="w-36" value={plan} onChange={(value) => setPlan(value as typeof plan)} options={[{ value: "All", label: "All plans", count: allOrganizations.length }, ...(["Starter", "Growth", "Business"] as const).map((item) => ({ value: item, label: item, count: allOrganizations.filter((org) => org.plan === item).length, dot: PLAN_DOT[item] }))]} />
          <FilterSelect className="w-40" value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: "All", label: "All status", count: allOrganizations.length }, ...(["Active", "Trial", "Past due"] as const).map((item) => ({ value: item, label: item, count: allOrganizations.filter((org) => org.status === item).length, dot: STATUS_DOT[item] }))]} />
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setView("grid")} aria-label="Grid view" className={`grid size-8 place-items-center rounded-md transition ${view === "grid" ? "bg-white text-violet-700 shadow-sm" : "text-slate-400"}`}><Grid3x3 size={14} /></button>
            <button onClick={() => setView("list")} aria-label="List view" className={`grid size-8 place-items-center rounded-md transition ${view === "list" ? "bg-white text-violet-700 shadow-sm" : "text-slate-400"}`}><List size={14} /></button>
          </div>
        </div>
      </div>
    </section>

    {view === "grid" ? <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((org) => <OrgCard key={org.id} org={org} isTop={org.id === topOrgId} />)}</section> : <OrgTable organizations={filtered} />}

    {filtered.length === 0 && <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-200 bg-white text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Building2 size={22} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">No organizations found</h3><p className="mt-1 text-[10px] text-slate-400">Try changing the current filters.</p></div></div>}

    {addOpen && <AddOrganizationDialog onClose={() => setAddOpen(false)} onCreated={(orgId) => { setAddOpen(false); router.push(`/super-admin/organizations/${orgId}`); router.refresh(); }} />}
  </div>;
}

function AddOrganizationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (orgId: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const owner = String(data.get("owner") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const tradingName = String(data.get("tradingName") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const panVat = String(data.get("panVat") ?? "").trim();
    setError("");

    startTransition(async () => {
      try {
        const orgId = await createOrganizationAccount({ owner, email, password, phone, tradingName, address, panVat });
        onCreated(orgId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create this organization. Please try again.");
      }
    });
  }

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
    <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 to-violet-900 px-6 py-5 text-white">
        <button type="button" onClick={onClose} disabled={isPending} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"><X size={15} /></button>
        <span className="grid size-10 place-items-center rounded-xl bg-white/15"><Building2 size={18} /></span>
        <h2 className="mt-3 text-base font-semibold">Add organization</h2>
        <p className="mt-0.5 text-[10px] text-violet-100">Create a new workspace account. They&apos;ll be able to log in with this email and password right away.</p>
      </div>
      <div className="max-h-[65vh] space-y-3.5 overflow-y-auto p-5">
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Owner name</span><input required name="owner" placeholder="Full name" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Business / trading name</span><input name="tradingName" placeholder="Optional" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Login email</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><Mail size={13} className="shrink-0 text-slate-400" /><input required name="email" type="email" placeholder="user@example.com" className="min-w-0 w-full bg-transparent text-[11px] text-slate-800 outline-none" /></span></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Phone</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><Phone size={13} className="shrink-0 text-slate-400" /><input required name="phone" placeholder="Phone number" className="min-w-0 w-full bg-transparent text-[11px] text-slate-800 outline-none" /></span></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Login password</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><Lock size={13} className="shrink-0 text-slate-400" /><input required name="password" type={showPassword ? "text" : "password"} minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" title="At least 8 characters, including an uppercase letter, a number, and a symbol." placeholder="Uppercase, number & symbol · 8+ characters" className="min-w-0 w-full bg-transparent text-[11px] text-slate-800 outline-none" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="shrink-0 text-slate-400 hover:text-violet-600">{showPassword ? <EyeOff size={13} /> : <Eye size={13} />}</button></span></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Address</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><MapPin size={13} className="shrink-0 text-slate-400" /><input name="address" placeholder="Optional" className="min-w-0 w-full bg-transparent text-[11px] text-slate-800 outline-none" /></span></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">PAN / VAT</span><input name="panVat" placeholder="Optional" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" disabled={isPending} onClick={onClose} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={isPending} className="h-9 rounded-lg bg-violet-600 px-4 text-[10px] font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700 disabled:opacity-60">{isPending ? "Creating..." : "Create organization"}</button></div>
    </form>
  </div>;
}

function OrgCard({ org, isTop }: { org: Organization; isTop: boolean }) {
  const progress = Math.round((org.daysLeft / org.totalDays) * 100);
  return <Link href={`/super-admin/organizations/${org.id}`} className={`group relative flex flex-col overflow-hidden rounded-xl border text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${isTop ? "border-violet-800 bg-gradient-to-b from-violet-700 to-violet-950 text-white" : `bg-white ${PLAN_CARD_BORDER[org.plan]}`}`}>

    {/* Identity row */}
    <div className={`flex items-center gap-3 p-4 pb-3 ${isTop ? "pt-4" : "pt-5"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm ${org.tone}`}>{org.initials}</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-semibold leading-tight ${isTop ? "text-white" : "text-slate-900"}`}>{org.name}</p>
        <p className={`truncate text-[9.5px] ${isTop ? "text-violet-200" : "text-slate-400"}`}>{org.owner}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isTop && <span className="flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wide text-amber-950">★ Top</span>}
        {org.isLive && <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wide ${isTop ? "bg-white/15 text-emerald-200" : "bg-emerald-50 text-emerald-600"}`}><span className="size-1 rounded-full bg-emerald-500" />Live user</span>}
        {org.isLocked && <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wide ${isTop ? "bg-white/15 text-rose-200" : "bg-rose-50 text-rose-600"}`}><Lock size={7} />Locked</span>}
        <span className={`rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide ${isTop ? "bg-white/15 text-white" : STATUS_TONE[org.status]}`}>{org.status}</span>
      </div>
    </div>

    {/* MRR headline */}
    <div className={`mx-4 flex items-center justify-between rounded-lg px-3 py-2.5 ${isTop ? "bg-white/10" : PLAN_SOFT_BG[org.plan]}`}>
      <div><p className={`text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-violet-200" : "text-slate-400"}`}>Amount paid</p><p className={`mt-0.5 text-[15px] font-bold tracking-tight ${isTop ? "text-white" : "text-slate-900"}`}>{org.subscriptionState === "Trial" || org.subscriptionState === "Not started" ? "Free trial" : org.mrr > 0 ? money(org.mrr) : "—"}</p></div>
      <span className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wide ${isTop ? "bg-white text-violet-800" : PLAN_TONE[org.plan]}`}>{org.plan}</span>
    </div>

    {/* Mini stats */}
    <div className="mx-4 mt-2.5 grid grid-cols-2 gap-2">
      <div className={`rounded-lg border p-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}><p className={`flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-violet-300" : "text-slate-400"}`}><CreditCard size={9} />Subscribed since</p><p className={`mt-0.5 truncate text-[11px] font-semibold ${isTop ? "text-white" : "text-slate-800"}`}>{org.subscriptionDate ?? "No subscription"}</p></div>
      <div className={`rounded-lg border p-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}><p className={`flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-violet-300" : "text-slate-400"}`}><Calendar size={9} />{org.subscriptionState === "Trial" ? "Free trial end" : "Renews"}</p><p className={`mt-0.5 truncate text-[11px] font-semibold ${isTop ? "text-white" : "text-slate-800"}`}>{org.renewsOn}</p></div>
    </div>

    {/* Contact — secondary */}
    <div className={`mx-4 mt-3 space-y-1.5 border-t pt-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}>
      <p className={`flex items-center gap-2 truncate text-[11px] font-medium ${isTop ? "text-violet-200" : "text-slate-600"}`}><Mail size={14} className="shrink-0" />{org.email}</p>
      <p className={`flex items-center gap-2 truncate text-[11px] font-medium ${isTop ? "text-violet-200" : "text-slate-600"}`}><Phone size={14} className="shrink-0" />{org.phone}</p>
    </div>

    {/* Subscription progress */}
    <div className="mx-4 mt-3">
      <div className="flex items-center justify-between text-[8px]"><span className={`font-medium ${isTop ? "text-violet-200" : "text-slate-500"}`}>Subscription</span><span className={`font-bold ${org.subscriptionState === "Not started" ? (isTop ? "text-violet-200" : "text-slate-400") : org.daysLeft <= 5 ? (isTop ? "text-rose-200" : "text-rose-600") : isTop ? "text-emerald-200" : "text-emerald-600"}`}>{org.subscriptionState === "Not started" ? "No plan yet" : org.daysLeft > 0 ? `${org.daysLeft}d left` : "Overdue"}</span></div>
      {org.subscriptionState !== "Not started" && <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${isTop ? "bg-white/15" : "bg-slate-100"}`}><div className={`h-full rounded-full ${org.daysLeft <= 5 ? "bg-rose-500" : isTop ? "bg-emerald-300" : "bg-emerald-500"}`} style={{ width: `${Math.max(progress, 4)}%` }} /></div>}
    </div>

    <div className={`mt-4 flex items-center justify-between px-4 py-3 text-[9px] font-semibold ${isTop ? "bg-white/10 text-white" : "bg-slate-50 text-slate-600 group-hover:bg-violet-50 group-hover:text-violet-700"}`}>View profile<ArrowUpRight size={12} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
  </Link>;
}

function OrgTable({ organizations }: { organizations: Organization[] }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
    <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Organization</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Members</th><th className="px-3 py-3">Amount paid</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Billing</th><th className="px-3 py-3 w-40">Subscription</th></tr></thead>
      <tbody>{organizations.map((org) => { const progress = Math.round((org.daysLeft / org.totalDays) * 100); return <tr key={org.id} className={`border-b border-l-2 border-slate-50 last:border-b-0 hover:bg-slate-50 ${PLAN_BORDER_TONE[org.plan]}`}>
        <td className="px-4 py-3"><Link href={`/super-admin/organizations/${org.id}`} className="flex items-center gap-2.5"><span className={`grid size-9 place-items-center rounded-lg bg-gradient-to-br text-[9px] font-semibold text-white ${org.tone}`}>{org.initials}</span><div><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 hover:text-violet-700">{org.name}{org.isLive && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wide text-emerald-600"><span className="size-1 rounded-full bg-emerald-500" />Live</span>}</p><p className="mt-0.5 text-[8px] text-slate-400">{org.owner}</p></div></Link></td>
        <td className="px-3 py-3 text-[9px] text-slate-600">{org.email}</td>
        <td className="px-3 py-3 text-[9px] text-slate-600">{org.phone}</td>
        <td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-[8px] font-semibold ${PLAN_TONE[org.plan]}`}>{org.plan}</span></td>
        <td className="px-3 py-3 text-[9px] text-slate-500">{org.members}</td>
        <td className="px-3 py-3 text-[9px] font-semibold text-slate-700">{org.subscriptionState === "Trial" || org.subscriptionState === "Not started" ? <span className="text-blue-600">Free trial</span> : org.mrr > 0 ? money(org.mrr) : "—"}</td>
        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[org.status]}`}>{org.status}</span></td>
        <td className="px-3 py-3">{org.subscriptionState && <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${SUBSCRIPTION_STATE_TONE[org.subscriptionState]}`}>{org.subscriptionState === "Trial" ? "Free trial" : org.subscriptionState}</span>}</td>
        <td className="px-3 py-3">
          <div className="flex items-center justify-between text-[8px] font-medium"><span className="text-slate-500">{org.renewsOn}</span><span className={org.subscriptionState === "Not started" ? "text-slate-400" : org.daysLeft <= 5 ? "text-rose-600" : "text-emerald-600"}>{org.subscriptionState === "Not started" ? "—" : org.daysLeft > 0 ? `${org.daysLeft}d` : "Overdue"}</span></div>
          {org.subscriptionState !== "Not started" && <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${org.daysLeft <= 5 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(progress, 4)}%` }} /></div>}
        </td>
      </tr>; })}</tbody>
    </table></div>
  </section>;
}
