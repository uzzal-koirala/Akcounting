"use client";

import { ArrowUpRight, CalendarDays, Download, Eye, Filter, ImageOff, ImagePlus, MoreHorizontal, Pencil, Plus, ReceiptText, Search, Trash2, TrendingDown, WalletCards, X } from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, MouseEvent, startTransition, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createExpense, deleteExpense, updateExpense as updateExpenseAction, type ExpenseRecord } from "@/actions/expenses";
import { createExpenseCategory, deleteExpenseCategory, type ExpenseCategoryRecord } from "@/actions/expense-categories";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { DateField } from "@/components/date-field";
import { NepaliDatePicker } from "@/components/nepali-date-picker";
import { StatusSelect } from "@/components/status-select";
import { CategorySelect, type CategoryOption } from "@/components/category-select";
import { AmountInput } from "@/components/amount-input";
import { PremiumLockField, UpgradeModal } from "@/components/upgrade-gate";
import { hasProofUploads, type PlanName } from "@/lib/plan";
import { exportRowsToCsv } from "@/lib/csv-export";
import { formatDisplayDate, getDefaultDateRange, type CalendarPreference } from "@/lib/calendar";

type Expense = ExpenseRecord;
const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 2 }).format(amount)}/-` };

export function ExpensesPage({ initialRecords, initialCategories, calendarPreference, plan, businessCycleStartDay }: { initialRecords: Expense[]; initialCategories: ExpenseCategoryRecord[]; calendarPreference: CalendarPreference; plan: PlanName; businessCycleStartDay: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(initialRecords);
  const [syncedRecords, setSyncedRecords] = useState(initialRecords);
  if (initialRecords !== syncedRecords) {
    setSyncedRecords(initialRecords);
    setRecords(initialRecords);
  }
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [syncedCategories, setSyncedCategories] = useState(initialCategories);
  if (initialCategories !== syncedCategories) {
    setSyncedCategories(initialCategories);
    setCategories(initialCategories);
  }
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Expense["status"]>("All");
  const defaultDateRange = getDefaultDateRange(calendarPreference, businessCycleStartDay);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const [addOpen, setAddOpen] = useState(() => searchParams.get("new") === "1");
  useEffect(() => {
    if (searchParams.get("new") === "1") router.replace("/expenses");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofFileMeta, setProofFileMeta] = useState<{ name: string; size: string } | null>(null);
  const [removeProofFlag, setRemoveProofFlag] = useState(false);
  const [proofDragging, setProofDragging] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const filtered = records.filter((item) => (statusFilter === "All" || item.status === statusFilter) && `${item.vendor} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (!dateFrom || item.dateISO >= dateFrom) && (!dateTo || item.dateISO <= dateTo));
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  function exportExpenses() {
    exportRowsToCsv(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((item) => ({ Vendor: item.vendor, Description: item.description, Category: item.category, Date: item.date, Amount: item.amount, Status: item.status })));
  }
  // The four summary boxes reflect the active date range filter (defaulting to the current
  // billing cycle), not all-time totals — so they stay in sync with whatever period the user
  // has selected via the date pickers, independent of the search/status filters.
  const dateFiltered = records.filter((item) => (!dateFrom || item.dateISO >= dateFrom) && (!dateTo || item.dateISO <= dateTo));
  const paid = dateFiltered.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);
  const pendingTotal = dateFiltered.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
  const total = paid + pendingTotal;
  const periodLabel = dateFrom && dateTo ? `${formatDisplayDate(new Date(`${dateFrom}T00:00:00`), calendarPreference)} – ${formatDisplayDate(new Date(`${dateTo}T00:00:00`), calendarPreference)}` : "All time";

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await createExpense(form);
      setAddOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not save expense. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function updateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await updateExpenseAction(selected.id, form);
      setDialogMode(null);
      setSelected(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not update expense. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeExpense(id: string) {
    setMenuId(null);
    setRecords((items) => items.filter((record) => record.id !== id));
    try {
      await deleteExpense(id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  function toggleMenu(id: string, event: MouseEvent<HTMLButtonElement>) {
    if (menuId === id) { setMenuId(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 128;
    const menuHeight = 112;
    const margin = 8;
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - margin) top = rect.top - menuHeight - 6;
    top = Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - menuHeight - margin));
    let left = rect.right - menuWidth;
    left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - menuWidth - margin));
    setMenuPos({ top, left });
    setMenuId(id);
  }

  function openAddModal() {
    setProofPreview(null);
    setProofFileMeta(null);
    setRemoveProofFlag(false);
    setProofError(null);
    setError(null);
    setAddOpen(true);
  }

  function openEditDialog(item: Expense) {
    setSelected(item);
    setProofPreview(item.proofUrl ?? null);
    setProofFileMeta(null);
    setRemoveProofFlag(false);
    setProofError(null);
    setError(null);
    setMenuId(null);
    setDialogMode("edit");
  }

  function acceptProofFile(file: File) {
    if (!file.type.startsWith("image/")) { setProofError("Please choose an image file (PNG, JPG, WEBP)."); return; }
    if (file.size > 3 * 1024 * 1024) { setProofError("Image must be smaller than 3 MB."); return; }
    setProofError(null);
    setRemoveProofFlag(false);
    setProofFileMeta({ name: file.name, size: file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB` });
    const reader = new FileReader();
    reader.onload = () => setProofPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function onProofChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) acceptProofFile(file);
  }

  function onProofDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setProofDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (proofInputRef.current) proofInputRef.current.files = transfer.files;
    acceptProofFile(file);
  }

  function clearProof() {
    setProofPreview(null);
    setProofFileMeta(null);
    setProofError(null);
    setRemoveProofFlag(true);
    if (proofInputRef.current) proofInputRef.current.value = "";
  }

  function renderProofField() {
    if (!hasProofUploads(plan)) {
      return <div className="sm:col-span-2"><PremiumLockField label="Expense proof (image)" onClick={() => setUpgradeOpen(true)} /></div>;
    }
    return <div className="sm:col-span-2">
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-600"><span>Expense proof (image)</span><span className="text-[8px] font-medium text-slate-400">Optional</span></span>
      <input ref={proofInputRef} onChange={onProofChange} name="proof" type="file" accept="image/*" className="hidden" />
      {proofPreview ? (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={proofPreview} alt="Expense proof preview" className="h-40 w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <div className="absolute inset-x-0 bottom-0 flex translate-y-1 items-center justify-between gap-2 p-2.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <button type="button" onClick={() => proofInputRef.current?.click()} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-3 text-[9px] font-semibold text-slate-700 shadow-sm hover:bg-white"><ImagePlus size={12} />Change</button>
            <button type="button" onClick={clearProof} className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600/95 px-3 text-[9px] font-semibold text-white shadow-sm hover:bg-rose-600"><ImageOff size={12} />Remove</button>
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[8px] font-semibold text-emerald-600 shadow-sm"><span className="size-1.5 rounded-full bg-emerald-500" />{proofFileMeta ? "New image" : "Attached"}</div>
        </div>
      ) : (
        <div
          onClick={() => proofInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setProofDragging(true); }}
          onDragLeave={() => setProofDragging(false)}
          onDrop={onProofDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") proofInputRef.current?.click(); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${proofDragging ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-slate-50/70 hover:border-rose-300 hover:bg-rose-50/40"}`}
        >
          <span className={`grid size-10 place-items-center rounded-full transition ${proofDragging ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-600"}`}><ImagePlus size={17} /></span>
          <p className="text-[9px] font-semibold text-slate-600">Drag & drop an image, or <span className="text-rose-600">browse</span></p>
          <p className="text-[8px] text-slate-400">PNG, JPG or WEBP · up to 3 MB</p>
        </div>
      )}
      {proofError && <p role="alert" className="mt-1.5 flex items-center gap-1 text-[8px] font-medium text-rose-600"><ImageOff size={10} />{proofError}</p>}
      {proofFileMeta && !proofError && <p className="mt-1.5 truncate text-[8px] text-slate-400">{proofFileMeta.name} · {proofFileMeta.size}</p>}
      <input type="hidden" name="removeProof" value={removeProofFlag ? "true" : "false"} readOnly />
    </div>;
  }

  async function handleAddCategory(categoryName: string) {
    const created = await createExpenseCategory(categoryName);
    setCategories((current) => (current.some((item) => item.id === created.id) ? current : [...current, created].sort((a, b) => a.name.localeCompare(b.name))));
    startTransition(() => router.refresh());
    return created;
  }

  async function handleDeleteCategory(category: CategoryOption) {
    setCategories((current) => current.filter((item) => item.id !== category.id));
    try {
      await deleteExpenseCategory(category.id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  const fields = (record?: Expense) => <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Vendor<input required name="vendor" defaultValue={record?.vendor} placeholder="Vendor name" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-rose-400" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Payment method<PaymentMethodSelect name="description" defaultValue={record?.description} accent="rose" /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Category<CategorySelect name="category" categories={categories} defaultValue={record?.category} accent="rose" onAdd={handleAddCategory} onDelete={handleDeleteCategory} /></label>
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Amount<AmountInput required name="amount" defaultValue={record?.amount} placeholder="0.00" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-rose-400" /></label>
    {!record && <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Date<DateField name="date" preference={calendarPreference} defaultValue="2026-08-30" accent="rose" focusClassName="focus:border-rose-400" /></label>}
    <label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Status<StatusSelect name="status" options={["Paid", "Pending"] as const} defaultValue={record?.status} accent="rose" /></label>
    {renderProofField()}
  </div>;

  return <div className="expenses-page flex flex-col gap-5">
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-orange-500 p-6 text-white shadow-xl shadow-rose-200/70"><div className="absolute -right-12 -top-16 size-48 rounded-full border-[28px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><ArrowUpRight size={18} /></div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">Cost center</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Expenses</h1><p className="mt-1 max-w-xl text-xs text-rose-50">Control business spending, organize vendor payments, and keep costs accountable.</p></div><div className="flex gap-2"><button onClick={exportExpenses} className="flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-[10px] font-semibold backdrop-blur hover:bg-white/15"><Download size={14} />Export</button><button onClick={openAddModal} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-rose-700 shadow-lg"><Plus size={14} />Add expense</button></div></div></header>
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-rose-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"><ReceiptText size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Total in period</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(total)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{periodLabel}</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-500"><WalletCards size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Paid expenses</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(paid)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{dateFiltered.filter((item) => item.status === "Paid").length} completed payments</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500"><TrendingDown size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Pending expenses</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(pendingTotal)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Awaiting payment</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-rose-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"><ReceiptText size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Average expense</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(dateFiltered.length ? total / dateFiltered.length : 0)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Per expense transaction</p></article>
    </section>
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.025)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Expense transactions</h2><p className="mt-0.5 text-[9px] text-slate-400">Search, filter, and manage all outgoing payments</p></div><div className="flex flex-wrap gap-2"><label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:bg-white"><Search size={13} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search expenses" placeholder="Search expenses..." className="w-full bg-transparent text-[9px] outline-none" /></label><div className="flex rounded-lg border border-slate-200 bg-white p-1">{(["All", "Paid", "Pending"] as const).map((status) => <button key={status} onClick={() => { setStatusFilter(status); setPage(1); }} className={`rounded-md px-3 py-1.5 text-[9px] font-semibold ${statusFilter === status ? "bg-rose-50 text-rose-700" : "text-slate-400 hover:text-slate-700"}`}>{status}</button>)}</div>{calendarPreference === "BS" ? <div className="w-[150px]"><NepaliDatePicker name="expenseDateFrom" defaultValue={dateFrom || undefined} accent="rose" onChange={(value) => { setDateFrom(value); setPage(1); }} /></div> : <label className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[9px] font-medium text-slate-600"><CalendarDays size={12} className="text-slate-400" /><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} aria-label="From date" className="w-[104px] bg-transparent text-[9px] text-slate-600 outline-none" /></label>}{calendarPreference === "BS" ? <div className="w-[150px]"><NepaliDatePicker name="expenseDateTo" defaultValue={dateTo || undefined} accent="rose" onChange={(value) => { setDateTo(value); setPage(1); }} /></div> : <label className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[9px] font-medium text-slate-600"><span className="text-slate-400">to</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} aria-label="To date" className="w-[104px] bg-transparent text-[9px] text-slate-600 outline-none" /></label>}{(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[9px] font-medium text-slate-500 hover:bg-slate-50">Clear<X size={11} /></button>}<button aria-label="More filters" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><Filter size={13} /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/60 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Vendor & payment method</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3" /></tr></thead><tbody>{paged.map((item) => <tr key={item.id} className="border-b border-slate-50 transition last:border-0 hover:bg-rose-50/30"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-500"><ArrowUpRight size={15} /></div><div><p className="text-[10px] font-semibold text-slate-800">{item.vendor}</p><p className="mt-0.5 text-[8px] text-slate-400">{item.description} · {item.displayId}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-medium text-slate-600">{item.category}</span></td><td className="px-4 py-3.5 text-[9px] text-slate-500">{item.date}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${item.status === "Paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.status}</span></td><td className="px-4 py-3.5 text-[10px] font-semibold text-rose-600">−{currency.format(item.amount)}</td><td className="relative px-4 py-3.5"><button onClick={(event) => toggleMenu(item.id, event)} aria-label={`Actions for ${item.vendor}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={15} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No expense records match these filters.</div>}</div><footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3"><p className="text-[9px] text-slate-400">Showing {paged.length === 0 ? 0 : pageStart + 1}-{pageStart + paged.length} of {filtered.length} expense records</p><div className="flex gap-1"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-500 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button className="rounded-md bg-rose-600 px-2.5 py-1.5 text-[9px] text-white">{currentPage}</button><button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage >= totalPages} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-500 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></footer></section>
    {menuId && menuPos && (() => { const item = filtered.find((record) => record.id === menuId); if (!item) return null; return <>
      <button aria-label="Close menu" onClick={() => setMenuId(null)} className="fixed inset-0 z-[75] cursor-default" />
      <div style={{ top: menuPos.top, left: menuPos.left }} className="fixed z-[76] w-32 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button onClick={() => { setSelected(item); setDialogMode("view"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Eye size={13} />View</button>
        <button onClick={() => openEditDialog(item)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit</button>
        <button onClick={() => removeExpense(item.id)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button>
      </div>
    </>; })()}
    {dialogMode === "view" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogMode(null); }}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">{selected.displayId}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Expense details</h2></div><button onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div><div className="mt-5 rounded-xl bg-rose-50 p-4"><p className="text-[9px] text-rose-400">Amount</p><p className="mt-1 text-2xl font-semibold text-rose-700">−{currency.format(selected.amount)}</p></div><dl className="mt-5 grid grid-cols-2 gap-4">{[["Vendor", selected.vendor], ["Category", selected.category], ["Date", selected.date], ["Status", selected.status], ["Payment method", selected.description]].map(([label, value], index) => <div key={label} className={index === 4 ? "col-span-2" : ""}><dt className="text-[9px] text-slate-400">{label}</dt><dd className="mt-1 text-[11px] font-semibold text-slate-700">{value}</dd></div>)}</dl><div className="mt-4"><p className="text-[9px] text-slate-400">Expense proof</p>{selected.proofUrl ? <img src={selected.proofUrl} alt="Expense proof" className="mt-2 max-h-56 w-full rounded-lg border border-slate-200 object-contain" /> : <div className="mt-2 flex h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-[9px] text-slate-400"><ImageOff size={14} />No proof uploaded</div>}</div><div className="mt-6 flex justify-end"><button onClick={() => openEditDialog(selected)} className="flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-[10px] font-semibold text-white"><Pencil size={13} />Edit expense</button></div></div></div>}
    {dialogMode === "edit" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form onSubmit={updateExpense} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">{selected.displayId}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Edit expense</h2></div><button type="button" onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}{fields(selected)}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDialogMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-rose-600 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button></div></form></div>}
    {addOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form onSubmit={addExpense} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Cost entry</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Add expense</h2><p className="mt-1 text-[10px] text-slate-400">Record a paid or upcoming business cost.</p></div><button type="button" onClick={() => setAddOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}{fields()}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-rose-600 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save expense"}</button></div></form></div>}
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="proof uploads" plan={plan} />
  </div>;
}
