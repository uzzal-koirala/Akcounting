"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";
import { PAYMENT_METHODS } from "@/lib/payment-methods";

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

async function readEmiProof(formData: FormData): Promise<string | null> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Payment proof must be an image file.");
  if (file.size > MAX_PROOF_BYTES) throw new Error("Payment proof image must be smaller than 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export type LoanPaymentRecord = {
  id: string;
  displayId: string;
  loanName: string;
  lender: string;
  amount: number;
  date: string;
  dateISO: string;
  proofUrl: string | null;
};

function toPaymentDisplayId(id: string) {
  return `EMI-${id.slice(-6).toUpperCase()}`;
}

async function currentCalendarPreference(userId: string): Promise<CalendarPreference> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

export type LoanRecord = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  downPayment: number;
  balance: number;
  rate: number;
  emi: number;
  paid: number;
  total: number;
  startDate: string;
  nextDate: string;
  nextDateISO: string;
  status: string;
};

const loanSchema = z.object({
  name: z.string().trim().min(1, "Give the loan a name."),
  lender: z.string().trim().min(1, "Enter the lender."),
  loanAmount: z.coerce.number().positive(),
  downPaymentPercent: z.coerce.number().min(0).max(100).optional().default(0),
  rate: z.coerce.number().min(0).max(100),
  months: z.coerce.number().int().positive(),
  startDate: z.string().min(1, "Select the EMI start date."),
  emi: z.coerce.number().positive(),
});

function toRecord(row: { id: string; name: string; lender: string; principal: unknown; downPayment: unknown; balance: unknown; rate: unknown; emiAmount: unknown; tenureMonths: number; paidInstallments: number; startDate: Date; nextPaymentDate: Date; status: string }, preference: CalendarPreference): LoanRecord {
  return {
    id: row.id,
    name: row.name,
    lender: row.lender,
    principal: Number(row.principal),
    downPayment: Number(row.downPayment),
    balance: Number(row.balance),
    rate: Number(row.rate),
    emi: Number(row.emiAmount),
    paid: row.paidInstallments,
    total: row.tenureMonths,
    startDate: formatDisplayDate(row.startDate, preference),
    nextDate: formatDisplayDate(row.nextPaymentDate, preference),
    nextDateISO: toLocalDateISO(row.nextPaymentDate),
    status: row.status,
  };
}

export async function listLoans(): Promise<LoanRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.loan.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => toRecord(row, preference));
}

export async function createLoan(formData: FormData) {
  const userId = await requireUserId();
  const parsed = loanSchema.parse({
    name: formData.get("name"),
    lender: formData.get("lender"),
    loanAmount: formData.get("loanAmount"),
    downPaymentPercent: formData.get("downPaymentPercent"),
    rate: formData.get("rate"),
    months: formData.get("months"),
    startDate: formData.get("startDate"),
    emi: formData.get("emi"),
  });
  const startDate = new Date(parsed.startDate);
  if (Number.isNaN(startDate.getTime())) throw new Error("Enter a valid EMI start date.");
  const downPaymentAmount = parsed.loanAmount * (parsed.downPaymentPercent / 100);
  const principal = parsed.loanAmount - downPaymentAmount;
  await prisma.loan.create({
    data: {
      userId,
      name: parsed.name,
      lender: parsed.lender,
      principal,
      downPayment: downPaymentAmount,
      balance: principal,
      rate: parsed.rate,
      emiAmount: parsed.emi,
      tenureMonths: parsed.months,
      startDate,
      nextPaymentDate: startDate,
    },
  });
  revalidatePath("/loans");
}

export async function deleteLoan(id: string) {
  const userId = await requireUserId();
  await prisma.loan.deleteMany({ where: { id, userId } });
  revalidatePath("/loans");
}

export async function payLoanEmi(id: string, formData: FormData) {
  const userId = await requireUserId();
  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) throw new Error("Loan not found.");
  const paymentMethod = z.enum(PAYMENT_METHODS, { message: "Select a payment method." }).parse(formData.get("paymentMethod"));
  const proofUrl = await readEmiProof(formData);
  const emi = Number(loan.emiAmount);
  const balance = Math.max(0, Number(loan.balance) - emi);
  const paidInstallments = Math.min(loan.tenureMonths, loan.paidInstallments + 1);
  const nextPaymentDate = new Date(loan.nextPaymentDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  const status = paidInstallments >= loan.tenureMonths || balance <= 0 ? "Paid off" : "Active";
  // EMI payments are tracked as LoanPayment rows only — an Expense row used to be created here
  // too, but that double-counted every EMI in both the Expenses list and the reports "EMI"
  // total, and inflated Total Expenses (and therefore skewed Net Profit) by the same amount.
  await prisma.loan.update({ where: { id: loan.id }, data: { balance, paidInstallments, nextPaymentDate, status } });
  await prisma.loanPayment.create({ data: { userId, loanId: loan.id, loanName: loan.name, lender: loan.lender, amount: emi, paymentMethod, proofUrl } });
  revalidatePath("/loans");
  revalidatePath("/reports");
}

export async function listLoanPayments(): Promise<LoanPaymentRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.loanPayment.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => ({
    id: row.id,
    displayId: toPaymentDisplayId(row.id),
    loanName: row.loanName,
    lender: row.lender,
    amount: Number(row.amount),
    date: formatDisplayDate(row.date, preference),
    dateISO: toLocalDateISO(row.date),
    proofUrl: row.proofUrl,
  }));
}
