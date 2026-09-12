"use client";

import { AlertTriangle, Bell, Check, CheckCheck, ChevronRight, CircleCheck, Info, Mail, Search, ShieldCheck, Smartphone, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { dismissNotification, markAllNotificationsRead, markNotificationRead, type UserNotification } from "@/actions/notifications";

type NotifType = UserNotification["type"];
type FilterType = "All" | NotifType;

const TYPE_META: Record<NotifType, { icon: typeof Info; tone: string }> = {
  Info: { icon: Info, tone: "bg-blue-50 text-blue-600" },
  Success: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600" },
  Warning: { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600" },
  Urgent: { icon: XCircle, tone: "bg-rose-50 text-rose-600" },
};

function groupFor(createdAtISO: string): "Today" | "Yesterday" | "Earlier" {
  const created = new Date(createdAtISO);
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(created)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

export function NotificationsPage({ initialNotifications }: { initialNotifications: UserNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [category, setCategory] = useState<FilterType>("All");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const unreadCount = notifications.filter((item) => item.unread).length;

  const filtered = useMemo(() => notifications.filter((item) => (category === "All" || item.type === category) && (!unreadOnly || item.unread) && `${item.title} ${item.message}`.toLowerCase().includes(query.toLowerCase())), [notifications, category, query, unreadOnly]);
  const groups = (["Today", "Yesterday", "Earlier"] as const).map((name) => ({ name, items: filtered.filter((item) => groupFor(item.createdAtISO) === name) })).filter((group) => group.items.length);

  async function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
    await markAllNotificationsRead();
  }

  async function toggleRead(item: UserNotification) {
    const nextUnread = !item.unread;
    setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, unread: nextUnread } : current));
    await markNotificationRead(item.id, !nextUnread);
  }

  async function removeNotification(id: string) {
    setNotifications((items) => items.filter((current) => current.id !== id));
    await dismissNotification(id);
  }

  return <div className="mx-auto max-w-[1450px] space-y-5">
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between"><div className="pointer-events-none absolute -right-10 -top-20 size-52 rounded-full bg-violet-100/60 blur-2xl" /><div className="relative flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Bell size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Activity center</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Notifications</h1><p className="mt-1 text-xs text-slate-500">Updates and announcements from the AKCounting team.</p></div></div><div className="relative flex items-center gap-2"><button disabled={!unreadCount} onClick={markAllRead} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck size={15} />Mark all as read</button></div></div>
      <div className="grid border-t border-slate-100 bg-slate-50/60 sm:grid-cols-3"><div className="px-6 py-4"><p className="text-[10px] text-slate-400">Unread notifications</p><p className="mt-1 text-lg font-semibold text-violet-700">{unreadCount}</p></div><div className="border-slate-200 px-6 py-4 sm:border-l"><p className="text-[10px] text-slate-400">Today&apos;s updates</p><p className="mt-1 text-lg font-semibold text-slate-800">{notifications.filter((item) => groupFor(item.createdAtISO) === "Today").length}</p></div><div className="border-slate-200 px-6 py-4 sm:border-l"><p className="text-[10px] text-slate-400">Urgent alerts</p><p className="mt-1 text-lg font-semibold text-rose-600">{notifications.filter((item) => item.type === "Urgent").length}</p></div></div>
    </header>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{(["All", "Info", "Success", "Warning", "Urgent"] as const).map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold transition ${category === item ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item}</button>)}</div><div className="flex flex-col gap-2 sm:flex-row"><label className="flex h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications..." className="w-full bg-transparent text-xs text-slate-700 outline-none" /></label><button onClick={() => setUnreadOnly((value) => !value)} className={`h-10 rounded-lg border px-4 text-[11px] font-semibold transition ${unreadOnly ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}>Unread only</button></div></div>

      <div className="p-4 sm:p-5">{groups.map((group) => <div key={group.name} className="mb-6 last:mb-0"><div className="mb-3 flex items-center gap-3 px-1"><h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{group.name}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{group.items.length}</span><span className="h-px flex-1 bg-slate-100" /></div><div className="space-y-2">{group.items.map((item) => { const meta = TYPE_META[item.type]; const Icon = meta.icon; return <article key={item.id} className={`group relative flex items-start gap-3 rounded-xl border px-3 py-4 transition sm:gap-4 sm:px-4 ${item.unread ? "border-violet-100 bg-violet-50/55 shadow-[0_3px_12px_rgba(124,58,237,0.045)]" : "border-transparent bg-white hover:border-slate-100 hover:bg-slate-50"}`}><button aria-label="Toggle read status" title={item.unread ? "Mark as read" : "Mark as unread"} onClick={() => toggleRead(item)} className={`mt-1.5 size-2 shrink-0 rounded-full transition ${item.unread ? "bg-violet-600 shadow-[0_0_0_4px_rgba(124,58,237,0.1)]" : "bg-slate-200 hover:bg-violet-300"}`} /><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${meta.tone}`}><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className={`text-[13px] text-slate-800 ${item.unread ? "font-semibold" : "font-medium"}`}>{item.title}</h3>{item.unread && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-700">New</span>}</div><p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">{item.message}</p></div><time className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[9px] text-slate-400">{item.time}</time></div></div><button aria-label="Delete notification" onClick={() => removeNotification(item.id)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"><Trash2 size={14} /></button></article>; })}</div></div>)}{filtered.length === 0 && <div className="grid min-h-72 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Check size={22} /></span><h2 className="mt-4 text-sm font-semibold text-slate-800">You&apos;re all caught up</h2><p className="mt-1 text-xs text-slate-400">No notifications match your current filters.</p></div></div>}</div>
    </section><aside className="space-y-4 xl:sticky xl:top-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)]"><div><h2 className="text-sm font-semibold text-slate-900">Delivery preferences</h2><p className="mt-1 text-[10px] leading-4 text-slate-400">Control how important updates reach you.</p></div><div className="mt-4 space-y-2"><PreferenceRow icon={Mail} title="Email alerts" description="Important updates" checked={emailAlerts} onChange={() => setEmailAlerts((value) => !value)} /><PreferenceRow icon={Smartphone} title="Push alerts" description="Real-time browser updates" checked={pushAlerts} onChange={() => setPushAlerts((value) => !value)} /></div><Link href="/settings" className="mt-4 flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700">Manage all preferences <ChevronRight size={12} /></Link></section><section className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-950 p-5 text-white shadow-lg"><span className="grid size-9 place-items-center rounded-lg bg-white/10 text-violet-200"><ShieldCheck size={16} /></span><h2 className="mt-4 text-sm font-semibold">Account alerts are protected</h2><p className="mt-1 text-[10px] leading-5 text-slate-300">Critical announcements from AKCounting always reach you here.</p></section></aside></div>
  </div>;
}

function PreferenceRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Bell; title: string; description: string; checked: boolean; onChange: () => void }) {
  return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm"><Icon size={14} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-slate-700">{title}</p><p className="mt-0.5 truncate text-[8px] text-slate-400">{description}</p></div><button role="switch" aria-checked={checked} onClick={onChange} className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-violet-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${checked ? "left-[18px]" : "left-0.5"}`} /></button></div>;
}
