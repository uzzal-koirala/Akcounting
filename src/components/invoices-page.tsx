"use client";

import { CalendarDays, Check, ChevronDown, ChevronRight, Contact2, Copy, CreditCard, Download, Eye, FileCheck2, FileText, ListChecks, Mail, MoreHorizontal, Palette, Pencil, Plus, Search, Send, Sparkles, StickyNote, Trash2, TriangleAlert, UploadCloud, Users, Users2, X } from "lucide-react";
import { FormEvent, MouseEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { createInvoice, deleteInvoice, setInvoiceStatus, updateInvoice, type InvoiceDocType, type InvoiceRecord, type InvoiceStatus } from "@/actions/invoices";
import { createContact, deleteContact, updateContact, type ContactRecord } from "@/actions/contacts";
import type { BusinessProfileRecord } from "@/actions/business-profile";
import { A4_HEIGHT, A4_WIDTH, ACCENT_COLORS, COLOR_COMBOS, INVOICE_TEMPLATES, InvoiceDocument, type DocumentBusiness, type DocumentInvoice, type InvoiceTemplateId } from "@/components/invoice-document";
import { DateField } from "@/components/date-field";
import { ColorPicker } from "@/components/color-picker";
import { FilterSelect } from "@/components/filter-select";
import type { CalendarPreference } from "@/lib/calendar";

const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 2 }).format(amount)}` };
const statusStyle: Record<InvoiceStatus, string> = { Draft: "bg-slate-100 text-slate-600", Sent: "bg-blue-50 text-blue-600", Paid: "bg-emerald-50 text-emerald-600", Overdue: "bg-rose-50 text-rose-600" };
const statusDot: Record<InvoiceStatus, string> = { Draft: "bg-slate-400", Sent: "bg-blue-500", Paid: "bg-emerald-500", Overdue: "bg-rose-500" };
const statusOptionTone: Record<InvoiceStatus, string> = { Draft: "bg-slate-50", Sent: "bg-blue-50", Paid: "bg-emerald-50", Overdue: "bg-rose-50" };
const STATUS_ICON: Record<InvoiceStatus, typeof FileText> = { Draft: FileText, Sent: Send, Paid: FileCheck2, Overdue: TriangleAlert };

type LineItem = { description: string; quantity: string; rate: string };
const blankItem = (): LineItem => ({ description: "", quantity: "1", rate: "" });

export function InvoicesPage({ initialInvoices, initialContacts, business, calendarPreference, presetContactId }: { initialInvoices: InvoiceRecord[]; initialContacts: ContactRecord[]; business: BusinessProfileRecord; calendarPreference: CalendarPreference; presetContactId?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"invoices" | "contacts">("invoices");

  const [invoices, setInvoices] = useState(initialInvoices);
  const [syncedInvoices, setSyncedInvoices] = useState(initialInvoices);
  if (initialInvoices !== syncedInvoices) { setSyncedInvoices(initialInvoices); setInvoices(initialInvoices); }

  const [contacts, setContacts] = useState(initialContacts);
  const [syncedContacts, setSyncedContacts] = useState(initialContacts);
  if (initialContacts !== syncedContacts) { setSyncedContacts(initialContacts); setContacts(initialContacts); }

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>("All");
  const [addOpen, setAddOpen] = useState(Boolean(presetContactId));
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [createDocType, setCreateDocType] = useState<InvoiceDocType>("Invoice");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selected, setSelected] = useState<InvoiceRecord | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = invoices.filter((item) => (statusFilter === "All" || item.status === statusFilter) && `${item.clientName} ${item.clientEmail} ${item.number}`.toLowerCase().includes(query.toLowerCase()));
  const statusFilterOptions = [
    { value: "All", label: "All statuses", count: invoices.length },
    ...(["Draft", "Sent", "Paid", "Overdue"] as const).map((status) => ({ value: status, label: status, count: invoices.filter((item) => item.status === status).length, dot: statusDot[status] })),
  ];
  const totalFor = (status: InvoiceStatus) => invoices.filter((item) => item.status === status).reduce((sum, item) => sum + item.amount, 0);

  function toggleMenu(id: string, event: MouseEvent<HTMLButtonElement>) {
    if (menuId === id) { setMenuId(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 168;
    const margin = 8;
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - margin) top = rect.top - menuHeight - 6;
    top = Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - menuHeight - margin));
    let left = rect.right - menuWidth;
    left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - menuWidth - margin));
    setMenuPos({ top, left });
    setMenuId(id);
  }

  async function submitInvoice(payload: { contactId: string; status: InvoiceStatus; docType: InvoiceDocType; template: InvoiceTemplateId; accentColor: string; secondaryColor: string; iconColor: string; descriptionFontSize: number; showPaymentInfo: boolean; footerMessage: string; issueDate: string; dueDate: string; taxRate: string; discount: string; notes: string; items: LineItem[] }, editingId?: string) {
    const cleanItems = payload.items.filter((item) => item.description.trim() && Number(item.quantity) > 0).map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), rate: Number(item.rate) || 0 }));
    if (cleanItems.length === 0) { setError("Add at least one line item."); return; }
    const form = new FormData();
    form.set("contactId", payload.contactId);
    form.set("status", payload.status);
    form.set("docType", payload.docType);
    form.set("template", payload.template);
    form.set("accentColor", payload.accentColor);
    form.set("secondaryColor", payload.secondaryColor);
    form.set("iconColor", payload.iconColor);
    form.set("descriptionFontSize", String(payload.descriptionFontSize));
    form.set("showPaymentInfo", String(payload.showPaymentInfo));
    form.set("footerMessage", payload.footerMessage);
    form.set("issueDate", payload.issueDate);
    form.set("dueDate", payload.dueDate);
    form.set("taxRate", payload.taxRate || "0");
    form.set("discount", payload.discount || "0");
    form.set("notes", payload.notes);
    form.set("items", JSON.stringify(cleanItems));
    setPending(true);
    setError(null);
    try {
      if (editingId) await updateInvoice(editingId, form);
      else await createInvoice(form);
      setAddOpen(false);
      setDialogMode(null);
      setSelected(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not save invoice. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeInvoice(id: string) {
    setMenuId(null);
    setInvoices((current) => current.filter((item) => item.id !== id));
    try {
      await deleteInvoice(id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  async function sendInvoice(item: InvoiceRecord) {
    setMenuId(null);
    const docLabel = item.docType === "Quotation" ? "Quotation" : "Invoice";
    const subject = encodeURIComponent(`${docLabel} ${item.number}`);
    const body = encodeURIComponent(`Hi ${item.clientName},\n\nPlease find ${docLabel.toLowerCase()} ${item.number} for ${currency.format(item.amount)}${item.docType === "Quotation" ? "" : `, due ${item.dueDate}`}.\n\nThank you.`);
    window.open(`mailto:${item.clientEmail}?subject=${subject}&body=${body}`, "_blank");
    try {
      await setInvoiceStatus(item.id, "Sent");
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  return <div className="invoices-page flex flex-col gap-5">
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-600 p-6 text-white shadow-xl shadow-blue-200/70"><div className="absolute -right-10 -top-20 size-52 rounded-full border-[30px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><FileText size={18} /></div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">Accounts receivable</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Invoices</h1><p className="mt-1 max-w-xl text-xs text-blue-50">Create professional invoices, track payments, and follow up on overdue balances.</p></div><div className="flex gap-2">{tab === "invoices" ? <button onClick={() => setCreateChoiceOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-blue-700 shadow-lg"><Plus size={14} />Create invoice</button> : <ContactQuickAdd setContacts={setContacts} />}</div></div></header>

    <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1"><button onClick={() => setTab("invoices")} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[9px] font-semibold transition ${tab === "invoices" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:text-slate-700"}`}><FileText size={13} />Invoices</button><button onClick={() => setTab("contacts")} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[9px] font-semibold transition ${tab === "contacts" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:text-slate-700"}`}><Users size={13} />Clients & Vendors</button></div>

    {tab === "invoices" ? <>
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-500"><FileText size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Total invoiced</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(invoices.reduce((sum, item) => sum + item.amount, 0))}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Across {invoices.length} invoices</p></article>
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-500"><FileCheck2 size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Paid</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(totalFor("Paid"))}</p><p className="mt-1 truncate text-[8px] text-emerald-600 sm:text-[9px]">Successfully collected</p></article>
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500"><CalendarDays size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Awaiting payment</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(totalFor("Sent"))}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Sent and not yet paid</p></article>
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-rose-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"><TriangleAlert size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Overdue</p></div><p className="mt-3 truncate text-lg font-semibold text-rose-600 sm:text-xl">{currency.format(totalFor("Overdue"))}</p><p className="mt-1 truncate text-[8px] text-rose-500 sm:text-[9px]">Requires attention</p></article>
      </section>
      <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.025)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">All invoices</h2><p className="mt-0.5 text-[9px] text-slate-400">Create, send, and track customer invoices</p></div><div className="flex flex-wrap gap-2"><label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:bg-white"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoices..." className="w-full bg-transparent text-[9px] outline-none" /></label><FilterSelect options={statusFilterOptions} value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} className="h-9 w-44" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/60 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Invoice & client</th><th className="px-4 py-3">Issue date</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3" /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-50 transition last:border-0 hover:bg-blue-50/30"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: item.accentColor }}><FileText size={15} /></span><div><p className="text-[10px] font-semibold text-slate-800">{item.clientName}</p><p className="mt-0.5 text-[8px] text-slate-400">{item.number}{item.clientEmail ? ` · ${item.clientEmail}` : ""}</p></div></div></td><td className="px-4 py-3.5 text-[9px] text-slate-500">{item.issueDate}</td><td className="px-4 py-3.5 text-[9px] text-slate-500">{item.dueDate}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span></td><td className="px-4 py-3.5 text-[10px] font-semibold text-slate-800">{currency.format(item.amount)}</td><td className="relative px-4 py-3.5"><button onClick={(event) => toggleMenu(item.id, event)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={15} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No invoices match these filters.</div>}</div><footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-[9px] text-slate-400">Showing {filtered.length} of {invoices.length} invoices</p></footer></section>
    </> : <ContactsManager contacts={contacts} setContacts={setContacts} />}

    {menuId && menuPos && (() => { const item = filtered.find((record) => record.id === menuId); if (!item) return null; return <>
      <button aria-label="Close menu" onClick={() => setMenuId(null)} className="fixed inset-0 z-[75] cursor-default" />
      <div style={{ top: menuPos.top, left: menuPos.left }} className="fixed z-[76] w-[150px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button onClick={() => { setSelected(item); setDialogMode("view"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Eye size={13} />View</button>
        <button onClick={() => { setSelected(item); setDialogMode("edit"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit</button>
        <a href={`/invoices/${item.id}/print?download=1`} target="_blank" rel="noreferrer" onClick={() => setMenuId(null)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Download size={13} />Download PDF</a>
        <button onClick={() => sendInvoice(item)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-blue-600 hover:bg-blue-50"><Send size={13} />Send {item.docType === "Quotation" ? "quotation" : "invoice"}</button>
        <button onClick={() => removeInvoice(item.id)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button>
      </div>
    </>; })()}

    {dialogMode === "view" && selected && <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-slate-950/60 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogMode(null); }}>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/70 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl text-white shadow-md" style={{ backgroundColor: selected.accentColor }}><FileText size={15} /></span>
          <div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/50">{selected.number}</p><h2 className="text-[14px] font-semibold text-white">{selected.docType === "Quotation" ? "Quotation" : "Invoice"} preview</h2></div>
          <span className={`ml-1 rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[selected.status]}`}>{selected.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/invoices/${selected.id}/print?download=1`} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[9px] font-semibold text-white transition hover:bg-white/20"><Download size={13} />Download PDF</a>
          <button onClick={() => sendInvoice(selected)} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[9px] font-semibold text-white transition hover:bg-white/20"><Mail size={13} />Send</button>
          <button onClick={() => setDialogMode("edit")} className="flex h-9 items-center gap-2 rounded-lg px-3 text-[9px] font-semibold text-white shadow-md" style={{ backgroundColor: selected.accentColor }}><Pencil size={13} />Edit</button>
          <button onClick={() => setDialogMode(null)} className="grid size-9 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><X size={15} /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto overflow-hidden rounded-lg bg-white shadow-2xl" style={{ width: A4_WIDTH, zoom: 0.6 }}>
          <InvoiceDocument invoice={selected} business={business} template={selected.template} accent={selected.accentColor} />
        </div>
      </div>
    </div>}

    {dialogMode === "edit" && selected && <InvoiceEditor mode="edit" record={selected} contacts={contacts} business={business} calendarPreference={calendarPreference} pending={pending} error={error} onCancel={() => setDialogMode(null)} onSubmit={(payload) => submitInvoice(payload, selected.id)} />}
    {addOpen && <InvoiceEditor mode="create" contacts={contacts} business={business} calendarPreference={calendarPreference} pending={pending} error={error} initialContactId={presetContactId} initialDocType={createDocType} onCancel={() => setAddOpen(false)} onSubmit={(payload) => submitInvoice(payload)} />}

    {createChoiceOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateChoiceOpen(false); }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-slate-900">What would you like to create?</h2><p className="mt-1 text-[11px] text-slate-400">Both use the same designer — a quotation is just labeled differently.</p></div><button onClick={() => setCreateChoiceOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><X size={15} /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => { setCreateDocType("Invoice"); setCreateChoiceOpen(false); setAddOpen(true); }} className="group rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/40"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100"><FileText size={18} /></span><p className="mt-3 text-[12px] font-semibold text-slate-800">Invoice</p><p className="mt-1 text-[9px] leading-4 text-slate-400">A billable request for payment.</p></button>
          <button onClick={() => { setCreateDocType("Quotation"); setCreateChoiceOpen(false); setAddOpen(true); }} className="group rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/40"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-100"><StickyNote size={18} /></span><p className="mt-3 text-[12px] font-semibold text-slate-800">Quotation</p><p className="mt-1 text-[9px] leading-4 text-slate-400">A price estimate before the client commits.</p></button>
        </div>
      </div>
    </div>}
  </div>;
}

function InvoiceEditor({
  mode,
  record,
  contacts,
  business,
  calendarPreference,
  pending,
  error,
  initialContactId,
  initialDocType,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  record?: InvoiceRecord;
  contacts: ContactRecord[];
  business: BusinessProfileRecord;
  calendarPreference: CalendarPreference;
  pending: boolean;
  error: string | null;
  initialContactId?: string;
  initialDocType?: InvoiceDocType;
  onCancel: () => void;
  onSubmit: (payload: { contactId: string; status: InvoiceStatus; docType: InvoiceDocType; template: InvoiceTemplateId; accentColor: string; secondaryColor: string; iconColor: string; descriptionFontSize: number; showPaymentInfo: boolean; footerMessage: string; issueDate: string; dueDate: string; taxRate: string; discount: string; notes: string; items: LineItem[] }) => void;
}) {
  const docType: InvoiceDocType = record?.docType ?? initialDocType ?? "Invoice";
  const docLabel = docType === "Quotation" ? "Quotation" : "Invoice";
  const [step, setStep] = useState<"template" | "details">("template");
  const [contactId, setContactId] = useState(record?.contactId ?? initialContactId ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(record?.status ?? "Draft");
  const [template, setTemplate] = useState<InvoiceTemplateId>((record?.template as InvoiceTemplateId) ?? "bold");
  const [accentColor, setAccentColor] = useState(record?.accentColor ?? ACCENT_COLORS[0]);
  const [secondaryColor, setSecondaryColor] = useState(record?.secondaryColor ?? "#202733");
  const [iconColor, setIconColor] = useState(record?.iconColor ?? record?.accentColor ?? ACCENT_COLORS[0]);
  const [descriptionFontSize, setDescriptionFontSize] = useState(record?.descriptionFontSize ?? 11);
  const [issueDate, setIssueDate] = useState(record?.issueDateISO ?? "2026-08-30");
  const [dueDate, setDueDate] = useState(record?.dueDateISO ?? "2026-09-13");
  const [taxRate, setTaxRate] = useState(record ? String(record.taxRate) : "0");
  const [discount, setDiscount] = useState(record ? String(record.discount) : "0");
  const [notes, setNotes] = useState(record?.notes ?? "Thank you for your business! We truly appreciate your trust and support.");
  const [showPaymentInfo, setShowPaymentInfo] = useState(record?.showPaymentInfo ?? true);
  const [footerMessage, setFooterMessage] = useState(record?.footerMessage ?? "Thank you for your business! We truly appreciate your trust and support.");
  const [items, setItems] = useState<LineItem[]>(record?.items.length ? record.items.map((line) => ({ description: line.description, quantity: String(line.quantity), rate: String(line.rate) })) : [blankItem()]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const contact = contacts.find((item) => item.id === contactId);
  const filteredContacts = contacts.filter((item) => `${item.name} ${item.email} ${item.type}`.toLowerCase().includes(contactQuery.toLowerCase()));
  const previewItems = items.filter((item) => item.description.trim()).map((item) => ({ description: item.description, quantity: Number(item.quantity) || 0, rate: Number(item.rate) || 0, amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0) }));
  const subtotal = previewItems.reduce((sum, item) => sum + item.amount, 0);
  const discountValue = Number(discount) || 0;
  const taxRateValue = Number(taxRate) || 0;
  const taxAmount = Math.max(subtotal - discountValue, 0) * (taxRateValue / 100);
  const previewTotal = Math.max(subtotal - discountValue, 0) + taxAmount;
  const sampleItems = [
    { description: "Service One", quantity: 1, rate: 400, amount: 400 },
    { description: "Service Two", quantity: 2, rate: 300, amount: 600 },
    { description: "Service Three", quantity: 1, rate: 250, amount: 250 },
    { description: "Service Four", quantity: 3, rate: 150, amount: 450 },
    { description: "Service Five", quantity: 2, rate: 200, amount: 400 },
  ];
  const sampleTotal = sampleItems.reduce((sum, item) => sum + item.amount, 0);
  const galleryInvoice = { number: record?.number ?? (docType === "Quotation" ? "QUO-1001" : "INV-1001"), status, docType, issueDate: formatDisplayDate(issueDate), dueDate: formatDisplayDate(dueDate), notes: "", clientName: contact?.name ?? "Mrs Angela Fransisca", clientEmail: contact?.email ?? "client@email.com", clientAddress: contact?.address ?? "123 2nd Ave, NYC", items: previewItems.length ? previewItems : sampleItems, subtotal: previewItems.length ? subtotal : sampleTotal, taxRate: 0, taxAmount: 0, discount: 0, amount: previewItems.length ? previewTotal : sampleTotal, showPaymentInfo, secondaryColor, footerMessage, iconColor, descriptionFontSize };
  const previewInvoice = { number: record?.number ?? "PREVIEW-0001", status, docType, issueDate: formatDisplayDate(issueDate), dueDate: formatDisplayDate(dueDate), notes, clientName: contact?.name ?? "Client name", clientEmail: contact?.email ?? "", clientAddress: contact?.address ?? "", items: previewItems, subtotal, taxRate: taxRateValue, taxAmount, discount: discountValue, amount: previewTotal, showPaymentInfo, secondaryColor, footerMessage, iconColor, descriptionFontSize };

  function updateItem(index: number, patch: Partial<LineItem>) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function addItemRow() { setItems((current) => [...current, blankItem()]); }
  function duplicateItemRow(index: number) { setItems((current) => [...current.slice(0, index + 1), { ...current[index] }, ...current.slice(index + 1)]); }
  function removeItemRow(index: number) { setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current); }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactId) { setContactMenuOpen(true); return; }
    onSubmit({ contactId, status, docType, template, accentColor, secondaryColor, iconColor, descriptionFontSize, showPaymentInfo, footerMessage, issueDate, dueDate: docType === "Quotation" ? issueDate : dueDate, taxRate, discount, notes, items });
  }

  if (step === "template") {
    return <>
      <InvoiceDesignStudio mode={mode} number={record?.number} docLabel={docLabel} template={template} accentColor={accentColor} secondaryColor={secondaryColor} iconColor={iconColor} descriptionFontSize={descriptionFontSize} invoice={galleryInvoice} business={business} onTemplate={setTemplate} onColor={setAccentColor} onSecondaryColor={setSecondaryColor} onIconColor={setIconColor} onDescriptionFontSize={setDescriptionFontSize} onCancel={() => setConfirmDiscard(true)} onContinue={() => setStep("details")} />
      {confirmDiscard && <ConfirmDiscardDialog onKeep={() => setConfirmDiscard(false)} onDiscard={onCancel} />}
    </>;
  }

  if (false) {
    return <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#f3f5f9]">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl text-white shadow-md" style={{ backgroundColor: accentColor }}><FileText size={15} /></span><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>{mode === "create" ? `New ${docLabel.toLowerCase()}` : record?.number}</p><h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">Create {docLabel.toLowerCase()}</h2></div><div className="ml-3 hidden items-center gap-1.5 border-l border-slate-200 pl-4 sm:flex"><span className="grid size-5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ backgroundColor: accentColor }}>1</span><span className="text-[8px] font-semibold text-slate-700">Design</span><span className="h-px w-5 bg-slate-200" /><span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[7px] font-bold text-slate-400">2</span><span className="text-[8px] font-semibold text-slate-400">Details</span></div></div><button onClick={onCancel} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200"><X size={15} /></button></header>

      <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-[1480px] px-5 py-5"><section className="relative overflow-hidden rounded-2xl bg-[#0b1d3a] p-5 text-white shadow-lg"><div className="absolute -right-16 -top-20 size-64 rounded-full blur-3xl" style={{ backgroundColor: `${accentColor}35` }} /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">Invoice appearance</p><h1 className="mt-1.5 text-xl font-semibold tracking-tight">Choose a design your clients will remember</h1><p className="mt-1 max-w-2xl text-[9px] leading-5 text-slate-300">Select a professional layout and personalize its accent color. You can preview every design before adding invoice details.</p></div><div className="rounded-xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur"><div className="mb-2.5 flex items-center justify-between"><p className="text-[8px] font-semibold text-slate-200">Brand color</p><span className="font-mono text-[7px] uppercase text-slate-400">{accentColor}</span></div><div className="flex flex-wrap items-center gap-2">{ACCENT_COLORS.map((color) => <button key={color} type="button" onClick={() => setAccentColor(color)} aria-label={`Use color ${color}`} className="grid size-8 place-items-center rounded-lg border transition" style={{ borderColor: accentColor === color ? "white" : "transparent", backgroundColor: `${color}35` }}><span className="grid size-5 place-items-center rounded-md" style={{ backgroundColor: color }}>{accentColor === color && <Check size={11} className="text-white" strokeWidth={3} />}</span></button>)}<label className="grid size-8 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/10 text-[10px] text-white" title="Custom color">+<input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} aria-label="Custom color" className="sr-only" /></label></div></div></div></section>

        <div className="mt-4 flex items-center justify-between"><div><h3 className="text-[11px] font-semibold text-slate-800">Professional templates</h3><p className="mt-0.5 text-[8px] text-slate-400">Click any design to select it</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-semibold text-slate-500 shadow-sm">{INVOICE_TEMPLATES.length} designs</span></div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{INVOICE_TEMPLATES.map((tpl) => { const selected = template === tpl.id; return <button key={tpl.id} type="button" onClick={() => setTemplate(tpl.id)} className={`group overflow-hidden rounded-2xl bg-white p-2.5 text-left transition duration-300 ${selected ? "-translate-y-0.5 shadow-xl" : "shadow-sm hover:-translate-y-0.5 hover:shadow-lg"}`} style={{ boxShadow: selected ? `0 0 0 2px ${accentColor}, 0 16px 32px -18px ${accentColor}` : undefined }}><div className="relative h-[270px] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"><div className="absolute left-1/2 top-2 -translate-x-1/2 origin-top scale-[0.225] shadow-xl" style={{ width: A4_WIDTH }}><InvoiceDocument invoice={galleryInvoice} business={business} template={tpl.id} accent={accentColor} /></div><span className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full shadow-lg transition ${selected ? "scale-100 text-white" : "scale-90 bg-white text-slate-300 opacity-0 group-hover:opacity-100"}`} style={selected ? { backgroundColor: accentColor } : undefined}>{selected ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}</span></div><div className="flex items-center justify-between px-1 pb-0.5 pt-3"><div><p className="text-[10px] font-semibold text-slate-800">{tpl.name}</p><p className="mt-0.5 text-[7px] text-slate-400">A4 · Professional invoice</p></div><span className="rounded-lg px-2 py-1 text-[7px] font-semibold" style={{ color: selected ? accentColor : "#94a3b8", backgroundColor: selected ? `${accentColor}12` : "#f8fafc" }}>{selected ? "Selected" : "Choose"}</span></div></button>; })}</div></div></main>

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg text-white" style={{ backgroundColor: accentColor }}><Check size={13} /></span><div><p className="text-[9px] font-semibold text-slate-700">{INVOICE_TEMPLATES.find((tpl) => tpl.id === template)?.name}</p><p className="text-[7px] text-slate-400">Selected invoice design</p></div></div><div className="flex gap-2"><button type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-4 text-[9px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => setStep("details")} className="flex h-9 items-center gap-2 rounded-lg px-5 text-[9px] font-semibold text-white shadow-md" style={{ backgroundColor: accentColor }}>Continue to {docLabel.toLowerCase()} details<ChevronRight size={12} /></button></div></footer>
    </div>;
  }

  const selectedTemplateName = INVOICE_TEMPLATES.find((tpl) => tpl.id === template)?.name;
  const filledItemCount = items.filter((item) => item.description.trim()).length;

  return <div className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
    <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl text-white shadow-md" style={{ backgroundColor: accentColor, boxShadow: `0 8px 18px -8px ${accentColor}` }}><FileText size={15} /></span><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>{mode === "create" ? `New ${docLabel.toLowerCase()}` : record?.number}</p><h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">{mode === "create" ? `Create ${docLabel.toLowerCase()}` : `Edit ${docLabel.toLowerCase()}`}</h2></div><div className="ml-3 hidden items-center gap-1.5 border-l border-slate-200 pl-4 sm:flex"><span className="grid size-5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ backgroundColor: accentColor }}>1</span><span className="text-[8px] font-semibold text-slate-400">Design</span><span className="h-px w-5 bg-slate-200" /><span className="grid size-5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ backgroundColor: accentColor }}>2</span><span className="text-[8px] font-semibold text-slate-700">Details</span></div></div>
      <button onClick={() => setConfirmDiscard(true)} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={15} /></button>
    </div>

    <form data-invoice-editor onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div data-invoice-form-pane className="min-h-0 flex-1 overflow-y-auto p-3.5 lg:p-4 xl:px-[10%]">
        <div className="mx-auto w-full max-w-[634px] space-y-3">
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}

          <button type="button" onClick={() => setStep("template")} className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: accentColor }}><Palette size={14} /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-slate-800">{selectedTemplateName} template</p><p className="text-[8px] text-slate-400">Tap to change design or color</p></div>
            <span className="size-4 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: accentColor }} />
            <ChevronRight size={13} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </button>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><Users2 size={12} style={{ color: accentColor }} />Client & schedule</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 text-[10px] font-semibold text-slate-600">
                Client / vendor
                <div className="relative">
                  <input type="hidden" name="contactId" value={contactId} />
                  <button type="button" onClick={() => { setContactMenuOpen((value) => !value); setContactQuery(""); }} className={`flex h-11 w-full items-center gap-2.5 rounded-lg border bg-white pl-1.5 pr-3 text-left text-[10px] font-medium text-slate-700 outline-none transition hover:border-slate-300 ${contactMenuOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-[9px] font-bold text-white shadow-sm transition" style={{ backgroundColor: contact ? accentColor : "#cbd5e1" }}>{contact ? contact.name.trim().slice(0, 1).toUpperCase() : <Users2 size={13} />}</span>
                    <span className={`min-w-0 flex-1 truncate ${contact ? "text-slate-700" : "text-slate-400"}`}>{contact ? contact.name : "Select a contact"}</span>
                    {contact && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[7px] font-semibold ${contact.type === "Client" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{contact.type}</span>}
                    <ChevronDown size={13} className={`shrink-0 text-slate-400 transition ${contactMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {contactMenuOpen && <>
                    <button type="button" aria-label="Close contact list" onClick={() => setContactMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
                    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/30">
                      <div className="border-b border-slate-100 p-2"><label className="flex h-9 items-center gap-2 rounded-lg bg-slate-50 px-2.5 text-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100"><Search size={12} /><input autoFocus value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Search contacts..." className="w-full bg-transparent text-[10px] text-slate-700 outline-none" /></label></div>
                      <div className="max-h-56 overflow-y-auto p-1.5">
                        {filteredContacts.length === 0 && <p className="px-3 py-4 text-center text-[9px] text-slate-400">No contacts match.</p>}
                        {filteredContacts.map((c) => { const isSelected = c.id === contactId; return <button type="button" key={c.id} onClick={() => { setContactId(c.id); setContactMenuOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                          <span className="grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: isSelected ? accentColor : "#94a3b8" }}>{c.name.trim().slice(0, 1).toUpperCase()}</span>
                          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800">{c.name}</p><p className="mt-0.5 flex items-center gap-1 truncate text-[8px] text-slate-400">{c.email && <Mail size={9} className="shrink-0" />}{c.email || c.phone || "No contact details"}</p></div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[7px] font-semibold ${c.type === "Client" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{c.type}</span>
                          {isSelected && <Check size={13} className="shrink-0" style={{ color: accentColor }} />}
                        </button>; })}
                      </div>
                    </div>
                  </>}
                </div>
                {contacts.length === 0 && <span className="mt-1 block text-[8px] text-amber-600">No contacts yet — add one from the Clients & Vendors tab.</span>}
              </div>
              <div className="space-y-1.5 text-[10px] font-semibold text-slate-600">
                Status
                <div className="relative">
                  <input type="hidden" name="status" value={status} />
                  <button type="button" onClick={() => setStatusMenuOpen((value) => !value)} className={`flex h-11 w-full items-center gap-2 rounded-lg border bg-white pl-3 pr-3 text-left text-[10px] font-medium text-slate-700 outline-none transition hover:border-slate-300 ${statusMenuOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    <span className={`size-2 shrink-0 rounded-full ${statusDot[status]}`} />
                    <span className="min-w-0 flex-1 truncate">{status}</span>
                    <ChevronDown size={13} className={`shrink-0 text-slate-400 transition ${statusMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {statusMenuOpen && <>
                    <button type="button" aria-label="Close status list" onClick={() => setStatusMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
                    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/30">
                      {(["Draft", "Sent", "Paid", "Overdue"] as const).map((s) => { const isSelected = s === status; const Icon = STATUS_ICON[s]; return <button type="button" key={s} onClick={() => { setStatus(s); setStatusMenuOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${isSelected ? statusOptionTone[s] : "hover:bg-slate-50"}`}>
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${statusOptionTone[s]}`}><Icon size={13} className={statusDot[s].replace("bg-", "text-")} /></span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-700">{s}</span>
                        {isSelected && <Check size={13} className={statusDot[s].replace("bg-", "text-")} />}
                      </button>; })}
                    </div>
                  </>}
                </div>
              </div>
              <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Issue date<DateField name="issueDateField" preference={calendarPreference} value={issueDate} onChange={setIssueDate} accent="violet" focusClassName="focus:border-blue-400" /></label>
              {docType !== "Quotation" && <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Due date<DateField name="dueDateField" preference={calendarPreference} value={dueDate} onChange={setDueDate} accent="violet" focusClassName="focus:border-blue-400" /></label>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><ListChecks size={12} style={{ color: accentColor }} />Line items</p><button type="button" onClick={addItemRow} className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold transition hover:bg-slate-50" style={{ color: accentColor }}><Plus size={11} />Add item</button></div>
            <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-100">
              <div className="hidden grid-cols-[1fr_60px_80px_80px_56px] gap-2 bg-slate-50 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-wider text-slate-400 sm:grid">
                <span>Description</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span><span />
              </div>
              <div className="divide-y divide-slate-100">{items.map((item, index) => <div key={index} className="flex items-center gap-1.5 p-2 sm:grid sm:grid-cols-[1fr_60px_80px_80px_56px]"><input value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Description" className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 text-[9px] outline-none focus:border-blue-400 sm:flex-none" /><input value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} type="number" min="0" step="0.01" placeholder="Qty" className="h-8 w-14 shrink-0 rounded-md border border-slate-200 px-1.5 text-[9px] outline-none focus:border-blue-400" /><input value={item.rate} onChange={(event) => updateItem(index, { rate: event.target.value })} type="number" min="0" step="0.01" placeholder="Rate" className="h-8 w-[72px] shrink-0 rounded-md border border-slate-200 px-1.5 text-[9px] outline-none focus:border-blue-400 sm:w-full" /><span className="w-[72px] shrink-0 text-right text-[9px] font-semibold text-slate-600 sm:w-full">{currency.format((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</span><div className="flex shrink-0 items-center"><button type="button" onClick={() => duplicateItemRow(index)} aria-label="Duplicate item" className="grid size-7 place-items-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500"><Copy size={12} /></button><button type="button" onClick={() => removeItemRow(index)} aria-label="Remove item" className="grid size-7 place-items-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={12} /></button></div></div>)}</div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">Tax<span className="flex h-8 items-center rounded-md border border-slate-200"><input value={taxRate} onChange={(event) => setTaxRate(event.target.value)} type="number" min="0" max="100" step="0.1" className="h-full w-14 rounded-l-md border-0 px-2 text-[9px] outline-none focus:ring-1" style={{ boxShadow: "none" }} /><span className="px-1.5 text-[9px] text-slate-400">%</span></span></label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">Discount<span className="flex h-8 items-center rounded-md border border-slate-200"><span className="pl-2 text-[9px] text-slate-400">Rs</span><input value={discount} onChange={(event) => setDiscount(event.target.value)} type="number" min="0" step="0.01" className="h-full w-16 rounded-r-md border-0 px-1.5 text-[9px] outline-none" /></span></label>
              </div>
              <div className="space-y-0.5 text-right">
                {discountValue > 0 && <p className="text-[8px] text-slate-400">Discount −{currency.format(discountValue)}</p>}
                {taxRateValue > 0 && <p className="text-[8px] text-slate-400">Tax +{currency.format(taxAmount)}</p>}
                <p className="text-[13px] font-bold" style={{ color: accentColor }}>{currency.format(previewTotal)}</p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CreditCard size={15} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-[10px] font-semibold text-slate-700">Payment information</p><span className={`rounded-full px-2 py-0.5 text-[7px] font-semibold ${showPaymentInfo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{showPaymentInfo ? "Visible on invoice" : "Hidden from invoice"}</span></div><p className="mt-1 text-[8px] text-slate-400">Choose whether payment information is displayed to your client.</p></div><button type="button" role="switch" aria-checked={showPaymentInfo} onClick={() => setShowPaymentInfo((value) => !value)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${showPaymentInfo ? "bg-emerald-500" : "bg-slate-200"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${showPaymentInfo ? "left-6" : "left-1"}`} /></button></section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <label className="block space-y-1.5 text-[10px] font-semibold text-slate-600"><span className="flex items-center gap-1.5"><StickyNote size={12} style={{ color: accentColor }} />Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Payment terms, thank-you note, etc." className="w-full resize-none rounded-lg border border-slate-200 p-2.5 text-[9px] leading-4 outline-none focus:border-blue-400" /></label>
            <label className="mt-3 block space-y-1.5 text-[10px] font-semibold text-slate-600"><span className="flex items-center justify-between"><span>Footer message</span><span className="text-[8px] font-normal text-slate-400">{footerMessage.length}/240</span></span><textarea value={footerMessage} onChange={(event) => setFooterMessage(event.target.value.slice(0, 240))} rows={2} placeholder="Thank your customer..." className="w-full resize-none rounded-lg border border-slate-200 p-2.5 text-[9px] leading-4 outline-none focus:border-blue-400" /><span className="block text-[8px] font-normal text-slate-400">Displayed inside the colored footer of the invoice.</span></label>
          </section>
        </div>
      </div>

      <div className="hidden min-h-0 w-[634px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-100 xl:flex">
        <div className="flex items-center justify-between px-4 pt-4"><p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: accentColor }} /><span className="relative inline-flex size-1.5 rounded-full" style={{ backgroundColor: accentColor }} /></span>Live preview</p><span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-slate-500 shadow-sm">{selectedTemplateName}</span></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto overflow-hidden rounded-lg shadow-lg ring-1 ring-slate-200" style={{ width: A4_WIDTH * 0.6624, height: A4_HEIGHT * 0.6624 }}>
            <div className="origin-top-left scale-[0.6624]" style={{ width: A4_WIDTH }}>
              <InvoiceDocument invoice={previewInvoice} business={business} template={template} accent={accentColor} />
            </div>
          </div>
        </div>
      </div>
    </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3.5">
        <div className="text-[9px] text-slate-400">{filledItemCount} item{filledItemCount === 1 ? "" : "s"} · <span className="font-semibold text-slate-700">{currency.format(previewTotal)}</span></div>
        <div className="flex gap-2"><button type="button" onClick={() => setConfirmDiscard(true)} className="h-9 rounded-lg border border-slate-200 px-4 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={pending} className="flex h-9 items-center gap-2 rounded-lg px-5 text-[10px] font-semibold text-white shadow-md transition disabled:opacity-60" style={{ backgroundColor: accentColor, boxShadow: `0 8px 18px -6px ${accentColor}66` }}>{pending ? "Saving..." : <><Check size={13} />{mode === "create" ? `Create ${docLabel.toLowerCase()}` : "Save changes"}</>}</button></div>
      </div>
    </form>
    {confirmDiscard && <ConfirmDiscardDialog onKeep={() => setConfirmDiscard(false)} onDiscard={onCancel} />}
  </div>;
}

function ConfirmDiscardDialog({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
  return <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onKeep(); }}>
    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><TriangleAlert size={18} /></span>
        <div>
          <h3 className="text-[13px] font-semibold text-slate-900">Discard this invoice?</h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Your changes haven&apos;t been saved yet. Closing now will discard everything you&apos;ve entered.</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onKeep} className="h-9 rounded-lg border border-slate-200 px-4 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Keep editing</button>
        <button type="button" onClick={onDiscard} className="flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-[10px] font-semibold text-white hover:bg-rose-700"><Trash2 size={13} />Discard</button>
      </div>
    </div>
  </div>;
}

function InvoiceDesignStudio({ mode, number, docLabel, template, accentColor, secondaryColor, iconColor, descriptionFontSize, invoice, business, onTemplate, onColor, onSecondaryColor, onIconColor, onDescriptionFontSize, onCancel, onContinue }: { mode: "create" | "edit"; number?: string; docLabel: string; template: InvoiceTemplateId; accentColor: string; secondaryColor: string; iconColor: string; descriptionFontSize: number; invoice: DocumentInvoice; business: DocumentBusiness; onTemplate: (template: InvoiceTemplateId) => void; onColor: (color: string) => void; onSecondaryColor: (color: string) => void; onIconColor: (color: string) => void; onDescriptionFontSize: (size: number) => void; onCancel: () => void; onContinue: () => void }) {
  const selectedName = INVOICE_TEMPLATES.find((item) => item.id === template)?.name;
  const [customOpen, setCustomOpen] = useState(false);
  const [customFile, setCustomFile] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  function submitCustomRequest(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setRequestSent(true); window.setTimeout(() => { setRequestSent(false); setCustomOpen(false); setCustomFile(""); }, 1800); }
  return <div data-design-studio className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#edf1f6]">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl text-white shadow-md" style={{ backgroundColor: accentColor }}><Palette size={15} /></span><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>{mode === "create" ? `New ${docLabel.toLowerCase()}` : number}</p><h1 className="text-[14px] font-semibold tracking-tight text-slate-900">{docLabel} design studio</h1></div></div><div className="hidden items-center gap-2 sm:flex"><span className="grid size-5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ backgroundColor: accentColor }}>1</span><span className="text-[8px] font-semibold text-slate-700">Choose design</span><span className="h-px w-8 bg-slate-200" /><span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[7px] font-bold text-slate-400">2</span><span className="text-[8px] font-semibold text-slate-400">{docLabel} details</span></div><button onClick={onCancel} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button></header>

    <main className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(520px,1fr)_250px]">
      <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4"><div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-3.5 text-white shadow-lg shadow-blue-200/60"><div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-white/10 blur-2xl" /><div className="pointer-events-none absolute -bottom-10 -left-6 size-24 rounded-full bg-white/10 blur-2xl" /><div className="relative flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 shadow-inner backdrop-blur"><Palette size={15} /></span><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/70">Templates</p><p className="mt-0.5 text-[10px] font-semibold">Choose your layout</p></div></div><p className="relative mt-2.5 text-[7px] leading-4 text-white/70">Pick a professional {docLabel.toLowerCase()} style that matches your business.</p></div><div className="mt-3 space-y-1.5">{INVOICE_TEMPLATES.map((item, index) => { const selected = item.id === template; return <button key={item.id} onClick={() => onTemplate(item.id)} className={`group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${selected ? "border-transparent bg-blue-600 text-white shadow-md" : "border-transparent bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-px hover:shadow-md"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[8px] font-bold transition ${selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-semibold">{item.name}</span><span className={`mt-0.5 block text-[7px] ${selected ? "text-white/70" : "text-slate-400"}`}>A4 professional</span></span><span className={`grid size-5 place-items-center rounded-full ${selected ? "bg-white/15 text-white" : "bg-slate-50 text-slate-300 opacity-0 group-hover:opacity-100"}`}>{selected ? <Check size={10} strokeWidth={3} /> : <ChevronRight size={10} />}</span></button>; })}</div><button onClick={() => setCustomOpen(true)} className="group mt-4 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-[1px] text-left shadow-lg shadow-violet-100"><span className="block rounded-[15px] bg-white p-3 transition group-hover:bg-violet-50"><span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-violet-100 text-violet-700"><Sparkles size={14} /></span><span><span className="block text-[8px] font-semibold text-slate-700">Need a custom design?</span><span className="mt-0.5 block text-[7px] text-slate-400">Request your own invoice template</span></span><ChevronRight size={12} className="ml-auto text-violet-500 transition group-hover:translate-x-0.5" /></span></span></button></aside>

      <section className="relative min-h-0 overflow-auto p-5"><div className="mx-auto flex min-h-full max-w-4xl items-start justify-center"><div><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold text-slate-700">{selectedName}</p><p className="mt-0.5 text-[7px] text-slate-400">Live {docLabel.toLowerCase()} preview</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[7px] font-semibold text-emerald-600 shadow-sm">Selected</span></div><div className="relative overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] ring-1 ring-slate-300" style={{ width: A4_WIDTH * 0.9048, height: A4_HEIGHT * 0.9048 }}><div className="origin-top-left scale-[0.9048]" style={{ width: A4_WIDTH }}><InvoiceDocument invoice={invoice} business={business} template={template} accent={accentColor} /></div></div></div></div></section>

      <aside className="border-l border-slate-200 bg-white p-4"><p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-400">Brand styling</p><h2 className="mt-1 text-[12px] font-semibold text-slate-800">Choose both colors</h2>

        <div className="mt-4"><p className="text-[8px] font-semibold text-slate-500">Ready-made combinations</p><div className="mt-2 grid grid-cols-4 gap-2">{COLOR_COMBOS.map((combo) => { const active = combo.accent.toLowerCase() === accentColor.toLowerCase() && combo.secondary.toLowerCase() === secondaryColor.toLowerCase(); return <button key={combo.name} type="button" onClick={() => { onColor(combo.accent); onSecondaryColor(combo.secondary); }} aria-label={`Use ${combo.name}`} title={combo.name} className="group relative aspect-square overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: active ? combo.accent : "#e2e8f0" }}><span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${combo.secondary} 50%, ${combo.accent} 50%)` }} />{active && <span className="absolute inset-0 grid place-items-center"><Check size={12} className="text-white drop-shadow" strokeWidth={3} /></span>}</button>; })}</div></div>

        <div className="my-4 border-t border-slate-100" />
        <div><p className="mb-1 text-[7px] leading-4 text-slate-400">Used for highlights, totals, and key headings.</p><ColorPicker value={accentColor} onChange={onColor} presets={ACCENT_COLORS} label="Primary color" /></div>
        <div className="my-4 border-t border-slate-100" />
        <div><p className="mb-1 text-[7px] leading-4 text-slate-400">Used for headers, footers, and structural blocks.</p><ColorPicker value={secondaryColor} onChange={onSecondaryColor} presets={["#111827", "#1f2937", "#202733", "#263247", "#172554", "#312e81", "#3f1d2e", "#3f3f46"]} label="Secondary color" /></div>
        <div className="my-4 border-t border-slate-100" />
        <div><p className="mb-1 text-[7px] leading-4 text-slate-400">Used for contact, payment, and location icons.</p><ColorPicker value={iconColor} onChange={onIconColor} presets={ACCENT_COLORS} label="Icon color" /></div>
        <div className="my-4 border-t border-slate-100" />
        <div><div className="flex items-center justify-between"><p className="text-[8px] font-semibold text-slate-500">Line-item text size</p><span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-semibold text-slate-600">{descriptionFontSize}px</span></div><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => onDescriptionFontSize(Math.max(9, descriptionFontSize - 1))} disabled={descriptionFontSize <= 9} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-35">−</button><input type="range" min="9" max="16" value={descriptionFontSize} onChange={(event) => onDescriptionFontSize(Number(event.target.value))} className="min-w-0 flex-1 accent-violet-600" /><button type="button" onClick={() => onDescriptionFontSize(Math.min(16, descriptionFontSize + 1))} disabled={descriptionFontSize >= 16} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-35">+</button></div><p className="mt-1.5 text-[7px] leading-4 text-slate-400">Adjust descriptions, quantities, rates, and amounts together.</p></div>
        <div className="mt-5 rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${accentColor})` }}><p className="text-[8px] font-semibold text-white/70">Current combination</p><p className="mt-1 text-[10px] font-semibold text-white">{selectedName}</p><div className="mt-2 flex gap-1.5"><span className="size-4 rounded-full border border-white/30" style={{ backgroundColor: accentColor }} /><span className="size-4 rounded-full border border-white/30" style={{ backgroundColor: secondaryColor }} /><span className="size-4 rounded-full border border-white/30" style={{ backgroundColor: iconColor }} /></div></div>
      </aside>
    </main>

    <footer className="flex h-16 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5"><div className="flex items-center gap-4"><div><p className="text-[8px] text-slate-400">Selected template</p><p className="mt-0.5 text-[9px] font-semibold text-slate-700">{selectedName}</p></div><button onClick={() => setCustomOpen(true)} className="hidden h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[8px] font-semibold text-violet-700 transition hover:bg-violet-100 sm:flex"><Sparkles size={12} />Request custom template</button></div><div className="flex gap-2"><button onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-4 text-[9px] font-semibold text-slate-600">Cancel</button><button onClick={onContinue} className="flex h-9 items-center gap-2 rounded-lg px-5 text-[9px] font-semibold text-white shadow-md" style={{ backgroundColor: accentColor }}>Use this design<ChevronRight size={12} /></button></div></footer>

    {customOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={submitCustomRequest} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="relative overflow-hidden bg-[#0b1d3a] p-5 text-white"><div className="absolute -right-12 -top-16 size-48 rounded-full bg-violet-500/25 blur-3xl" /><div className="relative flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-white/10 text-violet-300"><Sparkles size={17} /></span><h2 className="mt-4 text-lg font-semibold">Request a custom template</h2><p className="mt-1 max-w-sm text-[9px] leading-4 text-slate-300">Upload a reference and describe the invoice design you want for your business.</p></div><button type="button" onClick={() => setCustomOpen(false)} className="grid size-8 place-items-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/15"><X size={14} /></button></div></div><div className="p-5"><label className="block text-[8px] font-semibold text-slate-600">Template name<input required placeholder="e.g. Modern consulting invoice" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label><label className="mt-4 block text-[8px] font-semibold text-slate-600">Reference file<span className="mt-1.5 grid min-h-28 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 text-center transition hover:border-violet-400"><span><UploadCloud size={21} className="mx-auto text-violet-500" /><span className="mt-2 block text-[9px] font-semibold text-slate-600">{customFile || "Upload a design reference"}</span><span className="mt-1 block text-[7px] text-slate-400">PDF, PNG, JPG or DOCX · up to 10 MB</span></span></span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="sr-only" onChange={(event) => setCustomFile(event.target.files?.[0]?.name ?? "")} /></label><label className="mt-4 block text-[8px] font-semibold text-slate-600">Describe your requirements<textarea required rows={4} placeholder="Tell us about the layout, sections, colors, logo placement, payment information, or any special fields you need..." className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-[9px] leading-4 outline-none focus:border-violet-400" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[8px] font-semibold text-slate-600">Preferred style<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px]"><option>Modern</option><option>Minimal</option><option>Corporate</option><option>Creative</option></select></label><label className="text-[8px] font-semibold text-slate-600">Priority<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px]"><option>Standard</option><option>Urgent</option></select></label></div><div className="mt-6 flex gap-2"><button type="button" onClick={() => setCustomOpen(false)} className="h-10 flex-1 rounded-xl border border-slate-200 text-[9px] font-semibold text-slate-600">Cancel</button><button type="submit" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-[9px] font-semibold text-white shadow-md shadow-violet-200">{requestSent ? <><Check size={13} />Request sent</> : <><Send size={13} />Submit request</>}</button></div></div></form></div>}
  </div>;
}

function formatDisplayDate(iso: string) {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ContactQuickAdd({ setContacts }: { setContacts: (updater: (current: ContactRecord[]) => ContactRecord[]) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const created = await createContact(form);
      setContacts((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setOpen(false);
    } catch {
      setError("Could not save contact.");
    } finally {
      setPending(false);
    }
  }
  return <>
    <button onClick={() => setOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-blue-700 shadow-lg"><Plus size={14} />Add client / vendor</button>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><h2 className="text-lg font-semibold text-slate-900">Add client or vendor</h2><button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}<ContactFields /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-blue-600 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save contact"}</button></div></form></div>}
  </>;
}

function ContactFields({ record }: { record?: ContactRecord }) {
  return <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Type<select name="type" defaultValue={record?.type ?? "Client"} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] outline-none focus:border-blue-400"><option>Client</option><option>Vendor</option></select></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Name<input required name="name" defaultValue={record?.name} placeholder="Company or person" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-blue-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Email<input name="email" type="email" defaultValue={record?.email} placeholder="billing@company.com" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-blue-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Phone<input name="phone" defaultValue={record?.phone} placeholder="+977 98XXXXXXXX" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-blue-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">PAN / VAT<input name="panVat" defaultValue={record?.panVat} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-blue-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600 sm:col-span-2">Address<input name="address" defaultValue={record?.address} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-blue-400" /></label>
  </div>;
}

function ContactsManager({ contacts, setContacts }: { contacts: ContactRecord[]; setContacts: (updater: (current: ContactRecord[]) => ContactRecord[]) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Client" | "Vendor">("All");
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = contacts.filter((item) => (typeFilter === "All" || item.type === typeFilter) && `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const updated = await updateContact(editing.id, form);
      setContacts((current) => current.map((item) => item.id === updated.id ? updated : item).sort((a, b) => a.name.localeCompare(b.name)));
      setEditing(null);
    } catch {
      setError("Could not update contact.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setContacts((current) => current.filter((item) => item.id !== id));
    try {
      await deleteContact(id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.025)]">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Clients & vendors</h2><p className="mt-0.5 text-[9px] text-slate-400">Saved contacts you can bill or pay</p></div><div className="flex flex-wrap gap-2"><label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:bg-white"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts..." className="w-full bg-transparent text-[9px] outline-none" /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[9px] text-slate-600 outline-none"><option>All</option><option>Client</option><option>Vendor</option></select></div></div>
    {error && <p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}
    <div className="divide-y divide-slate-50">{filtered.map((contact) => <div key={contact.id} className="flex items-center gap-3 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Contact2 size={16} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[10px] font-semibold text-slate-800">{contact.name}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[7px] font-semibold text-slate-500">{contact.type}</span></div><p className="mt-0.5 truncate text-[8px] text-slate-400">{[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact info"}</p></div><button onClick={() => setEditing(contact)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Pencil size={13} /></button><button onClick={() => remove(contact.id)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button></div>)}
      {filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No contacts yet. Use &quot;Add client / vendor&quot; above to create one.</div>}
    </div>
    {editing && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><h2 className="text-lg font-semibold text-slate-900">Edit contact</h2><button type="button" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div><ContactFields record={editing} /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-blue-600 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button></div></form></div>}
  </section>;
}
