"use client";

import { Banknote, Download, Eye, Filter, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, UsersRound, WalletCards, X } from "lucide-react";
import { FormEvent, MouseEvent, startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSalary, deleteSalary, updateSalary as updateSalaryAction, type SalaryRecord, type SalaryStatus } from "@/actions/salaries";
import { StatusSelect } from "@/components/status-select";
import { MonthPicker } from "@/components/month-picker";
import { AmountInput } from "@/components/amount-input";
import { exportRowsToCsv } from "@/lib/csv-export";
import { AD_MONTH_NAMES, BS_MONTH_NAMES, monthLabelToKey, type CalendarPreference } from "@/lib/calendar";

type Status = SalaryStatus;
type Salary = SalaryRecord;
const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(amount)}/-` };
const statusStyle: Record<Status, string> = { Paid: "bg-emerald-50 text-emerald-600", Processing: "bg-blue-50 text-blue-600", Pending: "bg-amber-50 text-amber-600" };

export function SalariesPage({ initialRecords, calendarPreference }: { initialRecords: Salary[]; calendarPreference: CalendarPreference }) {
  const monthKey = (label: string) => monthLabelToKey(label, calendarPreference);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(initialRecords);
  const [syncedRecords, setSyncedRecords] = useState(initialRecords);
  if (initialRecords !== syncedRecords) {
    setSyncedRecords(initialRecords);
    setRecords(initialRecords);
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [addOpen, setAddOpen] = useState(() => searchParams.get("new") === "1");
  useEffect(() => {
    if (searchParams.get("new") === "1") router.replace("/salaries");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selected, setSelected] = useState<Salary | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = records.filter((item) => (filter === "All" || item.status === filter) && `${item.employee} ${item.role} ${item.displayId}`.toLowerCase().includes(query.toLowerCase()) && (!monthFrom || monthKey(item.month) >= monthFrom) && (!monthTo || monthKey(item.month) <= monthTo));
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  // The four summary boxes reflect the active month range filter, not all-time totals — so
  // they stay in sync with whatever period the user has selected, independent of search/status.
  const monthFiltered = records.filter((item) => (!monthFrom || monthKey(item.month) >= monthFrom) && (!monthTo || monthKey(item.month) <= monthTo));
  const grossPayroll = monthFiltered.reduce((sum, item) => sum + item.gross, 0);
  const deductions = monthFiltered.reduce((sum, item) => sum + item.deductions, 0);
  const bonuses = monthFiltered.reduce((sum, item) => sum + item.bonus, 0);
  const netFor = (item: Salary) => item.gross + item.bonus - item.deductions;
  const keyToLabel = (key: string) => { const [year, month] = key.split("-").map(Number); const names = calendarPreference === "BS" ? BS_MONTH_NAMES : AD_MONTH_NAMES; return year && month ? `${names[month - 1]} ${year}` : key; };
  const periodLabel = monthFrom && monthTo ? `${keyToLabel(monthFrom)} – ${keyToLabel(monthTo)}` : "All time";
  function exportSalaries() {
    exportRowsToCsv(`salaries-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((item) => ({ Employee: item.employee, Role: item.role, Month: item.month, Gross: item.gross, Deductions: item.deductions, Bonus: item.bonus, "Net salary": netFor(item), Status: item.status })));
  }

  async function addSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await createSalary(form);
      setAddOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not save salary. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function updateSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await updateSalaryAction(selected.id, form);
      setDialogMode(null);
      setSelected(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not update salary. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeSalary(id: string) {
    setMenuId(null);
    setRecords((items) => items.filter((record) => record.id !== id));
    try {
      await deleteSalary(id);
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

  const fields = (item?: Salary) => <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Employee<input required name="employee" defaultValue={item?.employee} placeholder="Employee name" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-teal-400" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Role<input required name="role" defaultValue={item?.role} placeholder="Job title" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-teal-400" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Payroll month<MonthPicker preference={calendarPreference} name="month" defaultValue={item?.month} accent="teal" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Status<StatusSelect name="status" options={["Paid", "Processing", "Pending"] as const} defaultValue={item?.status ?? "Pending"} accent="teal" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Gross salary<AmountInput required name="gross" defaultValue={item?.gross} placeholder="0.00" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-teal-400" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Deductions<AmountInput required name="deductions" defaultValue={item?.deductions ?? 0} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-teal-400" /></label><label className="space-y-1.5 text-[10px] font-semibold text-slate-600">Bonus<AmountInput required name="bonus" defaultValue={item?.bonus ?? 0} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-teal-400" /></label></div>;

  return <div className="salaries-page space-y-5">
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-600 p-6 text-white shadow-xl shadow-emerald-200/70"><div className="absolute -right-14 -top-20 size-56 rounded-full border-[32px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><Banknote size={18} /></span><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-100">Payroll center</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Salaries</h1><p className="mt-1 max-w-xl text-xs text-teal-50">Manage monthly payroll, deductions, bonuses, and employee payment status.</p></div><div className="flex gap-2"><button onClick={exportSalaries} className="flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-[10px] font-semibold"><Download size={14} />Export payroll</button><button onClick={() => setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-teal-700 shadow-lg"><Plus size={14} />Add salary</button></div></div></header>
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-teal-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600"><WalletCards size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Gross payroll</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(grossPayroll)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{periodLabel}</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-rose-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"><ShieldCheck size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Total deductions</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(deductions)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Tax and employee deductions</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500"><UserCheck size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Bonuses</p></div><p className="mt-3 truncate text-lg font-semibold text-slate-900 sm:text-xl">{currency.format(bonuses)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Performance incentives</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-500"><UsersRound size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Net payroll</p></div><p className="mt-3 truncate text-lg font-semibold text-emerald-700 sm:text-xl">{currency.format(grossPayroll + bonuses - deductions)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Final employee payments</p></article>
    </section>
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.025)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Salary transactions</h2><p className="mt-0.5 text-[9px] text-slate-400">Review and manage employee payroll records</p></div><div className="flex flex-wrap gap-2"><label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400"><Search size={13} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search employees..." className="w-full bg-transparent text-[9px] outline-none" /></label><select value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[9px] text-slate-600"><option>All</option><option>Paid</option><option>Processing</option><option>Pending</option></select><div className="w-[132px]"><MonthPicker preference={calendarPreference} value={monthFrom} onChange={(result) => { setMonthFrom(result.key); setPage(1); }} placeholder="From" accent="teal" allowClear /></div><div className="w-[132px]"><MonthPicker preference={calendarPreference} value={monthTo} onChange={(result) => { setMonthTo(result.key); setPage(1); }} placeholder="To" accent="teal" allowClear /></div>{(monthFrom || monthTo) && <button onClick={() => { setMonthFrom(""); setMonthTo(""); setPage(1); }} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[9px] font-medium text-slate-500 hover:bg-slate-50">Clear<X size={11} /></button>}<button className="grid size-9 place-items-center rounded-lg border border-slate-200"><Filter size={13} /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/60 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Employee</th><th className="px-4 py-3">Month</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Bonus</th><th className="px-4 py-3">Net salary</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody>{paged.map((item) => <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-teal-50/30"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-full text-[9px] font-semibold ${item.tone}`}>{item.initials}</span><div><p className="text-[10px] font-semibold text-slate-800">{item.employee}</p><p className="mt-0.5 text-[8px] text-slate-400">{item.role} · {item.displayId}</p></div></div></td><td className="px-4 py-3.5 text-[9px] text-slate-500">{item.month}</td><td className="px-4 py-3.5 text-[9px] font-semibold text-slate-700">{currency.format(item.gross)}</td><td className="px-4 py-3.5 text-[9px] text-rose-500">−{currency.format(item.deductions)}</td><td className="px-4 py-3.5 text-[9px] text-emerald-600">+{currency.format(item.bonus)}</td><td className="px-4 py-3.5 text-[10px] font-semibold text-teal-700">{currency.format(netFor(item))}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span></td><td className="relative px-4 py-3.5"><button onClick={(event) => toggleMenu(item.id, event)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={15} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No salary records match these filters.</div>}</div><footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3"><p className="text-[9px] text-slate-400">Showing {paged.length === 0 ? 0 : pageStart + 1}-{pageStart + paged.length} of {filtered.length} salary records</p><div className="flex items-center gap-3"><div className="flex gap-1"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-500 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button className="rounded-md bg-teal-700 px-2.5 py-1.5 text-[9px] text-white">{currentPage}</button><button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage >= totalPages} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-500 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div><button className="text-[9px] font-semibold text-teal-700">Process pending payroll</button></div></footer></section>
    {menuId && menuPos && (() => { const item = filtered.find((record) => record.id === menuId); if (!item) return null; return <>
      <button aria-label="Close menu" onClick={() => setMenuId(null)} className="fixed inset-0 z-[75] cursor-default" />
      <div style={{ top: menuPos.top, left: menuPos.left }} className="fixed z-[76] w-32 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button onClick={() => { setSelected(item); setDialogMode("view"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Eye size={13} />View</button>
        <button onClick={() => { setSelected(item); setDialogMode("edit"); setMenuId(null); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit</button>
        <button onClick={() => removeSalary(item.id)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button>
      </div>
    </>; })()}
    {dialogMode === "view" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex justify-end"><button onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div><div className="-mt-3 text-center"><span className={`mx-auto grid size-14 place-items-center rounded-full text-sm font-semibold ${selected.tone}`}>{selected.initials}</span><h2 className="mt-3 text-lg font-semibold text-slate-900">{selected.employee}</h2><p className="mt-1 text-[9px] text-slate-400">{selected.role} · {selected.month}</p></div><div className="mt-5 rounded-2xl bg-teal-50 p-4 text-center"><p className="text-[8px] text-teal-500">Net salary</p><p className="mt-1 text-2xl font-semibold text-teal-800">{currency.format(netFor(selected))}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[selected.status]}`}>{selected.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Gross</p><p className="mt-1 text-[10px] font-semibold">{currency.format(selected.gross)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Deductions</p><p className="mt-1 text-[10px] font-semibold text-rose-600">{currency.format(selected.deductions)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Bonus</p><p className="mt-1 text-[10px] font-semibold text-emerald-600">{currency.format(selected.bonus)}</p></div></div><button onClick={() => setDialogMode("edit")} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 text-[10px] font-semibold text-white"><Pencil size={13} />Edit salary</button></div></div>}
    {dialogMode === "edit" && selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form onSubmit={updateSalary} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">{selected.displayId}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Edit salary</h2></div><button type="button" onClick={() => setDialogMode(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}{fields(selected)}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDialogMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-teal-700 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button></div></form></div>}
    {addOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><form onSubmit={addSalary} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">Payroll record</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Add salary</h2><p className="mt-1 text-[10px] text-slate-400">Create a monthly employee payroll entry.</p></div><button type="button" onClick={() => setAddOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}{fields()}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-xl bg-teal-700 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Save salary"}</button></div></form></div>}
  </div>;
}
