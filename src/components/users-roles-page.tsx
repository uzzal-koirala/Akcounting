"use client";

import { AlertCircle, Check, Crown, Eye, KeyRound, Mail, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserPlus, UsersRound, X } from "lucide-react";
import { useState, useTransition } from "react";

import { UpgradeModal } from "@/components/upgrade-gate";
import { FilterSelect } from "@/components/filter-select";
import { canAddTeamMembers, planLimits, type PlanName } from "@/lib/plan";
import { createTeamMember, removeTeamMember, resendTeamInvite, updateTeamMember, type TeamMemberRecord } from "@/actions/team-members";

type Role = TeamMemberRecord["role"];
const roleDefinitions = [
  { role: "Owner" as Role, description: "Full control over billing, security, and all workspace data.", color: "from-violet-600 to-indigo-600", permissions: ["Full workspace access", "Manage billing", "Manage users", "Delete workspace"] },
  { role: "Administrator" as Role, description: "Manage users, settings, and all accounting modules.", color: "from-blue-600 to-cyan-500", permissions: ["Manage users", "All accounting data", "Workspace settings", "Export reports"] },
  { role: "Accountant" as Role, description: "Create and reconcile financial records and reports.", color: "from-emerald-600 to-teal-500", permissions: ["Income & expenses", "Invoices", "Reports", "Reconciliation"] },
  { role: "Manager" as Role, description: "Review business activity and approve team workflows.", color: "from-amber-500 to-orange-500", permissions: ["View financials", "Approve expenses", "Manage employees", "View reports"] },
  { role: "Viewer" as Role, description: "Read-only access to selected reports and dashboards.", color: "from-slate-500 to-slate-700", permissions: ["View dashboard", "View reports", "No editing", "No exports"] },
];

const TONES = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700", "bg-fuchsia-100 text-fuchsia-700"];
function toneFor(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}
function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

export function UsersRolesPage({ plan, initialMembers, isOwner }: { plan: PlanName; initialMembers: TeamMemberRecord[]; isOwner: boolean }) {
  const [users, setUsers] = useState(initialMembers);
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeamMemberRecord | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = users.filter((user) => (roleFilter === "All" || user.role === roleFilter) && `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  const teamMemberLimit = planLimits(plan).maxTeamMembers;
  const addUserLocked = !canAddTeamMembers(users.length, plan);
  function requestAddUser() { if (addUserLocked) setUpgradeOpen(true); else { setError(""); setAddOpen(true); } }

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 4500); }

  function createUser(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const created = await createTeamMember(formData);
        setUsers((items) => [...items, created]);
        setAddOpen(false);
        flash(`Invite sent to ${created.email} — they'll set their own password.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not invite this user. Please try again.");
      }
    });
  }

  function updateUser(formData: FormData) {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      try {
        const updated = await updateTeamMember(selected.id, formData);
        setUsers((items) => items.map((user) => user.id === updated.id ? updated : user));
        setDialogMode(null);
        setSelected(null);
        flash(`${updated.name}'s access was updated.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update this user. Please try again.");
      }
    });
  }

  function resendInvite(user: TeamMemberRecord) {
    setBusyId(user.id);
    startTransition(async () => {
      try {
        const updated = await resendTeamInvite(user.id);
        setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
        flash(`Invite resent to ${updated.email}.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not resend the invite. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function removeUser(user: TeamMemberRecord) {
    setMenuId(null);
    setBusyId(user.id);
    startTransition(async () => {
      try {
        await removeTeamMember(user.id);
        setUsers((items) => items.filter((item) => item.id !== user.id));
        flash(`${user.name} was removed from your workspace.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not remove this user. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  }

  const userFields = (user?: TeamMemberRecord) => <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Full name<input required name="name" defaultValue={user?.name} placeholder="Team member name" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-violet-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Email address<input required name="email" type="email" defaultValue={user?.email} disabled={Boolean(user)} placeholder="name@company.com" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Role<select name="role" defaultValue={user?.role ?? "Viewer"} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none">{roleDefinitions.filter((item) => item.role !== "Owner").map((item) => <option key={item.role}>{item.role}</option>)}</select></label>
    {user && <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Status<select name="status" defaultValue={user.status} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none"><option>Active</option><option>Invited</option><option>Suspended</option></select></label>}
  </div>;

  return <div className="users-roles-page space-y-5">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#312e81] via-violet-700 to-indigo-600 p-6 text-white shadow-xl shadow-violet-200"><div className="absolute -right-20 -top-24 size-72 rounded-full border-[40px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur"><ShieldCheck size={18} /></span><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100">Workspace access</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Users & Roles</h1><p className="mt-1 max-w-xl text-xs text-violet-100">Control who can access your accounting workspace and what they can do.</p></div>{isOwner && <button onClick={requestAddUser} className="relative flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[10px] font-semibold text-violet-700 shadow-xl"><UserPlus size={15} />Create new user{addUserLocked && <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-white" title={teamMemberLimit === 1 ? "Premium feature — locked on the Starter Package" : `Your plan allows up to ${teamMemberLimit} users`}><Crown size={11} /></span>}</button>}</div></header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Total users</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{users.length}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600 sm:size-9"><UsersRound size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet-500" /><p className="text-[10px] text-slate-400">Across your workspace</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Active users</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{users.filter((user) => user.status === "Active").length}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 sm:size-9"><UserCheck size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /><p className="text-[10px] text-slate-400">Currently signed in access</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-amber-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Pending invites</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{users.filter((user) => user.status === "Invited").length}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 sm:size-9"><Mail size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-400" /><p className="text-[10px] text-slate-400">Awaiting acceptance</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-blue-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Custom roles</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{roleDefinitions.length}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 sm:size-9"><KeyRound size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-blue-500" /><p className="text-[10px] text-slate-400">Defined permission levels</p></div></article>
    </section>

    {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-700"><Check size={14} className="shrink-0" />{notice}</div>}
    {error && !addOpen && dialogMode !== "edit" && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] font-medium text-rose-700"><AlertCircle size={14} className="shrink-0" />{error}</div>}

    <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1"><button onClick={() => setTab("users")} className={`flex h-9 items-center gap-2 rounded-lg px-4 text-[10px] font-semibold ${tab === "users" ? "bg-violet-50 text-violet-700" : "text-slate-400"}`}><UsersRound size={14} />All users</button><button onClick={() => setTab("roles")} className={`flex h-9 items-center gap-2 rounded-lg px-4 text-[10px] font-semibold ${tab === "roles" ? "bg-violet-50 text-violet-700" : "text-slate-400"}`}><KeyRound size={14} />Roles & permissions</button></div>

    {tab === "users" && <section className="overflow-visible rounded-2xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Workspace users</h2><p className="mt-0.5 text-[9px] text-slate-400">Manage access, roles, and account status</p></div><div className="flex gap-2"><label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." className="w-full bg-transparent text-[9px] outline-none" /></label><FilterSelect className="w-44" value={roleFilter} onChange={(value) => setRoleFilter(value as typeof roleFilter)} options={[{ value: "All", label: "All roles", count: users.length }, ...roleDefinitions.map((item) => ({ value: item.role, label: item.role, count: users.filter((user) => user.role === item.role).length, dot: `bg-gradient-to-br ${item.color}` }))]} /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/60 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last active</th><th className="px-4 py-3" /></tr></thead><tbody>{filtered.map((user) => <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-full text-[9px] font-semibold ${toneFor(user.id)}`}>{initialsOf(user.name)}</span><div><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-800">{user.name}{user.isYou && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-violet-700">You</span>}</p><p className="mt-0.5 text-[8px] text-slate-400">{user.email}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-semibold text-violet-700">{user.role}</span></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${user.status === "Active" ? "bg-emerald-50 text-emerald-600" : user.status === "Invited" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><i className="size-1 rounded-full bg-current" />{user.status}</span></td><td className="px-4 py-3.5 text-[9px] text-slate-500">{user.lastActive}</td><td className="relative px-4 py-3.5">{isOwner && user.role !== "Owner" && <button onClick={() => setMenuId((id) => id === user.id ? null : user.id)} disabled={pending && busyId === user.id} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><MoreHorizontal size={15} /></button>}{menuId === user.id && <div className="absolute right-8 top-8 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button onClick={() => { setSelected(user); setDialogMode("view"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Eye size={13} />View profile</button><button onClick={() => { setSelected(user); setDialogMode("edit"); setError(""); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit access</button>{user.status === "Invited" && <button onClick={() => { resendInvite(user); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><RefreshCw size={13} />Resend invite</button>}<button onClick={() => removeUser(user)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Remove user</button></div>}</td></tr>)}</tbody></table></div><footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-[9px] text-slate-400">Showing {filtered.length} of {users.length} users</p>{isOwner && <button onClick={requestAddUser} className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-700">{addUserLocked ? <Crown size={12} className="text-amber-500" /> : <Plus size={12} />}Invite another user</button>}</footer></section>}

    {tab === "roles" && <section className="space-y-4"><div className="relative overflow-hidden rounded-2xl bg-[#0a1e3f] p-5 text-white"><div className="absolute -right-12 -top-16 size-48 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-violet-300 ring-1 ring-white/10"><KeyRound size={19} /></span><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-violet-300">Access control</p><h2 className="mt-1 text-lg font-semibold">Roles & permissions</h2><p className="mt-1 text-[9px] text-slate-300">Define clear responsibilities and protect sensitive financial information.</p></div></div><div className="flex gap-2"><div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5"><p className="text-[7px] text-slate-400">Available roles</p><p className="mt-0.5 text-sm font-semibold">{roleDefinitions.length}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5"><p className="text-[7px] text-slate-400">Assigned users</p><p className="mt-0.5 text-sm font-semibold">{users.length}</p></div></div></div></div><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{roleDefinitions.map((item, index) => { const assigned = users.filter((user) => user.role === item.role); const access = index < 2 ? "Full access" : index < 4 ? "Standard access" : "Read only"; return <article key={item.role} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.color}`} /><div className="flex items-start justify-between"><span className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${item.color}`}><ShieldCheck size={18} /></span><span className={`rounded-full px-2.5 py-1 text-[7px] font-semibold ${access === "Full access" ? "bg-violet-50 text-violet-700" : access === "Read only" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>{access}</span></div><div className="mt-4 flex items-center justify-between"><div><h3 className="text-[13px] font-semibold text-slate-900">{item.role}</h3><p className="mt-1 text-[8px] text-slate-400">{assigned.length} {assigned.length === 1 ? "user" : "users"} assigned</p></div><div className="flex -space-x-2">{assigned.slice(0, 3).map((user) => <span key={user.id} title={user.name} className={`grid size-7 place-items-center rounded-full border-2 border-white text-[7px] font-semibold ${toneFor(user.id)}`}>{initialsOf(user.name)}</span>)}{assigned.length === 0 && <span className="grid size-7 place-items-center rounded-full border border-dashed border-slate-300 text-slate-300"><UserPlus size={11} /></span>}</div></div><p className="mt-4 min-h-10 text-[9px] leading-4 text-slate-500">{item.description}</p><div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="mb-2.5 flex items-center justify-between"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Key permissions</p><span className="text-[7px] font-semibold text-slate-400">{item.permissions.length} enabled</span></div><div className="space-y-2.5">{item.permissions.map((permission) => <div key={permission} className="flex items-center gap-2"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={9} strokeWidth={3} /></span><p className="text-[8px] font-medium text-slate-600">{permission}</p></div>)}</div></div></article>; })}</div><div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm"><ShieldCheck size={15} /></span><div><p className="text-[9px] font-semibold text-slate-700">Use the least access needed</p><p className="mt-0.5 text-[8px] leading-4 text-slate-500">Give each team member only the permissions required for their work. Owner access should remain limited.</p></div></div></section>}

    {dialogMode === "view" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex justify-end"><button onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div><div className="-mt-3 text-center"><span className={`mx-auto grid size-16 place-items-center rounded-full text-base font-semibold ${toneFor(selected.id)}`}>{initialsOf(selected.name)}</span><h2 className="mt-3 text-xl font-semibold text-slate-900">{selected.name}</h2><p className="mt-1 text-[10px] text-slate-400">{selected.email}</p><span className="mt-3 inline-block rounded-full bg-violet-50 px-3 py-1 text-[9px] font-semibold text-violet-700">{selected.role}</span></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Status</p><p className="mt-1 text-[10px] font-semibold text-slate-700">{selected.status}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Last active</p><p className="mt-1 text-[10px] font-semibold text-slate-700">{selected.lastActive}</p></div></div>{isOwner && selected.role !== "Owner" && <button onClick={() => setDialogMode("edit")} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 text-[10px] font-semibold text-white"><Pencil size={13} />Edit user access</button>}</div></div>}
    {dialogMode === "edit" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form action={updateUser} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Edit access</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{selected.name}</h2></div><button type="button" onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{userFields(selected)}{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDialogMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-violet-700 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button></div></form></div>}
    {addOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form action={createUser} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Team invitation</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Create new user</h2><p className="mt-1 text-[10px] text-slate-400">Add a user and choose their workspace access.</p></div><button type="button" onClick={() => setAddOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{userFields()}{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}<div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3"><Mail size={14} className="mt-0.5 text-blue-600" /><p className="text-[8px] leading-4 text-blue-700">An invitation email will be sent to the new user with instructions to join this workspace.</p></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-5 text-[10px] font-semibold text-white disabled:opacity-60"><UserCheck size={13} />{pending ? "Sending invite..." : "Create user"}</button></div></form></div>}
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature={teamMemberLimit === 1 ? "adding team members" : "team members"} reason={teamMemberLimit === 1 ? "locked" : "limit"} limit={teamMemberLimit} plan={plan} />
  </div>;
}
