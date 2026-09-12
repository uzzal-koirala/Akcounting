"use client";

import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, CircleDollarSign, Clock3, Download, FileBarChart2, Filter, Landmark, Printer, RotateCcw, Search, TrendingUp } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { IncomeRecord } from "@/actions/income";
import type { ExpenseRecord } from "@/actions/expenses";
import type { SalaryRecord } from "@/actions/salaries";
import type { LoanPaymentRecord } from "@/actions/loans";
import { NepaliDatePicker } from "@/components/nepali-date-picker";
import { exportRowsToCsv } from "@/lib/csv-export";
import { getDefaultDateRange, type CalendarPreference } from "@/lib/calendar";

type TransactionType = "Income" | "Expense" | "Salary" | "EMI";
type Transaction = { id: string; name: string; category: string; date: string; dateISO: string; type: TransactionType; amount: number; status: string };
const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(amount)}/-` };
const TYPE_META: Record<TransactionType, { icon: typeof ArrowDownLeft; tone: string; sign: "+" | "−"; amountColor: string }> = {
  Income: { icon: ArrowDownLeft, tone: "bg-emerald-50 text-emerald-600", sign: "+", amountColor: "text-emerald-600" },
  Expense: { icon: ArrowUpRight, tone: "bg-rose-50 text-rose-500", sign: "−", amountColor: "text-rose-600" },
  Salary: { icon: Banknote, tone: "bg-blue-50 text-blue-600", sign: "−", amountColor: "text-rose-600" },
  EMI: { icon: Landmark, tone: "bg-violet-50 text-violet-600", sign: "−", amountColor: "text-rose-600" },
};

function oneMonthLaterISO(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const next = new Date(year, month, day);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export function ReportsPage({ initialIncome, initialExpenses, initialSalaries, initialLoanPayments, calendarPreference, businessCycleStartDay }: { initialIncome: IncomeRecord[]; initialExpenses: ExpenseRecord[]; initialSalaries: SalaryRecord[]; initialLoanPayments: LoanPaymentRecord[]; calendarPreference: CalendarPreference; businessCycleStartDay: number }) {
  const defaultDateRange = useMemo(() => getDefaultDateRange(calendarPreference, businessCycleStartDay), [calendarPreference, businessCycleStartDay]);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"All" | TransactionType>("All");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("right");
  const [resetToken, setResetToken] = useState(0);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  function toggleTypeMenu() {
    if (!typeMenuOpen && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      const panelWidth = 336;
      setMenuAlign(rect.right - panelWidth < 8 ? "left" : "right");
    }
    setTypeMenuOpen((value) => !value);
  }

  const allTransactions: Transaction[] = useMemo(() => [
    ...initialIncome.map((item): Transaction => ({ id: item.displayId, name: item.client, category: item.source, date: item.date, dateISO: item.dateISO, type: "Income", amount: item.amount, status: item.status })),
    ...initialExpenses.map((item): Transaction => ({ id: item.displayId, name: item.vendor, category: item.category, date: item.date, dateISO: item.dateISO, type: "Expense", amount: item.amount, status: item.status })),
    ...initialSalaries.map((item): Transaction => ({ id: item.displayId, name: item.employee, category: item.role, date: item.date, dateISO: item.dateISO, type: "Salary", amount: item.gross - item.deductions + item.bonus, status: item.status })),
    ...initialLoanPayments.map((item): Transaction => ({ id: item.displayId, name: item.loanName, category: item.lender, date: item.date, dateISO: item.dateISO, type: "EMI", amount: item.amount, status: "Paid" })),
  ].sort((a, b) => b.dateISO.localeCompare(a.dateISO)), [initialIncome, initialExpenses, initialSalaries, initialLoanPayments]);

  const inRange = useMemo(() => allTransactions.filter((item) => (!dateFrom || item.dateISO >= dateFrom) && (!dateTo || item.dateISO <= dateTo)), [allTransactions, dateFrom, dateTo]);
  const scoped = useMemo(() => inRange.filter((item) => type === "All" || item.type === type), [inRange, type]);

  const totalIncome = scoped.filter((item) => item.type === "Income" && item.status === "Received").reduce((sum, item) => sum + item.amount, 0);
  const pendingIncome = scoped.filter((item) => item.type === "Income" && item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = scoped.filter((item) => item.type === "Expense" && item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);

  const paidSalaries = useMemo(() => initialSalaries.filter((item) => item.status === "Paid"), [initialSalaries]);
  const totalPayroll = paidSalaries.reduce((sum, item) => sum + (item.gross - item.deductions + item.bonus), 0);

  const netProfit = totalIncome - totalExpenses;
  const netProfitAfterPayroll = netProfit - totalPayroll;

  const filtered = scoped.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));

  function handleFromChange(nextFrom: string) {
    setDateFrom(nextFrom);
    setDateTo(oneMonthLaterISO(nextFrom));
  }

  function clearRange() {
    setDateFrom(defaultDateRange.from);
    setDateTo(defaultDateRange.to);
    setType("All");
    setResetToken((value) => value + 1);
  }

  function downloadReport() {
    exportRowsToCsv(`report-${dateFrom}-to-${dateTo}.csv`, scoped.map((item) => ({ Transaction: item.name, Category: item.category, Date: item.date, Type: item.type, Amount: item.amount, Status: item.status })));
  }

  return <div className="space-y-4">
    <header className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.025)]">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><FileBarChart2 size={17} /></span><div><p className="text-[8px] font-medium text-slate-400">Workspace / Reports</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Financial Reports</h1></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button ref={filterButtonRef} onClick={toggleTypeMenu} className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[9px] font-semibold ${type !== "All" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}><Filter size={12} />Filter{type !== "All" && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] text-white">{type}</span>}</button>
            {typeMenuOpen && <>
              <button aria-label="Close filter menu" onClick={() => setTypeMenuOpen(false)} className="fixed inset-0 z-10 cursor-default" />
              <div className={`absolute top-11 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-200/60 ${menuAlign === "right" ? "right-0" : "left-0"}`}>
                <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Custom date range</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <p className="mb-1 text-[8px] font-medium text-slate-400">From</p>
                    {calendarPreference === "BS" ? <NepaliDatePicker key={`from-${resetToken}`} name="reportFrom" defaultValue={dateFrom} accent="violet" onChange={handleFromChange} /> : <label className="flex h-9 w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[9px] font-medium text-slate-600"><CalendarDays size={12} className="shrink-0 text-blue-600" /><input type="date" value={dateFrom} onChange={(event) => handleFromChange(event.target.value)} aria-label="From date" className="w-full min-w-0 bg-transparent text-[9px] text-slate-600 outline-none" /></label>}
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[8px] font-medium text-slate-400">To</p>
                    {calendarPreference === "BS" ? <NepaliDatePicker key={`to-${resetToken}-${dateTo}`} name="reportTo" defaultValue={dateTo} accent="violet" onChange={setDateTo} /> : <label className="flex h-9 w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[9px] font-medium text-slate-600"><CalendarDays size={12} className="shrink-0 text-blue-600" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="To date" className="w-full min-w-0 bg-transparent text-[9px] text-slate-600 outline-none" /></label>}
                  </div>
                </div>
                <p className="mt-3.5 text-[8px] font-semibold uppercase tracking-wider text-slate-400">Transaction type</p>
                <div className="mt-2 grid grid-cols-5 gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {(["All", "Income", "Expense", "Salary", "EMI"] as const).map((item) => <button key={item} onClick={() => setType(item)} className={`rounded-md px-1 py-1.5 text-[9px] font-semibold ${type === item ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{item}</button>)}
                </div>
                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button onClick={clearRange} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><RotateCcw size={11} />Reset</button>
                  <button onClick={() => setTypeMenuOpen(false)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700">Apply</button>
                </div>
              </div>
            </>}
          </div>
          <button onClick={() => window.print()} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><Printer size={14} /></button>
          <button onClick={downloadReport} className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[9px] font-semibold text-white shadow-sm shadow-blue-200"><Download size={13} />Export report</button>
        </div>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      { label: "Total income", value: currency.format(totalIncome), icon: ArrowDownLeft, tone: "bg-blue-50 text-blue-600", dot: "bg-blue-500", note: "Received this period" },
      { label: "Total expenses", value: currency.format(totalExpenses), icon: ArrowUpRight, tone: "bg-rose-50 text-rose-600", dot: "bg-rose-500", note: "Paid this period" },
      { label: "Net profit", value: currency.format(netProfitAfterPayroll), icon: TrendingUp, tone: "bg-violet-50 text-violet-600", dot: "bg-violet-500", note: netProfitAfterPayroll >= 0 ? "Profitable period" : "Loss this period" },
      { label: "Pending income", value: currency.format(pendingIncome), icon: Clock3, tone: "bg-amber-50 text-amber-600", dot: "bg-amber-400", note: "Awaiting payment" },
    ].map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-blue-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">{stat.label}</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{stat.value}</p></div><div className={`grid size-8 shrink-0 place-items-center rounded-full sm:size-9 ${stat.tone}`}><Icon size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${stat.dot}`} /><p className="text-[10px] text-slate-400">{stat.note}</p></div></article>; })}</section>

    <section className="grid gap-4">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2"><div className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><CircleDollarSign size={14} /></div><div><h2 className="text-[13px] font-semibold text-slate-900">Financial activity overview</h2><p className="text-[10px] text-slate-400">Most recent income and expense entries</p></div></div><label className="flex h-9 min-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions..." className="w-full bg-transparent text-[11px] outline-none" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-[12px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Transaction</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{filtered.map((item, index) => { const meta = TYPE_META[item.type]; const Icon = meta.icon; return <tr key={`${item.id}-${index}`} className="border-b border-slate-50 last:border-0 hover:bg-emerald-50/30"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${meta.tone}`}><Icon size={15} /></span><div><p className="text-[14px] font-semibold text-slate-800">{item.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.id} · {item.type}</p></div></div></td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-600">{item.category}</span></td><td className="px-3 py-3 text-[12px] text-slate-500">{item.date}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === "Received" || item.status === "Paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.status}</span></td><td className={`px-4 py-3 text-right text-[14px] font-semibold ${meta.amountColor}`}>{meta.sign}{currency.format(item.amount)}</td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-400">No transactions match these filters.</div>}</div>
        <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><p className="text-[12px] text-slate-400">Showing {filtered.length} of {scoped.length} transactions</p><p className="text-[12px] font-semibold text-slate-600">Period net: <span className={netProfitAfterPayroll >= 0 ? "text-emerald-600" : "text-rose-600"}>{currency.format(netProfitAfterPayroll)}</span></p></footer>
      </article>
    </section>

  </div>;
}
