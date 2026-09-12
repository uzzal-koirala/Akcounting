"use client";

import { ArrowUpRight, CheckCircle2, Download, Eye, FileText, Grid3x3, List, Mail, MapPin, MoreHorizontal, Pencil, Phone, Plus, ReceiptText, Search, Trash2, TrendingUp, Users2, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { createContact, deleteContact, updateContact } from "@/actions/contacts";
import { listCustomers, type CustomerRecord } from "@/actions/customers";
import { exportRowsToCsv } from "@/lib/csv-export";
import { FilterSelect } from "@/components/filter-select";

const TONES = ["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600"];
const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}/-`;
const toneFor = (id: string) => TONES[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];

export function CustomersPage({ initialCustomers }: { initialCustomers: CustomerRecord[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "Inactive">("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => customers.filter((c) => (status === "All" || c.status === status) && `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase())), [customers, query, status]);
  const topCustomerId = useMemo(() => [...customers].sort((a, b) => b.totalInvoiced - a.totalInvoiced)[0]?.id, [customers]);

  const activeCount = customers.filter((c) => c.status === "Active").length;
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const totalInvoiced = customers.reduce((sum, c) => sum + c.totalInvoiced, 0);

  async function refresh() {
    setCustomers(await listCustomers());
  }

  function openCreate() {
    setEditing(null);
    setError("");
    setModalOpen(true);
  }
  function openEdit(customer: CustomerRecord) {
    setEditing(customer);
    setError("");
    setModalOpen(true);
    setMenuId(null);
  }

  async function removeCustomer(customer: CustomerRecord) {
    if (!window.confirm(`Delete ${customer.name}? Their past invoices will keep their history but lose this customer link.`)) return;
    await deleteContact(customer.id);
    setMenuId(null);
    await refresh();
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      data.set("type", "Client");
      if (editing) await updateContact(editing.id, data);
      else await createContact(data);
      await refresh();
      setModalOpen(false);
      setEditing(null);
    } catch {
      setError("Could not save this customer. Check the information and try again.");
    } finally {
      setPending(false);
    }
  }

  function exportCustomers() {
    exportRowsToCsv("akcounting-customers.csv", filtered.map((c) => ({ Name: c.name, Email: c.email, Phone: c.phone, "Total invoiced": c.totalInvoiced, Outstanding: c.outstanding, Invoices: c.invoiceCount, Status: c.status })));
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"><Users2 size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Relationship management</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Customers</h1><p className="mt-1 text-xs text-slate-500">Everyone you invoice and get paid by, in one place.</p></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={exportCustomers} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"><Download size={14} />Export</button><button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[11px] font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"><Plus size={15} />Add customer</button></div>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">{[
      { label: "Total customers", value: customers.length.toString(), note: `${activeCount} currently active`, icon: Users2, tone: "bg-blue-50 text-blue-600" },
      { label: "Total invoiced", value: money(totalInvoiced), note: "Across all customers", icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" },
      { label: "Outstanding balance", value: money(totalOutstanding), note: totalOutstanding > 0 ? "Awaiting payment" : "All settled up", icon: Wallet, tone: totalOutstanding > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600" },
      { label: "Total invoices", value: customers.reduce((sum, c) => sum + c.invoiceCount, 0).toString(), note: "Sent to customers", icon: FileText, tone: "bg-violet-50 text-violet-600" },
    ].map((card) => { const Icon = card.icon; return <article key={card.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${card.tone}`}><Icon size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">{card.label}</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{card.value}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{card.note}</p></article>; })}</section>

    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-blue-300 focus-within:bg-white lg:max-w-sm"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect className="w-40" value={status} onChange={(value) => setStatus(value as "All" | "Active" | "Inactive")} options={[{ value: "All", label: "All customers", count: customers.length, dot: "bg-blue-600" }, { value: "Active", label: "Active", count: customers.filter((c) => c.status === "Active").length, dot: "bg-emerald-500" }, { value: "Inactive", label: "Inactive", count: customers.filter((c) => c.status === "Inactive").length, dot: "bg-slate-400" }]} />
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setView("grid")} aria-label="Grid view" className={`grid size-8 place-items-center rounded-md transition ${view === "grid" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`}><Grid3x3 size={14} /></button>
            <button onClick={() => setView("list")} aria-label="List view" className={`grid size-8 place-items-center rounded-md transition ${view === "list" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`}><List size={14} /></button>
          </div>
        </div>
      </div>
    </section>

    {view === "grid" ? <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((customer) => <CustomerCard key={customer.id} customer={customer} isTop={customer.id === topCustomerId} onEdit={() => openEdit(customer)} onDelete={() => removeCustomer(customer)} menuOpen={menuId === customer.id} onToggleMenu={() => setMenuId(menuId === customer.id ? null : customer.id)} />)}</section> : <CustomerTable customers={filtered} onEdit={openEdit} onDelete={removeCustomer} menuId={menuId} onToggleMenu={(id) => setMenuId(menuId === id ? null : id)} />}

    {filtered.length === 0 && <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-200 bg-white text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Users2 size={22} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">No customers found</h3><p className="mt-1 text-[10px] text-slate-400">{customers.length === 0 ? "Add your first customer to get started." : "Try changing the current filters."}</p><button onClick={openCreate} className="mt-4 h-9 rounded-lg bg-blue-600 px-4 text-[10px] font-semibold text-white">Add customer</button></div></div>}

    {modalOpen && <CustomerForm customer={editing} pending={pending} error={error} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={submitCustomer} />}
  </div>;
}

function CustomerCard({ customer, isTop, onEdit, onDelete, menuOpen, onToggleMenu }: { customer: CustomerRecord; isTop: boolean; onEdit: () => void; onDelete: () => void; menuOpen: boolean; onToggleMenu: () => void }) {
  return <div className={`group relative flex flex-col overflow-hidden rounded-xl border text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${isTop ? "border-blue-800 bg-gradient-to-b from-blue-700 to-blue-950 text-white" : "border-slate-200 bg-white hover:border-blue-200"}`}>
    <div className={`flex items-center gap-3 p-4 pb-3 ${isTop ? "pt-4" : "pt-5"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm ${isTop ? "bg-white/15" : toneFor(customer.id)}`}>{customer.name.trim().slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <Link href={`/customers/${customer.id}`} className={`truncate text-left text-[13px] font-semibold leading-tight hover:underline ${isTop ? "text-white" : "text-slate-900"}`}>{customer.name}</Link>
        <p className={`truncate text-[9.5px] ${isTop ? "text-blue-200" : "text-slate-400"}`}>{customer.address || "No address on file"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isTop && <span className="flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wide text-amber-950">★ Top</span>}
        <span className={`rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide ${isTop ? "bg-white/15 text-white" : customer.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{customer.status}</span>
      </div>
    </div>

    <div className={`mx-4 flex items-center justify-between rounded-lg px-3 py-2.5 ${isTop ? "bg-white/10" : "bg-blue-50/70"}`}>
      <div><p className={`text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-blue-200" : "text-slate-400"}`}>Total invoiced</p><p className={`mt-0.5 text-[15px] font-bold tracking-tight ${isTop ? "text-white" : "text-slate-900"}`}>{money(customer.totalInvoiced)}</p></div>
      <span className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wide ${isTop ? "bg-white text-blue-800" : customer.outstanding > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{customer.outstanding > 0 ? "Due" : "Settled"}</span>
    </div>

    <div className="mx-4 mt-2.5 grid grid-cols-2 gap-2">
      <div className={`rounded-lg border p-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}><p className={`flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-blue-300" : "text-slate-400"}`}><ReceiptText size={9} />Invoices</p><p className={`mt-0.5 text-[11px] font-semibold ${isTop ? "text-white" : "text-slate-800"}`}>{customer.invoiceCount}</p></div>
      <div className={`rounded-lg border p-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}><p className={`flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider ${isTop ? "text-blue-300" : "text-slate-400"}`}><Wallet size={9} />Outstanding</p><p className={`mt-0.5 truncate text-[11px] font-semibold ${customer.outstanding > 0 ? (isTop ? "text-amber-200" : "text-amber-600") : (isTop ? "text-white" : "text-slate-800")}`}>{money(customer.outstanding)}</p></div>
    </div>

    <div className={`mx-4 mt-3 space-y-1.5 border-t pt-2.5 ${isTop ? "border-white/10" : "border-slate-100"}`}>
      {customer.email && <p className={`flex items-center gap-2 truncate text-[11px] font-medium ${isTop ? "text-blue-200" : "text-slate-600"}`}><Mail size={14} className="shrink-0" />{customer.email}</p>}
      {customer.phone && <p className={`flex items-center gap-2 truncate text-[11px] font-medium ${isTop ? "text-blue-200" : "text-slate-600"}`}><Phone size={14} className="shrink-0" />{customer.phone}</p>}
      {!customer.email && !customer.phone && <p className={`text-[10px] ${isTop ? "text-blue-300" : "text-slate-300"}`}>No contact details</p>}
    </div>

    <div className="relative mt-4 flex items-center justify-between px-4 py-3">
      <Link href={`/customers/${customer.id}`} className={`flex items-center gap-1.5 text-[9px] font-semibold ${isTop ? "text-white" : "text-slate-600 group-hover:text-blue-700"}`}>View details<ArrowUpRight size={12} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      <button onClick={onToggleMenu} className={`grid size-8 place-items-center rounded-lg ${isTop ? "text-white/70 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}><MoreHorizontal size={16} /></button>
      {menuOpen && <div className="absolute right-2 top-11 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl"><button onClick={onEdit} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit</button><button onClick={onDelete} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button></div>}
    </div>
  </div>;
}

function CustomerTable({ customers, onEdit, onDelete, menuId, onToggleMenu }: { customers: CustomerRecord[]; onEdit: (customer: CustomerRecord) => void; onDelete: (customer: CustomerRecord) => void; menuId: string | null; onToggleMenu: (id: string) => void }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
    <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Total invoiced</th><th className="px-4 py-3">Outstanding</th><th className="px-4 py-3">Invoices</th><th className="px-4 py-3">Status</th><th className="w-16 px-4 py-3" /></tr></thead>
      <tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/25">
        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm ${toneFor(customer.id)}`}>{customer.name.trim().slice(0, 1).toUpperCase()}</span><div><Link href={`/customers/${customer.id}`} className="text-[12px] font-semibold text-slate-800 hover:text-blue-700">{customer.name}</Link>{customer.address && <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400"><MapPin size={10} />{customer.address}</p>}</div></div></td>
        <td className="px-4 py-3.5">{customer.email && <p className="flex items-center gap-1.5 text-[10px] text-slate-600"><Mail size={11} className="text-slate-400" />{customer.email}</p>}{customer.phone && <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"><Phone size={11} className="text-slate-400" />{customer.phone}</p>}{!customer.email && !customer.phone && <span className="text-[10px] text-slate-300">—</span>}</td>
        <td className="px-4 py-3.5 text-[11px] font-semibold text-slate-800">{money(customer.totalInvoiced)}</td>
        <td className={`px-4 py-3.5 text-[11px] font-semibold ${customer.outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>{money(customer.outstanding)}</td>
        <td className="px-4 py-3.5 text-[10px] text-slate-500">{customer.invoiceCount}</td>
        <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${customer.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><i className={`size-1.5 rounded-full ${customer.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />{customer.status}</span></td>
        <td className="relative px-4 py-3.5"><button onClick={() => onToggleMenu(customer.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><MoreHorizontal size={16} /></button>
          {menuId === customer.id && <div className="absolute right-10 top-10 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><Link href={`/customers/${customer.id}`} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-slate-600 hover:bg-slate-50"><Eye size={13} />View details</Link><button onClick={() => onEdit(customer)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit</button><button onClick={() => onDelete(customer)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button></div>}
        </td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function CustomerForm({ customer, pending, error, onClose, onSubmit }: { customer: CustomerRecord | null; pending: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} className="my-6 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-cyan-600 px-6 py-6 text-white">
        <div className="pointer-events-none absolute -right-14 -top-16 size-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3.5"><span className="grid size-12 place-items-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20"><Users2 size={21} /></span><div><h2 className="text-xl font-semibold tracking-tight">{customer ? "Edit customer" : "Add new customer"}</h2><p className="mt-0.5 text-[11px] text-blue-100/80">Saved to your real customer directory.</p></div></div>
          <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-blue-100 transition hover:bg-white/15"><X size={16} /></button>
        </div>
      </header>
      <div className="space-y-4 bg-slate-50/60 px-6 py-6">
        <Field label="Full name / business name" name="name" defaultValue={customer?.name} placeholder="Aarav Sharma" />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Email" name="email" type="email" defaultValue={customer?.email} placeholder="aarav@company.com" /><Field label="Phone" name="phone" defaultValue={customer?.phone} placeholder="+977 98XXXXXXXX" /></div>
        <Field label="Address" name="address" defaultValue={customer?.address} placeholder="Kathmandu, Nepal" />
        <Field label="PAN / VAT (optional)" name="panVat" defaultValue={customer?.panVat} placeholder="600123456" />
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-medium text-rose-600">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={pending} className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">{pending ? "Saving..." : <><CheckCircle2 size={14} />{customer ? "Save changes" : "Add customer"}</>}</button></footer>
    </form>
  </div>;
}

function Field({ label, name, type = "text", defaultValue, placeholder }: { label: string; name: string; type?: string; defaultValue?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>;
}

