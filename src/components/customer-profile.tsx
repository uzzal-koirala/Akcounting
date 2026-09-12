"use client";

import { AlertTriangle, ArrowLeft, Building2, Calendar, CheckCircle2, FileText, HandCoins, Mail, MapPin, Package, Pencil, Phone, ReceiptText, ShoppingBag, Trash2, TrendingUp, UsersRound, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { deleteContact, updateContact } from "@/actions/contacts";
import { type CustomerRecord, type PurchaseStatus } from "@/actions/customers";
import type { DueRecord, DueStatus } from "@/actions/dues";

const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}/-`;
const PURCHASE_STATUS_TONE: Record<PurchaseStatus, string> = { Draft: "bg-slate-100 text-slate-600", Sent: "bg-blue-50 text-blue-700", Paid: "bg-emerald-50 text-emerald-700", Overdue: "bg-rose-50 text-rose-700" };
const DUE_STATUS_TONE: Record<DueStatus, string> = { Paid: "bg-emerald-50 text-emerald-700", Partial: "bg-amber-50 text-amber-700", Pending: "bg-rose-50 text-rose-700" };

export function CustomerProfile({ customer: initialCustomer, dues = [] }: { customer: CustomerRecord; dues?: DueRecord[] }) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const stats = [
    { label: "Total invoiced", value: money(customer.totalInvoiced), icon: TrendingUp, tone: "bg-violet-50 text-violet-600" },
    { label: "Total paid", value: money(customer.totalPaid), icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Outstanding", value: money(customer.outstanding), icon: ReceiptText, tone: customer.outstanding > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600" },
    { label: "Invoices", value: customer.invoiceCount.toString(), icon: FileText, tone: "bg-blue-50 text-blue-600" },
  ];

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      data.set("type", "Client");
      await updateContact(customer.id, data);
      setCustomer((current) => ({ ...current, name: String(data.get("name") ?? current.name), email: String(data.get("email") ?? current.email), phone: String(data.get("phone") ?? current.phone), address: String(data.get("address") ?? current.address), panVat: String(data.get("panVat") ?? current.panVat) }));
      setEditOpen(false);
      setBanner("Customer details updated.");
      window.setTimeout(() => setBanner(""), 3000);
    } catch {
      setError("Could not save this customer. Check the information and try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmDeleteCustomer() {
    setDeleting(true);
    try {
      await deleteContact(customer.id);
      router.push("/customers");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <Link href="/customers" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-700"><ArrowLeft size={13} />Back to customers</Link>

    {banner && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 size={14} className="shrink-0" />{banner}</div>}

    <header className="relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 shadow-[0_16px_40px_rgba(2,6,23,0.25)]">
      <span className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white shadow-lg">{customer.name.trim().slice(0, 1).toUpperCase()}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight text-white">{customer.name}</h1><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ring-white/20 ${customer.status === "Active" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/15 text-white"}`}>{customer.status}</span></div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300"><Calendar size={12} />Customer since {customer.joinedDate}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/invoices?customer=${customer.id}`} className="flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-3 text-[10px] font-semibold text-white transition hover:bg-blue-400"><ShoppingBag size={13} />Sell</Link>
          <button onClick={() => setEditOpen(true)} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[10px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"><Pencil size={13} />Edit</button>
          <button onClick={() => setConfirmDelete(true)} className="flex h-9 items-center gap-2 rounded-lg bg-rose-500/90 px-3 text-[10px] font-semibold text-white transition hover:bg-rose-500"><Trash2 size={13} />Delete</button>
        </div>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">{stat.label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{stat.value}</p></div><span className={`grid size-10 place-items-center rounded-lg ${stat.tone}`}><Icon size={17} /></span></div></article>; })}</section>

    <section className="grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
      <div className="space-y-4">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShoppingBag size={15} className="text-blue-600" />Products & services purchased</h2></div>
          {customer.purchases.length === 0 ? <div className="p-10 text-center text-[11px] text-slate-400">No invoiced items yet — create an invoice for this customer to see it here.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-2.5">Item</th><th className="px-3 py-2.5">Invoice</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Amount</th><th className="px-3 py-2.5">Status</th></tr></thead>
            <tbody>{customer.purchases.map((purchase) => <tr key={purchase.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50"><td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Package size={14} /></span><p className="truncate text-[10px] font-semibold text-slate-700">{purchase.name}</p></div></td><td className="px-3 py-2.5 text-[9px] text-slate-500">{purchase.invoiceNumber}</td><td className="px-3 py-2.5 text-[9px] text-slate-500">{purchase.date}</td><td className="px-3 py-2.5 text-[9px] font-semibold text-slate-700">{money(purchase.amount)}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${PURCHASE_STATUS_TONE[purchase.status]}`}>{purchase.status}</span></td></tr>)}</tbody>
          </table></div>}
        </article>

        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><HandCoins size={15} className="text-amber-600" />Due amounts</h2><Link href={`/dues?customer=${customer.id}`} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100">Manage dues</Link></div>
          {dues.length === 0 ? <div className="p-10 text-center text-[11px] text-slate-400">No due amounts recorded for this customer yet.</div> : <div className="divide-y divide-slate-50">{dues.map((due) => <Link key={due.id} href={`/dues?customer=${customer.id}`} className="flex items-center gap-3 p-4 transition hover:bg-amber-50/30">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><HandCoins size={14} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800">{due.title || "Due amount"}</p><p className="mt-0.5 text-[9px] text-slate-400">{money(due.paidAmount)} paid of {money(due.totalAmount)}</p></div>
            <div className="text-right"><p className="text-[10px] font-semibold text-rose-600">{money(due.remaining)}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-semibold ${DUE_STATUS_TONE[due.status]}`}>{due.status}</span></div>
          </Link>)}</div>}
        </article>
      </div>

      <div className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <h2 className="text-sm font-semibold text-slate-900">Contact information</h2>
          <div className="mt-3 space-y-2.5">
            {customer.email && <p className="flex items-center gap-2 text-[10px] text-slate-600"><Mail size={12} className="shrink-0 text-slate-400" />{customer.email}</p>}
            {customer.phone && <p className="flex items-center gap-2 text-[10px] text-slate-600"><Phone size={12} className="shrink-0 text-slate-400" />{customer.phone}</p>}
            {customer.address && <p className="flex items-center gap-2 text-[10px] text-slate-600"><MapPin size={12} className="shrink-0 text-slate-400" />{customer.address}</p>}
            {customer.panVat && <p className="flex items-center gap-2 text-[10px] text-slate-600"><Building2 size={12} className="shrink-0 text-slate-400" />PAN/VAT: {customer.panVat}</p>}
            {!customer.email && !customer.phone && !customer.address && !customer.panVat && <p className="text-[10px] text-slate-400">No contact details on file.</p>}
          </div>
        </article>

        <article className="rounded-lg border border-rose-100 bg-rose-50/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800"><UsersRound size={14} />Danger zone</h2>
          <p className="mt-1 text-[9px] leading-4 text-rose-600">Deleting this customer removes them from your directory. Past invoices keep their history but lose this customer link.</p>
          <button onClick={() => setConfirmDelete(true)} className="mt-3 h-9 w-full rounded-lg border border-rose-200 bg-white text-[10px] font-semibold text-rose-700 transition hover:bg-rose-50">Delete customer</button>
        </article>
      </div>
    </section>

    {editOpen && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false); }}>
      <form onSubmit={saveEdit} className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between px-6 pb-1 pt-6"><div><h2 className="text-lg font-semibold text-slate-900">Edit customer</h2><p className="mt-1 text-[11px] text-slate-400">Saved to your real customer directory.</p></div><button type="button" onClick={() => setEditOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X size={16} /></button></header>
        <div className="space-y-4 px-6 py-5">
          <Field label="Full name / business name" name="name" defaultValue={customer.name} placeholder="Aarav Sharma" />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Email" name="email" type="email" defaultValue={customer.email} placeholder="aarav@company.com" /><Field label="Phone" name="phone" defaultValue={customer.phone} placeholder="+977 98XXXXXXXX" /></div>
          <Field label="Address" name="address" defaultValue={customer.address} placeholder="Kathmandu, Nepal" />
          <Field label="PAN / VAT (optional)" name="panVat" defaultValue={customer.panVat} placeholder="600123456" />
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-medium text-rose-600">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setEditOpen(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={pending} className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">{pending ? "Saving..." : <><CheckCircle2 size={14} />Save changes</>}</button></footer>
      </form>
    </div>}

    {confirmDelete && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setConfirmDelete(false); }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        <span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={20} /></span>
        <h2 className="mt-4 text-sm font-semibold text-slate-900">Delete {customer.name}?</h2>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Their past invoices will keep their history but lose this customer link. This cannot be undone.</p>
        <div className="mt-5 flex gap-2"><button onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button onClick={confirmDeleteCustomer} disabled={deleting} className="h-10 flex-1 rounded-lg bg-rose-600 text-[10px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? "Deleting..." : "Delete customer"}</button></div>
      </div>
    </div>}
  </div>;
}

function Field({ label, name, type = "text", defaultValue, placeholder }: { label: string; name: string; type?: string; defaultValue?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>;
}
