"use client";

import { AlertTriangle, ArrowRight, Building2, CalendarClock, CheckCircle2, Download, Landmark, MoreHorizontal, PiggyBank, Plus, ReceiptText, Sparkles, Trash2, TrendingDown, UploadCloud, Wallet, X } from "lucide-react";
import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createLoan, deleteLoan, payLoanEmi, type LoanRecord, type LoanPaymentRecord } from "@/actions/loans";
import { NepaliDatePicker } from "@/components/nepali-date-picker";
import { AmountInput } from "@/components/amount-input";
import { exportRowsToCsv } from "@/lib/csv-export";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { BS_MONTH_NAMES, type CalendarPreference } from "@/lib/calendar";
import NepaliDate from "nepali-date-converter";

const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(amount)}/-` };
const CARD_COLORS = [
  { ring: "#818cf8", grad: "from-indigo-600 to-violet-600", soft: "bg-indigo-50 text-indigo-600" },
  { ring: "#22d3ee", grad: "from-cyan-600 to-teal-500", soft: "bg-cyan-50 text-cyan-600" },
  { ring: "#94a3b8", grad: "from-slate-700 to-slate-900", soft: "bg-slate-100 text-slate-600" },
  { ring: "#e879f9", grad: "from-fuchsia-600 to-violet-600", soft: "bg-fuchsia-50 text-fuchsia-600" },
  { ring: "#34d399", grad: "from-emerald-600 to-teal-600", soft: "bg-emerald-50 text-emerald-600" },
];

function ProgressRing({ percent, color }: { percent: number; color: string }) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <div className="relative grid size-13 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className="absolute text-[11px] font-semibold text-white">{percent}%</span>
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function LoansPage({ initialLoans, initialPayments, calendarPreference }: { initialLoans: LoanRecord[]; initialPayments: LoanPaymentRecord[]; calendarPreference: CalendarPreference }) {
  const router = useRouter();
  const [loans, setLoans] = useState(initialLoans);
  const [syncedLoans, setSyncedLoans] = useState(initialLoans);
  if (initialLoans !== syncedLoans) { setSyncedLoans(initialLoans); setLoans(initialLoans); }

  const [addOpen, setAddOpen] = useState(false);
  const [payLoanId, setPayLoanId] = useState<string | null>(null);
  const [payPending, setPayPending] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calcPrincipal, setCalcPrincipal] = useState(30000);
  const [calcRate, setCalcRate] = useState(8.5);
  const [calcMonths, setCalcMonths] = useState(36);

  const [addLoanAmount, setAddLoanAmount] = useState("");
  const [addDownPaymentPct, setAddDownPaymentPct] = useState("0");
  const [addRate, setAddRate] = useState("");
  const [addMonths, setAddMonths] = useState("");
  const [manualEmi, setManualEmi] = useState("");
  const [emiAuto, setEmiAuto] = useState(true);

  const financedPrincipal = useMemo(() => {
    const amount = Number(addLoanAmount) || 0;
    const pct = Math.min(100, Math.max(0, Number(addDownPaymentPct) || 0));
    return Math.max(0, amount - amount * (pct / 100));
  }, [addLoanAmount, addDownPaymentPct]);

  const computedEmi = useMemo(() => {
    const rate = Number(addRate) || 0;
    const months = Number(addMonths) || 0;
    if (financedPrincipal <= 0 || months <= 0) return null;
    const monthlyRate = rate / 1200;
    const emi = monthlyRate ? financedPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1) : financedPrincipal / months;
    return Math.round(emi * 100) / 100;
  }, [financedPrincipal, addRate, addMonths]);

  const addEmi = emiAuto && computedEmi !== null ? String(computedEmi) : manualEmi;

  const addLoanTotals = useMemo(() => {
    const months = Number(addMonths) || 0;
    const emi = Number(addEmi) || 0;
    if (months <= 0 || emi <= 0) return null;
    const totalPayable = emi * months;
    const totalInterest = Math.max(0, totalPayable - financedPrincipal);
    return { totalPayable, totalInterest };
  }, [addMonths, addEmi, financedPrincipal]);

  function resetAddForm() {
    setAddLoanAmount("");
    setAddDownPaymentPct("0");
    setAddRate("");
    setAddMonths("");
    setManualEmi("");
    setEmiAuto(true);
  }

  const activeLoans = loans.filter((loan) => loan.status !== "Paid off");
  const totalBorrowed = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const outstanding = loans.reduce((sum, loan) => sum + loan.balance, 0);
  const monthlyEmi = activeLoans.reduce((sum, loan) => sum + loan.emi, 0);
  const now = new Date();
  const overdueCount = activeLoans.filter((loan) => new Date(loan.nextDateISO) < now).length;
  const payoffProgress = totalBorrowed ? Math.round(((totalBorrowed - outstanding) / totalBorrowed) * 100) : 0;

  const calculator = useMemo(() => {
    const monthlyRate = calcRate / 1200;
    const emi = monthlyRate ? calcPrincipal * monthlyRate * Math.pow(1 + monthlyRate, calcMonths) / (Math.pow(1 + monthlyRate, calcMonths) - 1) : calcPrincipal / calcMonths;
    const totalPayable = emi * calcMonths;
    const interest = totalPayable - calcPrincipal;
    return { emi, interest, totalPayable, interestShare: totalPayable ? Math.round((interest / totalPayable) * 100) : 0 };
  }, [calcPrincipal, calcRate, calcMonths]);

  function addLoan(formData: FormData) {
    setPending(true);
    setError(null);
    startTransition(async () => {
      try {
        await createLoan(formData);
        setAddOpen(false);
        resetAddForm();
        router.refresh();
      } catch {
        setError("Could not add loan. Please try again.");
      } finally {
        setPending(false);
      }
    });
  }

  async function removeLoan(id: string) {
    setMenuId(null);
    setLoans((items) => items.filter((item) => item.id !== id));
    try {
      await deleteLoan(id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  function openPayModal(id: string) {
    setPayError(null);
    setPayLoanId(id);
  }

  function submitPayEmi(formData: FormData) {
    if (!payLoanId) return;
    setPayPending(true);
    setPayError(null);
    startTransition(async () => {
      try {
        await payLoanEmi(payLoanId, formData);
        setPayLoanId(null);
        router.refresh();
      } catch {
        setPayError("Could not record this payment. Please try again.");
      } finally {
        setPayPending(false);
      }
    });
  }

  function exportLoans() {
    exportRowsToCsv(`loans-${new Date().toISOString().slice(0, 10)}.csv`, loans.map((loan) => ({ Loan: loan.name, Lender: loan.lender, Principal: loan.principal, Balance: loan.balance, "Interest rate": loan.rate, "Monthly EMI": loan.emi, "Paid installments": loan.paid, Tenure: loan.total, "Start date": loan.startDate, "Next payment": loan.nextDate, Status: loan.status })));
  }

  return <div className="loans-page space-y-5">
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-800 via-indigo-700 to-violet-600 p-6 text-white shadow-xl shadow-indigo-200/70"><div className="absolute -right-14 -top-20 size-56 rounded-full border-[32px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><Sparkles size={18} /></span><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">Debt management</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Loan & EMI</h1><p className="mt-1 max-w-xl text-xs text-indigo-50">See every obligation, plan upcoming installments, and understand the true cost of borrowing.</p></div><div className="flex gap-2"><button onClick={exportLoans} className="flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-[10px] font-semibold"><Download size={14} />Export loans</button><button onClick={() => { setError(null); resetAddForm(); setAddOpen(true); }} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-indigo-700 shadow-lg"><Plus size={14} />Add new loan</button></div></div></header>

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-indigo-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Wallet size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Total borrowed</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{currency.format(totalBorrowed)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Across {loans.length} loan{loans.length === 1 ? "" : "s"}</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-cyan-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-600"><TrendingDown size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Outstanding balance</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{currency.format(outstanding)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Still to be repaid</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><CalendarClock size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Monthly EMI commitment</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{currency.format(monthlyEmi)}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{activeLoans.length} active loan{activeLoans.length === 1 ? "" : "s"}</p></article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><PiggyBank size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">Paid off</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-emerald-700 sm:text-xl">{payoffProgress}%</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">Of total principal borrowed</p></article>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-semibold text-slate-900">Active loans</h2><p className="mt-0.5 text-[11px] text-slate-400">Repayment progress across all lenders</p></div>{overdueCount > 0 && <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600"><AlertTriangle size={11} />{overdueCount} overdue</span>}</div>
      {loans.length === 0 ? <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-indigo-50 text-indigo-500"><Landmark size={20} /></span><p className="mt-3 text-[12px] font-semibold text-slate-600">No loans yet</p><p className="mt-1 text-[10px] text-slate-400">Add a loan to start tracking repayments.</p><button onClick={() => { resetAddForm(); setAddOpen(true); }} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[11px] font-semibold text-white hover:bg-indigo-700"><Plus size={12} />Add your first loan</button></div></div> : <div className="grid gap-4 lg:grid-cols-3">{loans.map((loan, index) => {
        const progress = loan.total ? Math.round(loan.paid / loan.total * 100) : 0;
        const palette = CARD_COLORS[index % CARD_COLORS.length];
        const paidOff = loan.status === "Paid off";
        const overdue = !paidOff && new Date(loan.nextDateISO) < now;
        return <article key={loan.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-xl">
          <div className={`relative overflow-hidden bg-gradient-to-r ${palette.grad} p-4 text-white`}>
            <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-start justify-between"><div><p className="text-[10px] font-medium uppercase tracking-wider text-white/60">{loan.id.slice(0, 8).toUpperCase()}</p><h3 className="mt-1 text-base font-semibold">{loan.name}</h3><p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/70"><Building2 size={10} />{loan.lender}</p></div><button onClick={() => setMenuId((id) => id === loan.id ? null : loan.id)} className="rounded-lg p-1 text-white/60 hover:bg-white/10"><MoreHorizontal size={16} /></button></div>
            <div className="relative mt-5 flex items-end justify-between"><div><p className="text-[10px] text-white/60">Outstanding</p><p className="mt-1 text-2xl font-semibold">{currency.format(loan.balance)}</p></div><ProgressRing percent={progress} color={palette.ring} /></div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2"><div><p className="text-[10px] text-slate-400">Interest</p><p className="mt-1 text-[12px] font-semibold text-slate-700">{loan.rate}%</p></div><div><p className="text-[10px] text-slate-400">Monthly EMI</p><p className="mt-1 text-[12px] font-semibold text-slate-700">{currency.format(loan.emi)}</p></div><div><p className="text-[10px] text-slate-400">Tenure</p><p className="mt-1 text-[12px] font-semibold text-slate-700">{loan.paid}/{loan.total} mo</p></div></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${palette.grad}`} style={{ width: `${progress}%` }} /></div>
            <div className={`mt-4 flex items-center justify-between rounded-xl p-3 ${paidOff ? "bg-emerald-50" : overdue ? "bg-rose-50" : "bg-slate-50"}`}>
              {paidOff ? <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /><p className="text-[11px] font-semibold text-emerald-600">Paid off</p></div> : <div className="flex items-center gap-2">{overdue ? <AlertTriangle size={14} className="text-rose-500" /> : <CalendarClock size={14} className="text-indigo-500" />}<div><p className={`text-[10px] ${overdue ? "text-rose-400" : "text-slate-400"}`}>{overdue ? "Overdue since" : "Next payment"}</p><p className={`text-[11px] font-semibold ${overdue ? "text-rose-600" : "text-slate-700"}`}>{loan.nextDate}</p></div></div>}
              {!paidOff && <button onClick={() => openPayModal(loan.id)} className={`h-8 rounded-lg px-3 text-[10px] font-semibold text-white transition ${overdue ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>Pay EMI</button>}
            </div>
          </div>
          {menuId === loan.id && <div className="absolute right-3 top-12 z-20 w-32 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button onClick={() => removeLoan(loan.id)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[11px] text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button></div>}
        </article>;
      })}</div>}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-900">Upcoming EMI schedule</h2><p className="mt-0.5 text-[11px] text-slate-400">Loans awaiting their next installment</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">{activeLoans.length} active</span></div>
        <div className="mt-5 space-y-1">{activeLoans.length === 0 ? <p className="py-6 text-center text-[11px] text-slate-400">No active loans right now.</p> : activeLoans.map((loan, index) => { const overdue = new Date(loan.nextDateISO) < now; return <div key={loan.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50"><div className={`grid size-10 place-items-center rounded-xl ${overdue ? "bg-rose-50 text-rose-600" : index === 0 ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}><ReceiptText size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-slate-800">{loan.name}</p><p className={`mt-0.5 text-[10px] ${overdue ? "text-rose-400 font-medium" : "text-slate-400"}`}>{loan.lender} · {overdue ? "Overdue " : "Due "}{loan.nextDate}</p></div><p className="text-[13px] font-semibold text-slate-800">{currency.format(loan.emi)}</p><button onClick={() => openPayModal(loan.id)} className={`ml-2 h-8 rounded-lg px-3 text-[10px] font-semibold ${overdue ? "bg-rose-600 text-white" : index === 0 ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-500"}`}>Pay now</button></div>; })}</div>
      </article>
      <article className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white p-5">
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white"><Sparkles size={14} /></span><div><h2 className="text-base font-semibold text-slate-900">EMI calculator</h2><p className="text-[10px] text-slate-400">Explore a repayment scenario</p></div></div>
        <div className="mt-5 grid gap-4">
          <label className="text-[11px] font-semibold text-slate-600">Loan amount<span className="float-right font-normal text-slate-400">{currency.format(calcPrincipal)}</span><input value={calcPrincipal} onChange={(event) => setCalcPrincipal(Number(event.target.value))} type="range" min={5000} max={2000000} step={5000} className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-indigo-100 accent-indigo-600" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-[11px] font-semibold text-slate-600">Interest rate<span className="float-right font-normal text-slate-400">{calcRate}%</span><input value={calcRate} onChange={(event) => setCalcRate(Number(event.target.value))} type="range" min={1} max={24} step={0.1} className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-indigo-100 accent-indigo-600" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Months<span className="float-right font-normal text-slate-400">{calcMonths}</span><input value={calcMonths} onChange={(event) => setCalcMonths(Number(event.target.value))} type="range" min={3} max={120} step={1} className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-indigo-100 accent-indigo-600" /></label>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-[#151936] p-4 text-white">
          <p className="text-[10px] text-slate-400">Estimated monthly EMI</p>
          <p className="mt-1 text-3xl font-semibold">{currency.format(calculator.emi)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400" style={{ width: `${calculator.interestShare}%` }} /></div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400"><span>Principal {100 - calculator.interestShare}%</span><span>Interest {calculator.interestShare}%</span></div>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3"><span className="text-[10px] text-slate-400">Total interest</span><span className="text-[11px] font-semibold text-cyan-300">{currency.format(calculator.interest)}</span></div>
        </div>
      </article>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><ReceiptText size={15} /></span><div><h2 className="text-[13px] font-semibold text-slate-900">EMI paid history</h2><p className="text-[10px] text-slate-400">Every EMI payment logged across all loans</p></div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">{initialPayments.length} payment{initialPayments.length === 1 ? "" : "s"}</span></div>
      {initialPayments.length === 0 ? <div className="p-10 text-center text-[11px] text-slate-400">No EMI payments recorded yet. They&apos;ll show up here as you pay them.</div> : <div className="max-h-[360px] overflow-auto"><table className="w-full min-w-[620px] text-left"><thead className="sticky top-0 z-10"><tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Loan</th><th className="px-3 py-3">Lender</th><th className="px-3 py-3">Date paid</th><th className="px-3 py-3">Proof</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{initialPayments.map((payment) => <tr key={payment.id} className="border-b border-slate-50 last:border-0 hover:bg-emerald-50/30"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></span><div><p className="text-[12px] font-semibold text-slate-800">{payment.loanName}</p><p className="mt-0.5 text-[9px] text-slate-400">{payment.displayId}</p></div></div></td><td className="px-3 py-3 text-[11px] text-slate-500">{payment.lender}</td><td className="px-3 py-3 text-[11px] text-slate-500">{payment.date}</td><td className="px-3 py-3 text-[11px]">{payment.proofUrl ? <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="font-medium text-emerald-600 hover:underline">View</a> : <span className="text-slate-300">—</span>}</td><td className="px-4 py-3 text-right text-[13px] font-semibold text-emerald-600">{currency.format(payment.amount)}</td></tr>)}</tbody></table></div>}
    </section>

    {addOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><form action={addLoan} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[12px] font-semibold uppercase tracking-wider text-indigo-600">New obligation</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">Add a loan</h2><p className="mt-1 text-[12px] text-slate-400">Enter the loan and repayment terms.</p></div><button type="button" onClick={() => setAddOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">{error}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Loan name<input required name="name" placeholder="e.g. Equipment finance" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Lender / Bank<input required name="lender" placeholder="Bank or lender" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Loan Amount<AmountInput required name="loanAmount" placeholder="50,000" value={addLoanAmount} onValueChange={(raw) => { setAddLoanAmount(raw); setEmiAuto(true); }} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Down Payment (%)<div className="relative"><input name="downPaymentPercent" type="number" min="0" max="100" step="0.01" placeholder="0" value={addDownPaymentPct} onChange={(event) => { setAddDownPaymentPct(event.target.value); setEmiAuto(true); }} className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-7 text-[12px] outline-none focus:border-indigo-400" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">%</span></div></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Interest Rate (%)<input required name="rate" type="number" step="0.01" placeholder="8.5" value={addRate} onChange={(event) => { setAddRate(event.target.value); setEmiAuto(true); }} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Tenure (Months)<input required name="months" type="number" step="1" placeholder="36" value={addMonths} onChange={(event) => { setAddMonths(event.target.value); setEmiAuto(true); }} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">EMI Start Date{calendarPreference === "BS" ? <NepaliDatePicker name="startDate" defaultValue={todayISO()} accent="violet" /> : <input required name="startDate" type="date" defaultValue={todayISO()} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" />}</label>
          <label className="space-y-1.5 text-[12px] font-semibold text-slate-600">Monthly EMI<AmountInput required name="emi" placeholder="1,565" value={addEmi} onValueChange={(raw) => { setManualEmi(raw); setEmiAuto(false); }} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" />{computedEmi !== null && <p className="mt-1 text-[10px] text-slate-400">{emiAuto ? "Auto-calculated with interest" : "Auto-calculated — edited manually"}</p>}</label>
          {addLoanTotals && <div className="sm:col-span-2"><div className="grid grid-cols-2 gap-3 rounded-xl bg-indigo-50/60 p-3.5"><div><p className="text-[10px] text-indigo-400">Total interest</p><p className="mt-0.5 text-[13px] font-semibold text-indigo-700">{currency.format(addLoanTotals.totalInterest)}</p></div><div><p className="text-[10px] text-indigo-400">Total amount payable</p><p className="mt-0.5 text-[13px] font-semibold text-indigo-700">{currency.format(addLoanTotals.totalPayable)}</p></div></div></div>}
        </div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold">Cancel</button><button type="submit" disabled={pending} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[12px] font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : <>Add loan<ArrowRight size={13} /></>}</button></div></form></div>}

    {payLoanId && (() => {
      const loan = loans.find((item) => item.id === payLoanId);
      if (!loan) return null;
      const today = new Date();
      const dueDate = new Date(`${loan.nextDateISO}T00:00:00`);
      const isAheadOfSchedule = dueDate.getFullYear() > today.getFullYear() || (dueDate.getFullYear() === today.getFullYear() && dueDate.getMonth() > today.getMonth());
      const dueMonthName = calendarPreference === "BS" ? (() => { try { return BS_MONTH_NAMES[NepaliDate.fromAD(dueDate).getMonth()]; } catch { return dueDate.toLocaleString("en-US", { month: "long" }); } })() : dueDate.toLocaleString("en-US", { month: "long" });
      return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><form action={submitPayEmi} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-[12px] font-semibold uppercase tracking-wider text-indigo-600">Confirm payment</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Pay EMI</h2><p className="mt-1 text-[12px] text-slate-400">{loan.name} · {loan.lender}</p></div><button type="button" onClick={() => setPayLoanId(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={15} /></button></div>
      {isAheadOfSchedule && <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" /><p className="text-[11px] font-medium leading-4 text-amber-700">You&apos;re paying next month&apos;s ({dueMonthName}) EMI ahead of schedule.</p></div>}
      <div className="mt-4 rounded-xl bg-indigo-50/60 p-3.5"><p className="text-[10px] text-indigo-400">Amount due</p><p className="mt-0.5 text-xl font-semibold text-indigo-700">{currency.format(loan.emi)}</p></div>
      {payError && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">{payError}</p>}
      <div className="mt-5 space-y-4">
        <label className="block space-y-1.5 text-[12px] font-semibold text-slate-600">Payment method<PaymentMethodSelect name="paymentMethod" accent="indigo" /></label>
        <label className="block space-y-1.5 text-[12px] font-semibold text-slate-600">Payment proof (optional)<span className="mt-1.5 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center transition hover:border-indigo-300"><UploadCloud size={19} className="text-slate-400" /><span className="text-[10px] font-medium text-slate-500">Upload a receipt or screenshot</span><span className="text-[9px] text-slate-400">Image, up to 3 MB</span><input type="file" name="proof" accept="image/*" className="sr-only" /></span></label>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPayLoanId(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold">Cancel</button><button type="submit" disabled={payPending} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[12px] font-semibold text-white disabled:opacity-60">{payPending ? "Recording..." : "Confirm payment"}</button></div>
    </form></div>; })()}
  </div>;
}
