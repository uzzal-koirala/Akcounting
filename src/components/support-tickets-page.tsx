"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, CircleDot, Clock3, Headphones, Mail, MessageSquare, Paperclip, Search, Send, Sparkles, Tag, X } from "lucide-react";

import { FilterSelect } from "@/components/filter-select";
import { replyToTicketAsAdmin, updateTicketStatus, type AdminTicketRecord } from "@/actions/admin-support";
import type { SupportTicketStatus } from "@/actions/support";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const priorityStyle = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-slate-100 text-slate-600" };
const priorityGradient = { High: "from-rose-500 to-orange-400", Medium: "from-amber-400 to-yellow-300", Low: "from-slate-300 to-slate-200" };
const priorityCardBorder = { High: "border-rose-100 hover:border-rose-200", Medium: "border-amber-100 hover:border-amber-200", Low: "border-slate-200 hover:border-violet-200" };
const priorityIconTone = { High: "bg-rose-50 text-rose-600", Medium: "bg-amber-50 text-amber-600", Low: "bg-slate-100 text-slate-500" };
const priorityIcon = { High: AlertCircle, Medium: Clock3, Low: CircleDot };
const statusStyle = { Open: "bg-blue-50 text-blue-700", "In progress": "bg-violet-50 text-violet-700", Resolved: "bg-emerald-50 text-emerald-700" };
const statusDot = { Open: "bg-blue-500", "In progress": "bg-violet-500", Resolved: "bg-emerald-500" };
const statusHeaderTone = { Open: "from-blue-600 to-blue-800", "In progress": "from-violet-600 to-violet-900", Resolved: "from-emerald-600 to-emerald-800" };

function avatarInitials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function SupportTicketsPage({ initialTickets, initialTicketId = null }: { initialTickets: AdminTicketRecord[]; initialTicketId?: string | null }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [syncedTickets, setSyncedTickets] = useState(initialTickets);
  if (initialTickets !== syncedTickets) { setSyncedTickets(initialTickets); setTickets(initialTickets); }

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | SupportTicketStatus>("All");
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId);
  const [syncedTicketId, setSyncedTicketId] = useState(initialTicketId);
  if (initialTicketId !== syncedTicketId) { setSyncedTicketId(initialTicketId); setSelectedId(initialTicketId); }
  const [panelVisible, setPanelVisible] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [statusPending, setStatusPending] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const filtered = useMemo(() => tickets.filter((ticket) => (filter === "All" || ticket.status === filter) && `${ticket.id} ${ticket.subject} ${ticket.requester} ${ticket.organization}`.toLowerCase().includes(query.toLowerCase())), [tickets, query, filter]);
  const counts = { open: tickets.filter((item) => item.status === "Open").length, progress: tickets.filter((item) => item.status === "In progress").length, resolved: tickets.filter((item) => item.status === "Resolved").length, urgent: tickets.filter((item) => item.priority === "High" && item.status !== "Resolved").length };
  const stats = [
    { label: "Open tickets", value: counts.open, note: "Awaiting first response", icon: CircleDot, tone: "bg-blue-50 text-blue-600" },
    { label: "In progress", value: counts.progress, note: "Currently being handled", icon: Clock3, tone: "bg-violet-50 text-violet-600" },
    { label: "Urgent attention", value: counts.urgent, note: "High-priority unresolved", icon: AlertCircle, tone: "bg-rose-50 text-rose-600" },
    { label: "Resolved", value: counts.resolved, note: "Closed successfully", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  ];

  useEffect(() => {
    if (!selectedId) return;
    const timer = requestAnimationFrame(() => setPanelVisible(true));
    return () => cancelAnimationFrame(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function onPointerDown(event: MouseEvent) { if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setStatusMenuOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [statusMenuOpen]);

  function openTicket(ticket: AdminTicketRecord) { setReply(""); setReplyError(""); setStatusMenuOpen(false); setSelectedId(ticket.id); }
  function closePanel() {
    setPanelVisible(false);
    window.setTimeout(() => setSelectedId(null), 250);
  }

  function changeStatus(ticket: AdminTicketRecord, status: SupportTicketStatus) {
    setTickets((items) => items.map((item) => item.id === ticket.id ? { ...item, status } : item));
    setStatusPending(true);
    startTransition(async () => {
      try {
        await updateTicketStatus(ticket.id, status);
      } finally {
        setStatusPending(false);
      }
    });
  }

  function sendReply(ticket: AdminTicketRecord) {
    const message = reply.trim();
    if (!message) return;
    setSending(true);
    setReplyError("");
    startTransition(async () => {
      try {
        await replyToTicketAsAdmin(ticket.id, message);
        const nowIso = new Date().toISOString();
        setTickets((items) => items.map((item) => item.id === ticket.id ? { ...item, status: item.status === "Open" ? "In progress" : item.status, updated: "Just now", replies: [...item.replies, { id: `local-${Date.now()}`, authorName: "You", isAdmin: true, message, imageUrl: null, createdAt: nowIso }] } : item));
        setReply("");
      } catch (caught) {
        setReplyError(caught instanceof Error ? caught.message : "Could not send this reply. Please try again.");
      } finally {
        setSending(false);
      }
    });
  }

  return <div>
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">Customer operations</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">Support & tickets</h1><p className="mt-1 text-[10px] text-slate-500">Review questions, resolve issues, and keep every AKCounting customer supported.</p></div><button className="flex h-10 items-center gap-2 rounded-lg bg-[#061d40] px-4 text-[9px] font-semibold text-white"><Headphones size={14} />Support settings</button></header>
    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-medium text-slate-500">{stat.label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p></div><span className={`grid size-9 place-items-center rounded-lg ${stat.tone}`}><Icon size={16} /></span></div><p className="mt-3 text-[8px] text-slate-400">{stat.note}</p></article>; })}</section>

    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">Ticket inbox</h2><p className="mt-0.5 text-[9px] text-slate-400">{filtered.length} tickets in this view</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets, people, or companies..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label>
          <FilterSelect className="w-40" value={filter} onChange={(value) => setFilter(value as typeof filter)} options={[{ value: "All", label: "All status", count: tickets.length }, { value: "Open", label: "Open", count: counts.open, dot: statusDot.Open }, { value: "In progress", label: "In progress", count: counts.progress, dot: statusDot["In progress"] }, { value: "Resolved", label: "Resolved", count: counts.resolved, dot: statusDot.Resolved }]} />
        </div>
      </div>
    </section>

    <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((ticket) => { const PriorityIcon = priorityIcon[ticket.priority]; return <button key={ticket.id} onClick={() => openTicket(ticket)} className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-xl ${priorityCardBorder[ticket.priority]}`}>
        <span className={`h-1.5 w-full bg-gradient-to-r ${priorityGradient[ticket.priority]}`} />
        <div className="flex items-start justify-between gap-2 p-4 pb-0">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${priorityIconTone[ticket.priority]}`}><PriorityIcon size={14} /></span>
            <div className="min-w-0"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{ticket.id.slice(-8).toUpperCase()}</p><h3 className="mt-0.5 truncate text-[12.5px] font-semibold text-slate-800">{ticket.subject}</h3></div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[ticket.status]}`}><span className={`size-1.5 rounded-full ${statusDot[ticket.status]}`} />{ticket.status}</span>
        </div>
        <p className="mt-2.5 line-clamp-2 px-4 text-[10px] leading-4 text-slate-500">{ticket.message}</p>
        <div className="mt-3.5 flex items-center gap-2.5 px-4">
          <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">{avatarInitials(ticket.requester)}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{ticket.requester}</p><p className="truncate text-[8px] text-slate-400">{ticket.organization}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${priorityStyle[ticket.priority]}`}>{ticket.priority}</span>
        </div>
        <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[8px] text-slate-400 transition group-hover:bg-slate-50/60">
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-500"><Tag size={9} />{ticket.category}</span>
          <div className="flex items-center gap-2">{ticket.imageUrl && <span className="flex items-center gap-1"><Paperclip size={10} />1</span>}<span className="flex items-center gap-1"><Clock3 size={10} />{ticket.updated}</span></div>
        </div>
      </button>; })}
    </section>

    {tickets.length === 0 && <div className="mt-4 grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center"><div><Headphones size={26} className="mx-auto text-slate-300" /><p className="mt-3 text-[11px] font-semibold text-slate-600">No support tickets yet</p><p className="mt-1 text-[9px] text-slate-400">Tickets submitted by customers will appear here.</p></div></div>}
    {tickets.length > 0 && filtered.length === 0 && <div className="mt-4 grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center"><div><Headphones size={26} className="mx-auto text-slate-300" /><p className="mt-3 text-[11px] font-semibold text-slate-600">No tickets found</p><p className="mt-1 text-[9px] text-slate-400">Try a different search or filter.</p></div></div>}

    {selected && <div className={`fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${panelVisible ? "opacity-100" : "opacity-0"}`} onClick={closePanel}>
      <aside className={`flex h-full w-full max-w-[540px] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out ${panelVisible ? "translate-x-0" : "translate-x-full"}`} onClick={(event) => event.stopPropagation()}>
        <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${statusHeaderTone[selected.status]} px-6 py-6 text-white`}>
          <span className="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="flex items-center gap-2"><span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold ring-1 ring-white/20">{selected.id.slice(-8).toUpperCase()}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${selected.priority === "High" ? "bg-rose-400/25 text-rose-100" : selected.priority === "Medium" ? "bg-amber-400/25 text-amber-100" : "bg-white/15 text-white"}`}>{selected.priority} priority</span></div>
          <h2 className="mt-3 max-w-md text-lg font-semibold leading-snug">{selected.subject}</h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/70"><Building2 size={12} />{selected.organization}</p>
          <button onClick={closePanel} className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><X size={16} /></button>
        </div>

        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-semibold text-white">{avatarInitials(selected.requester)}</span>
            <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-slate-800">{selected.requester}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{selected.email}</p></div>
            <a href={`mailto:${selected.email}`} aria-label="Email requester" className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-violet-600"><Mail size={14} /></a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="relative rounded-xl bg-slate-50 p-3.5"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
              <div className="relative mt-1.5" ref={statusMenuRef}>
                <button type="button" disabled={statusPending} onClick={() => setStatusMenuOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={statusMenuOpen} className="flex w-full items-center gap-1.5 text-[11px] font-semibold text-slate-700 outline-none transition disabled:opacity-60">
                  <span className={`size-1.5 shrink-0 rounded-full ${statusDot[selected.status]}`} />
                  <span className="flex-1 text-left">{selected.status}</span>
                  <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform duration-200 ${statusMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {statusMenuOpen && <div role="listbox" className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {(["Open", "In progress", "Resolved"] as const).map((item) => { const active = item === selected.status; return <button key={item} type="button" role="option" aria-selected={active} onClick={() => { changeStatus(selected, item); setStatusMenuOpen(false); }} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[10px] font-medium transition ${active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
                    <span className={`size-1.5 shrink-0 rounded-full ${statusDot[item]}`} />
                    <span className="flex-1">{item}</span>
                    {active && <Check size={13} className="shrink-0 text-violet-600" />}
                  </button>; })}
                </div>}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Category</p><p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"><Tag size={12} className="text-slate-400" />{selected.category}</p></div>
          </div>

          <div className="mt-5"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><MessageSquare size={13} className="text-violet-600" />Conversation</p>
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 p-4"><p className="text-[9px] font-semibold text-slate-600">{selected.requester}</p>{selected.message && <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{selected.message}</p>}{selected.imageUrl && <a href={selected.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block w-fit"><img src={selected.imageUrl} alt="Attachment" className="max-h-48 rounded-lg border border-slate-200 object-contain" /></a>}<p className="mt-3 flex items-center gap-1 text-[9px] text-slate-400"><CalendarDays size={11} />{selected.created}</p></div>
              {selected.replies.map((item) => <div key={item.id} className={`rounded-2xl p-4 ${item.isAdmin ? "rounded-tr-sm border border-violet-100 bg-violet-50/70" : "rounded-tl-sm border border-slate-100 bg-slate-50"}`}><p className={`text-[9px] font-semibold ${item.isAdmin ? "text-violet-700" : "text-slate-600"}`}>{item.authorName}{item.isAdmin && " · Support team"}</p>{item.message && <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{item.message}</p>}{item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block w-fit"><img src={item.imageUrl} alt="Attachment" className="max-h-48 rounded-lg border border-slate-200 object-contain" /></a>}<p className="mt-3 flex items-center gap-1 text-[9px] text-slate-400"><CalendarDays size={11} />{dateTimeFormatter.format(new Date(item.createdAt))}</p></div>)}
            </div>
          </div>

          <div className="mt-5"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><Sparkles size={13} className="text-violet-600" />Reply to customer</p><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a helpful response..." rows={5} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3.5 text-[11px] leading-5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />{replyError && <p role="alert" className="mt-2 text-[9px] font-medium text-rose-600">{replyError}</p>}<div className="mt-3 flex justify-end"><button onClick={() => sendReply(selected)} disabled={!reply.trim() || sending} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"><Send size={13} />{sending ? "Sending..." : "Send reply"}</button></div></div>
        </div>
      </aside>
    </div>}
  </div>;
}
