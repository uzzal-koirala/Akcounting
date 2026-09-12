import { listIncome } from "@/actions/income";
import { listExpenses } from "@/actions/expenses";
import { listInvoices } from "@/actions/invoices";
import { listLoans } from "@/actions/loans";
import { listDues } from "@/actions/dues";
import { getCalendarPreference } from "@/actions/preferences";
import { getSession } from "@/lib/auth/session";
import { formatDisplayDate } from "@/lib/calendar";
import { DashboardOverview } from "@/components/dashboard-overview";

const currency = { format: (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(amount)}/-` };

function inMonth(dateISO: string, year: number, month: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.getFullYear() === year && d.getMonth() === month;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

function relativeAge(dateISO: string, now: Date) {
  const then = new Date(`${dateISO}T00:00:00`);
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(then.toDateString()).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? "s" : ""}`;
}

export default async function DashboardPage() {
  const [session, income, expenses, invoices, loans, dues, calendarPreference] = await Promise.all([getSession(), listIncome(), listExpenses(), listInvoices(), listLoans(), listDues(), getCalendarPreference()]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastMonthDate = new Date(year, month - 1, 1);

  const incomeThisMonth = income.filter((item) => item.status === "Received" && inMonth(item.dateISO, year, month)).reduce((sum, item) => sum + item.amount, 0);
  const incomeLastMonth = income.filter((item) => item.status === "Received" && inMonth(item.dateISO, lastMonthDate.getFullYear(), lastMonthDate.getMonth())).reduce((sum, item) => sum + item.amount, 0);
  const expensesThisMonth = expenses.filter((item) => item.status === "Paid" && inMonth(item.dateISO, year, month)).reduce((sum, item) => sum + item.amount, 0);
  const expensesLastMonth = expenses.filter((item) => item.status === "Paid" && inMonth(item.dateISO, lastMonthDate.getFullYear(), lastMonthDate.getMonth())).reduce((sum, item) => sum + item.amount, 0);
  const netProfitThisMonth = incomeThisMonth - expensesThisMonth;
  const netProfitLastMonth = incomeLastMonth - expensesLastMonth;

  const outstandingInvoices = invoices.filter((invoice) => invoice.status !== "Paid").sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO));

  const unsettledDues = dues.filter((due) => due.remaining > 0);
  const dueTotal = unsettledDues.reduce((sum, due) => sum + due.remaining, 0);
  const customersWithDues = new Set(unsettledDues.map((due) => due.contactId)).size;

  const incomeChange = pctChange(incomeThisMonth, incomeLastMonth);
  const expenseChange = pctChange(expensesThisMonth, expensesLastMonth);
  const profitChange = pctChange(netProfitThisMonth, netProfitLastMonth);

  const stats = [
    { title: "Total income", value: currency.format(incomeThisMonth), note: incomeChange === null ? "This month" : `${incomeChange >= 0 ? "+" : ""}${incomeChange.toFixed(1)}% this month`, iconKey: "income" as const, trend: incomeChange === null ? "flat" as const : incomeChange >= 0 ? "up" as const : "down" as const },
    { title: "Total expenses", value: currency.format(expensesThisMonth), note: expenseChange === null ? "This month" : `${expenseChange >= 0 ? "+" : ""}${expenseChange.toFixed(1)}% this month`, iconKey: "expense" as const, trend: expenseChange === null ? "flat" as const : expenseChange >= 0 ? "up" as const : "down" as const },
    { title: "Net profit", value: currency.format(netProfitThisMonth), note: profitChange === null ? "This month" : `${profitChange >= 0 ? "+" : ""}${profitChange.toFixed(1)}% this month`, iconKey: "profit" as const, trend: profitChange === null ? "flat" as const : profitChange >= 0 ? "up" as const : "down" as const },
    { title: "Due amounts", value: currency.format(dueTotal), note: `${customersWithDues} customer${customersWithDues === 1 ? "" : "s"} owe you`, iconKey: "due" as const, trend: "flat" as const },
  ];

  type Activity = { account: string; amount: string; status: string; statusClass: string; date: string; age: string; dateISO: string };
  const incomeActivity: Activity[] = income.map((item) => ({ account: item.client, amount: `+${currency.format(item.amount)}`, status: item.status, statusClass: item.status === "Received" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600", date: item.date, age: relativeAge(item.dateISO, now), dateISO: item.dateISO }));
  const expenseActivity: Activity[] = expenses.map((item) => ({ account: item.vendor, amount: `-${currency.format(item.amount)}`, status: item.status, statusClass: item.status === "Paid" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-500", date: item.date, age: relativeAge(item.dateISO, now), dateISO: item.dateISO }));
  const recentActivity = [...incomeActivity, ...expenseActivity].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 6);

  const incomeExpenseTotal = incomeThisMonth + expensesThisMonth;
  const distribution = incomeExpenseTotal > 0 ? [
    { name: "Income", value: Math.round((incomeThisMonth / incomeExpenseTotal) * 100), color: "#10b981" },
    { name: "Expenses", value: Math.round((expensesThisMonth / incomeExpenseTotal) * 100), color: "#e11d48" },
  ] : [];

  const outstandingForDisplay = outstandingInvoices.slice(0, 5).map((invoice) => ({ client: invoice.clientName, number: invoice.number, issue: invoice.issueDate, due: invoice.dueDate, amount: currency.format(invoice.amount), status: invoice.status }));

  const activeLoans = loans.filter((loan) => loan.status !== "Closed");
  const loanSummary = {
    balance: currency.format(activeLoans.reduce((sum, loan) => sum + loan.balance, 0)),
    monthlyEmi: currency.format(activeLoans.reduce((sum, loan) => sum + loan.emi, 0)),
    activeCount: activeLoans.length,
    nextDate: activeLoans.length > 0 ? activeLoans.reduce((soonest, loan) => (new Date(loan.nextDate) < new Date(soonest) ? loan.nextDate : soonest), activeLoans[0].nextDate) : null,
  };

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (session?.name ?? "there").split(" ")[0];
  const todayLabel = formatDisplayDate(now, calendarPreference);

  return <DashboardOverview stats={stats} recentActivity={recentActivity} distribution={distribution} outstandingInvoices={outstandingForDisplay} greeting={`${greeting}, ${firstName}`} todayLabel={todayLabel} loanSummary={loanSummary} />;
}
