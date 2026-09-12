"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Banknote, Calendar, Check, CheckCircle2, Clock3, HandCoins, Loader2, Plus, Receipt, Search, Trash2, UserRound, Wallet, X } from "lucide-react";

import { createDue, deleteDue, recordDuePayment, type DueRecord, type DueStatus } from "@/actions/dues";
import type { ContactRecord } from "@/actions/contacts";
import { FilterSelect } from "@/components/filter-select";
import { DateField } from "@/components/date-field";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";

const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const formatDateTime = (date: Date, preference: CalendarPreference) => `${formatDisplayDate(date, preference)} · ${timeFormatter.format(date)}`;
const STATUS_STYLE: Record<DueStatus, string> = { Paid: "bg-emerald-50 text-emerald-700", Partial: "bg-amber-50 text-amber-700", Pending: "bg-rose-50 text-rose-700" };
const STATUS_DOT: Record<DueStatus, string> = { Paid: "bg-emerald-500", Partial: "bg-amber-500", Pending: "bg-rose-500" };

export function DuesPage({ initialDues, contacts, initialContactId = null, calendarPreference }: { initialDues: DueRecord[]; contacts: ContactRecord[]; initialContactId?: string | null; calendarPreference: CalendarPreference }) {
  const [dues, setDues] = useState(initialDues);
  const [syncedDues, setSyncedDues] = useState(initialDues);
  if (initialDues !== syncedDues) { setSyncedDues(initialDues); setDues(initialDues); }

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DueStatus>("All");
  const [customerFilter, setCustomerFilter] = useState(initialContactId ?? "All");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = dues.find((due) => due.id === selectedId) ?? null;

  const filtered = useMemo(() => dues.filter((due) => {
    const matchesStatus = statusFilter === "All" || due.status === statusFilter;
    const matchesCustomer = customerFilter === "All" || due.contactId === customerFilter;
    const matchesQuery = `${due.contactName} ${due.title}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesCustomer && matchesQuery;
  }), [dues, statusFilter, customerFilter, query]);

  const totals = useMemo(() => dues.reduce((acc, due) => ({
    outstanding: acc.outstanding + due.remaining,
    collected: acc.collected + due.paidAmount,
    total: acc.total + due.totalAmount,
    customers: acc.customers,
  }), { outstanding: 0, collected: 0, total: 0, customers: new Set(dues.map((due) => due.contactId)).size }), [dues]);

  const stats = [
    { label: "Outstanding", value: money(totals.outstanding), note: "Still owed by customers", icon: Banknote, tone: "bg-rose-50 text-rose-600" },
    { label: "Collected", value: money(totals.collected), note: "Paid so far against dues", icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Total due entries", value: String(dues.length), note: `Across ${totals.customers} customer${totals.customers === 1 ? "" : "s"}`, icon: Receipt, tone: "bg-blue-50 text-blue-600" },
    { label: "Fully settled", value: String(dues.filter((due) => due.status === "Paid").length), note: "Dues cleared in full", icon: CheckCircle2, tone: "bg-violet-50 text-violet-600" },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:size-12"><HandCoins size={19} className="sm:size-[21px]" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">Receivables</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Due amounts</h1><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Track what each customer still owes you and record payments as they come in.</p></div></div>
        <button onClick={() => setAddOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-[11px] font-semibold text-white shadow-md shadow-amber-200 transition hover:bg-amber-700 sm:w-auto"><Plus size={14} />Add due</button>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">{stat.label}</p><p className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{stat.value}</p></div><span className={`grid size-9 shrink-0 place-items-center rounded-lg sm:size-10 ${stat.tone}`}><Icon size={16} /></span></div><p className="mt-2 truncate text-[8px] text-slate-400 sm:mt-3 sm:text-[9px]">{stat.note}</p></article>; })}</section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">All due entries</h2><p className="mt-0.5 text-[9px] text-slate-400">{filtered.length} of {dues.length} shown</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-amber-300 focus-within:bg-white sm:w-auto sm:min-w-52"><Search size={13} className="shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or title..." className="w-full min-w-0 bg-transparent text-[10px] text-slate-700 outline-none" /></label>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={customerFilter} onChange={setCustomerFilter} className="h-9 w-full sm:w-48" options={[{ value: "All", label: "All customers" }, ...contacts.map((contact) => ({ value: contact.id, label: contact.name }))]} />
            <div className="flex h-9 flex-1 overflow-hidden rounded-lg border border-slate-200 sm:flex-none">{(["All", "Pending", "Partial", "Paid"] as const).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`flex-1 whitespace-nowrap px-2.5 text-[9px] font-semibold transition sm:flex-none sm:px-3 ${statusFilter === status ? "bg-amber-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>{status}</button>)}</div>
          </div>
        </div>
      </div>

      {dues.length === 0 ? <div className="grid min-h-64 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><HandCoins size={20} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No due amounts yet</p><p className="mt-1 text-[9px] text-slate-400">Add one to start tracking what a customer owes you.</p></div></div> : <>
      <div className="divide-y divide-slate-50 md:hidden">{filtered.map((due) => <button key={due.id} type="button" onClick={() => setSelectedId(due.id)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-amber-50/30">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><UserRound size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><p className="truncate text-[11px] font-semibold text-slate-700">{due.contactName}</p><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_STYLE[due.status]}`}><span className={`size-1.5 rounded-full ${STATUS_DOT[due.status]}`} />{due.status}</span></div>
          {due.title && <p className="mt-0.5 truncate text-[9px] text-slate-400">{due.title}</p>}
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px]"><span className="text-slate-400">{money(due.totalAmount)} total · <span className="text-emerald-600">{money(due.paidAmount)} paid</span></span><span className="font-semibold text-rose-600">{money(due.remaining)} left</span></div>
          {due.dueDate && <p className="mt-1 text-[8px] text-slate-400">Due {formatDisplayDate(new Date(due.dueDate), calendarPreference)}</p>}
        </div>
      </button>)}{filtered.length === 0 && <div className="p-10 text-center text-[11px] text-slate-400">No due entries match these filters.</div>}</div>

      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Customer</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Due date</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody>{filtered.map((due) => <tr key={due.id} onClick={() => setSelectedId(due.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-amber-50/30">
          <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><UserRound size={14} /></span><p className="text-[10px] font-semibold text-slate-700">{due.contactName}</p></div></td>
          <td className="px-3 py-3 text-[10px] text-slate-600">{due.title || "—"}</td>
          <td className="px-3 py-3 text-[10px] font-semibold text-slate-800">{money(due.totalAmount)}</td>
          <td className="px-3 py-3 text-[10px] text-emerald-600">{money(due.paidAmount)}</td>
          <td className="px-3 py-3 text-[10px] font-semibold text-rose-600">{money(due.remaining)}</td>
          <td className="px-3 py-3 text-[10px] text-slate-500">{due.dueDate ? formatDisplayDate(new Date(due.dueDate), calendarPreference) : "—"}</td>
          <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_STYLE[due.status]}`}><span className={`size-1.5 rounded-full ${STATUS_DOT[due.status]}`} />{due.status}</span></td>
        </tr>)}</tbody>
      </table>{filtered.length === 0 && <div className="p-10 text-center text-[11px] text-slate-400">No due entries match these filters.</div>}</div>
      </>}
    </section>

    {addOpen && <AddDueModal contacts={contacts} calendarPreference={calendarPreference} onClose={() => setAddOpen(false)} onCreated={(due) => { setDues((current) => [due, ...current]); setAddOpen(false); }} />}
    {selected && <DueDetailPanel due={selected} calendarPreference={calendarPreference} onClose={() => setSelectedId(null)} onUpdated={(next) => setDues((current) => current.map((item) => item.id === next.id ? next : item))} onDeleted={(id) => { setDues((current) => current.filter((item) => item.id !== id)); setSelectedId(null); }} />}
  </div>;
}

function AddDueModal({ contacts, calendarPreference, onClose, onCreated }: { contacts: ContactRecord[]; calendarPreference: CalendarPreference; onClose: () => void; onCreated: (due: DueRecord) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const due = await createDue(formData);
        onCreated(due);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not add this due entry.");
      }
    });
  }

  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={submit} className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between px-4 pb-1 pt-5 sm:px-6 sm:pt-6"><div><h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add a due amount</h2><p className="mt-1 text-[12px] text-slate-400 sm:text-[13px]">Track what a customer still needs to pay you.</p></div><button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X size={16} /></button></header>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {contacts.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-700">You need at least one customer before adding a due. Add one from the Customers page first.</p> :
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-slate-600">Customer</span><input type="hidden" name="contactId" value={contactId} /><FilterSelect value={contactId} onChange={setContactId} className="h-11 w-full" options={contacts.map((contact) => ({ value: contact.id, label: contact.name }))} /></label>}
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-slate-600">What is this for <span className="font-normal text-slate-400">(optional)</span></span><input name="title" maxLength={140} placeholder="e.g. Furniture order, credit sale..." className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-amber-400" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-slate-600">Amount owed</span><div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-amber-400"><span className="text-[12px] font-semibold text-slate-400">Rs</span><input name="totalAmount" type="number" min={1} required className="w-full min-w-0 bg-transparent text-[13px] text-slate-700 outline-none" /></div></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-slate-600">Due date</span><DateField name="dueDate" preference={calendarPreference} value={dueDate} onChange={setDueDate} focusClassName="focus:border-amber-400" /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-slate-600">Notes <span className="font-normal text-slate-400">(optional)</span></span><textarea name="notes" rows={3} maxLength={1000} className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-6 text-slate-700 outline-none focus:border-amber-400" /></label>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-medium text-rose-600">{error}</p>}
      </div>
      <footer className="flex flex-col gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-6"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 sm:order-1">Cancel</button><button disabled={pending || contacts.length === 0} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 text-[12px] font-semibold text-white shadow-md shadow-amber-200 transition hover:bg-amber-700 disabled:opacity-60 sm:order-2">{pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{pending ? "Adding..." : "Add due"}</button></footer>
    </form>
  </div>;
}

function DueDetailPanel({ due, calendarPreference, onClose, onUpdated, onDeleted }: { due: DueRecord; calendarPreference: CalendarPreference; onClose: () => void; onUpdated: (due: DueRecord) => void; onDeleted: (id: string) => void }) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(() => toLocalDateISO(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { const timer = requestAnimationFrame(() => setPanelVisible(true)); return () => cancelAnimationFrame(timer); }, []);

  function closePanel() { setPanelVisible(false); window.setTimeout(onClose, 250); }

  function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const updated = await recordDuePayment(due.id, formData);
        onUpdated(updated);
        setAmount("");
        setNote("");
        setPaidAt(toLocalDateISO(new Date()));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not record this payment.");
      }
    });
  }

  async function removeDue() {
    setDeleting(true);
    try {
      await deleteDue(due.id);
      onDeleted(due.id);
    } finally {
      setDeleting(false);
    }
  }

  return <div className={`fixed inset-0 z-[95] flex justify-end bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${panelVisible ? "opacity-100" : "opacity-0"}`} onClick={closePanel}>
    <aside className={`flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out ${panelVisible ? "translate-x-0" : "translate-x-full"}`} onClick={(event) => event.stopPropagation()}>
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-5 text-white sm:px-6 sm:py-6">
        <span className="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-2 pr-10"><span className={`rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold ring-1 ring-white/20`}>{due.status}</span></div>
        <h2 className="mt-3 truncate text-base font-semibold leading-snug sm:text-lg">{due.contactName}</h2>
        <p className="mt-1 truncate text-[11px] text-white/80">{due.title || "Due amount"}</p>
        <button onClick={closePanel} className="absolute right-4 top-4 grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><X size={16} /></button>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-xl bg-slate-50 p-2.5 text-center sm:p-3.5"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Total</p><p className="mt-1.5 truncate text-[12px] font-semibold text-slate-800 sm:text-[13px]">{money(due.totalAmount)}</p></div>
          <div className="min-w-0 rounded-xl bg-emerald-50 p-2.5 text-center sm:p-3.5"><p className="text-[8px] font-semibold uppercase tracking-wider text-emerald-500">Paid</p><p className="mt-1.5 truncate text-[12px] font-semibold text-emerald-700 sm:text-[13px]">{money(due.paidAmount)}</p></div>
          <div className="min-w-0 rounded-xl bg-rose-50 p-2.5 text-center sm:p-3.5"><p className="text-[8px] font-semibold uppercase tracking-wider text-rose-500">Remaining</p><p className="mt-1.5 truncate text-[12px] font-semibold text-rose-700 sm:text-[13px]">{money(due.remaining)}</p></div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${due.totalAmount > 0 ? Math.min(100, Math.round((due.paidAmount / due.totalAmount) * 100)) : 0}%` }} /></div>

        {due.dueDate && <p className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500"><Calendar size={12} className="text-slate-400" />Due on {formatDisplayDate(new Date(due.dueDate), calendarPreference)}</p>}
        {due.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] leading-4 text-slate-600">{due.notes}</p>}

        {due.remaining > 0 && <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-800"><Banknote size={13} />Record a payment</p>
          <form onSubmit={submitPayment} className="mt-3 space-y-2.5">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3"><span className="shrink-0 text-[10px] font-semibold text-slate-400">Rs</span><input name="amount" type="number" min={1} max={due.remaining} required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Up to ${due.remaining}`} className="w-full min-w-0 bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setAmount(String(due.remaining))} className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-[8px] font-semibold text-amber-700 hover:bg-amber-200">Full</button></div>
            <div className="grid grid-cols-2 gap-2">
              <input name="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" className="h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400" />
              <DateField name="paidAt" preference={calendarPreference} value={paidAt} onChange={setPaidAt} focusClassName="focus:border-amber-400" />
            </div>
            {error && <p role="alert" className="text-[9px] font-medium text-rose-600">{error}</p>}
            <button disabled={pending} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-[10px] font-semibold text-white shadow-md shadow-amber-200 transition hover:bg-amber-700 disabled:opacity-60">{pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{pending ? "Saving..." : "Record payment"}</button>
          </form>
        </div>}

        <div className="mt-6"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><Clock3 size={13} className="text-amber-600" />Payment history</p>
          {due.payments.length === 0 ? <p className="mt-2 text-[10px] text-slate-400">No payments recorded yet.</p> :
          <div className="mt-2 space-y-2">{due.payments.map((payment) => <div key={payment.id} className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-700">{money(payment.amount)}</p>{payment.note && <p className="mt-0.5 truncate text-[9px] text-slate-400">{payment.note}</p>}</div><p className="shrink-0 text-[9px] text-slate-400">{formatDateTime(new Date(payment.paidAt), calendarPreference)}</p></div>)}</div>}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          {!confirmDelete ? <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500 hover:text-rose-700"><Trash2 size={12} />Delete this due entry</button> :
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-700"><AlertCircle size={13} />Delete this due entry and its payment history?</p><div className="mt-2.5 flex gap-2"><button onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-8 flex-1 rounded-lg border border-slate-200 bg-white text-[9px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button onClick={removeDue} disabled={deleting} className="h-8 flex-1 rounded-lg bg-rose-600 text-[9px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button></div></div>}
        </div>
      </div>
    </aside>
  </div>;
}
