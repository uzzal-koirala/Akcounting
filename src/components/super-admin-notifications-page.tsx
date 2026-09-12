"use client";

import { AlertTriangle, Bell, CheckCircle2, Info, Megaphone, Send, Sparkles, Users2, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { createNotification, listNotificationsAdmin, type AdminNotification, type Audience, type NotifType } from "@/actions/notifications";

const TYPE_META: Record<NotifType, { icon: typeof Info; tone: string; dot: string }> = {
  Info: { icon: Info, tone: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  Success: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  Warning: { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  Urgent: { icon: XCircle, tone: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
};

const AUDIENCES: Audience[] = ["All", "Starter Package", "Growth Package", "Premium Package"];

export function SuperAdminNotificationsPage({ initialHistory }: { initialHistory: AdminNotification[] }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotifType>("Info");
  const [audience, setAudience] = useState<Audience>("All");
  const [history, setHistory] = useState(initialHistory);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  const totalSent = useMemo(() => history.reduce((sum, item) => sum + item.recipients, 0), [history]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("title", title.trim());
      data.set("message", message.trim());
      data.set("type", type);
      data.set("audience", audience);
      await createNotification(data);
      const refreshed = await listNotificationsAdmin();
      setHistory(refreshed);
      setSent(true);
      setTitle("");
      setMessage("");
      window.setTimeout(() => setSent(false), 2500);
    } catch {
      setError("Could not send this notification. Try again.");
    } finally {
      setSending(false);
    }
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-3 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Bell size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Communication</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Notifications</h1><p className="mt-1 text-xs text-slate-500">Broadcast updates, alerts and reminders to your customers.</p></div></div>
        <div className="flex gap-4 text-right"><div><p className="text-[9px] text-slate-400">Notifications sent</p><p className="text-lg font-semibold text-slate-900">{history.length}</p></div><div><p className="text-[9px] text-slate-400">Total deliveries</p><p className="text-lg font-semibold text-slate-900">{totalSent.toLocaleString()}</p></div></div>
      </div>
    </header>

    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Megaphone size={15} className="text-violet-600" />Compose notification</h2>
        <form onSubmit={handleSend} className="mt-4 space-y-4">
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="e.g. Scheduled maintenance tonight" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>

          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={4} placeholder="Write the notification message customers will see..." className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-[11px] leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Type</span>
            <div className="grid grid-cols-4 gap-2">{(Object.keys(TYPE_META) as NotifType[]).map((item) => { const ItemIcon = TYPE_META[item].icon; return <button key={item} type="button" onClick={() => setType(item)} className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition ${type === item ? `border-transparent ${TYPE_META[item].tone} ring-2 ring-offset-1 ring-violet-200` : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}><ItemIcon size={14} /><span className="text-[8px] font-semibold">{item}</span></button>; })}</div>
          </div>

          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Audience</span><select value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100">{AUDIENCES.map((item) => <option key={item} value={item}>{item === "All" ? "All customers" : item}</option>)}</select><span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-slate-400"><Users2 size={11} />{audience === "All" ? "Will reach every customer" : `Only customers on ${audience}`}</span></label>

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-600">{error}</p>}
          <button type="submit" disabled={sending || !title.trim() || !message.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[11px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50">{sending ? "Sending..." : sent ? <><CheckCircle2 size={15} />Sent!</> : <><Send size={14} />Send notification</>}</button>
        </form>
      </article>

      <div className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><Sparkles size={11} className="text-violet-500" />Live preview</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${meta.tone}`}><Icon size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-800">{title || "Your notification title"}</p>
              <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-500">{message || "The message customers will see appears here as you type."}</p>
              <p className="mt-2 text-[8px] text-slate-400">Just now · {audience === "All" ? "All customers" : audience}</p>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="text-sm font-semibold text-slate-900">Notification history</h2><span className="text-[9px] text-slate-400">{history.length} sent</span></div>
          <div className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto">{history.map((item) => { const itemMeta = TYPE_META[item.type]; const ItemIcon = itemMeta.icon; return <div key={item.id} className="flex items-start gap-3 p-4">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${itemMeta.tone}`}><ItemIcon size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><p className="truncate text-[10px] font-semibold text-slate-800">{item.title}</p><span className={`size-1.5 shrink-0 rounded-full ${itemMeta.dot}`} /></div>
              <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-slate-500">{item.message}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[8px] text-slate-400"><span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{item.audience === "All" ? "All customers" : item.audience}</span><span>{item.recipients.toLocaleString()} recipients</span><span>·</span><span>{item.time}</span></div>
            </div>
          </div>; })}
          {history.length === 0 && <p className="p-6 text-center text-[10px] text-slate-400">No notifications sent yet.</p>}
          </div>
        </article>
      </div>
    </section>
  </div>;
}
