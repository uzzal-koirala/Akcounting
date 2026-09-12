"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Check, Clock3, Mail, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";

import { createAdminUser, resendAdminInvite, type AdminUserRecord } from "@/actions/admin-users";
import { FilterSelect } from "@/components/filter-select";

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
}

const TONES = ["from-violet-500 to-violet-700", "from-blue-500 to-blue-700", "from-emerald-500 to-emerald-700", "from-amber-500 to-amber-700", "from-rose-500 to-rose-700", "from-cyan-500 to-cyan-700"];
function toneFor(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

export function PlatformUsersPage({ initialAdmins }: { initialAdmins: AdminUserRecord[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "Pending">("All");
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeCount = admins.filter((admin) => !admin.pendingSetup).length;
  const pendingCount = admins.filter((admin) => admin.pendingSetup).length;

  const filtered = useMemo(() => admins.filter((admin) =>
    (status === "All" || (status === "Active" ? !admin.pendingSetup : admin.pendingSetup)) &&
    `${admin.name} ${admin.email}`.toLowerCase().includes(query.toLowerCase())
  ), [admins, query, status]);

  function submitAdmin(data: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const created = await createAdminUser(data);
        setAdmins((current) => [...current, created]);
        setAddOpen(false);
        setNotice(`Invite sent to ${created.email} — they'll set their own password.`);
        window.setTimeout(() => setNotice(""), 4500);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create this admin. Please try again.");
      }
    });
  }

  function resendInvite(admin: AdminUserRecord) {
    setResendingId(admin.id);
    startTransition(async () => {
      try {
        const updated = await resendAdminInvite(admin.id);
        setAdmins((current) => current.map((item) => item.id === updated.id ? updated : item));
        setNotice(`Invite resent to ${updated.email}.`);
        window.setTimeout(() => setNotice(""), 4500);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not resend the invite. Please try again.");
      } finally {
        setResendingId(null);
      }
    });
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-[#0a1e3f] via-[#0d2450] to-violet-950 shadow-[0_16px_40px_rgba(2,6,23,0.25)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-white/10 text-violet-200 ring-1 ring-white/15"><ShieldCheck size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">Access control</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Users &amp; roles</h1><p className="mt-1 text-xs text-slate-300">Everyone with access to the AKCounting super admin panel.</p></div></div>
        <button onClick={() => { setError(""); setAddOpen(true); }} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[11px] font-semibold text-violet-800 shadow-md transition hover:bg-violet-50"><Plus size={15} />Add admin</button>
      </div>
    </header>

    {notice && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-700"><Check size={14} className="shrink-0" />{notice}</div>}
    {error && !addOpen && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] font-medium text-rose-700"><X size={14} className="shrink-0" />{error}</div>}

    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">Total super admins</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{admins.length}</p></div><span className="grid size-10 place-items-center rounded-lg bg-violet-50 text-violet-600"><ShieldCheck size={17} /></span></div></article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">Active accounts</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{activeCount}</p></div><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Check size={17} /></span></div></article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-amber-200 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">Pending invites</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{pendingCount}</p></div><span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-600"><Clock3 size={17} /></span></div></article>
    </section>

    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">Super admin accounts</h2><p className="mt-0.5 text-[9px] text-slate-400">These accounts can sign in to /super-admin and manage the whole platform.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admins..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label>
          <FilterSelect className="w-40" value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: "All", label: "All status", count: admins.length }, { value: "Active", label: "Active", count: activeCount, dot: "bg-emerald-500" }, { value: "Pending", label: "Pending", count: pendingCount, dot: "bg-amber-500" }]} />
        </div>
      </div>

      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Admin</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Joined</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr></thead>
        <tbody>{filtered.map((admin) => <tr key={admin.id} className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70">
          <td className="px-4 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm ${toneFor(admin.id)}`}>{initialsOf(admin.name)}</span><div><p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">{admin.name}{admin.isYou && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-700">You</span>}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Mail size={10} />{admin.email}</p></div></div></td>
          <td className="px-3 py-3.5 text-[12px] text-slate-500">{admin.phone || "—"}</td>
          <td className="px-3 py-3.5 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400" />{admin.joined}</span></td>
          <td className="px-3 py-3.5">{admin.pendingSetup ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700"><Clock3 size={11} />Invite pending</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><Check size={11} />Active</span>}</td>
          <td className="px-3 py-3.5">{admin.pendingSetup && !admin.isYou && <button onClick={() => resendInvite(admin)} disabled={pending && resendingId === admin.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={12} className={pending && resendingId === admin.id ? "animate-spin" : ""} />{pending && resendingId === admin.id ? "Sending..." : "Resend invite"}</button>}</td>
        </tr>)}</tbody>
      </table></div>
      {filtered.length === 0 && <div className="p-16 text-center"><UsersRound size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-[10px] font-semibold text-slate-600">No admins found</p><p className="mt-1 text-[8px] text-slate-400">Try a different search or filter.</p></div>}
      <footer className="border-t border-slate-100 px-4 py-3"><p className="text-[10px] text-slate-400">Showing <strong className="text-slate-600">{filtered.length}</strong> of {admins.length} super admin accounts</p></footer>
    </section>

    {addOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setAddOpen(false); }}>
      <form action={submitAdmin} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1e3f] to-violet-950 px-6 py-6 text-white">
          <button type="button" onClick={() => setAddOpen(false)} disabled={pending} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"><X size={15} /></button>
          <span className="grid size-10 place-items-center rounded-xl bg-white/15"><UserRound size={18} /></span>
          <h2 className="mt-3 text-base font-semibold">Add super admin</h2>
          <p className="mt-0.5 text-[10px] text-violet-100">We&apos;ll email them a link to set their own password and sign in.</p>
        </div>
        <div className="space-y-3.5 p-6">
          <label className="block"><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Full name</span><input required name="name" placeholder="Alex Morgan" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
          <label className="block"><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Email address</span><input required name="email" type="email" placeholder="admin@yourdomain.com" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" onClick={() => setAddOpen(false)} disabled={pending} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button disabled={pending} className="flex h-9 items-center gap-2 rounded-lg bg-[#061d40] px-4 text-[10px] font-semibold text-white shadow-sm hover:bg-[#0b2a56] disabled:opacity-60">{pending ? "Sending invite..." : <><Mail size={13} />Send invite</>}</button></div>
      </form>
    </div>}
  </div>;
}
