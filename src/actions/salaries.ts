"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";

export type SalaryStatus = "Paid" | "Processing" | "Pending";
export type SalaryRecord = {
  id: string;
  displayId: string;
  employee: string;
  role: string;
  month: string;
  gross: number;
  deductions: number;
  bonus: number;
  status: SalaryStatus;
  initials: string;
  tone: string;
  date: string;
  dateISO: string;
};

async function currentCalendarPreference(userId: string): Promise<CalendarPreference> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

const TONES = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];

function toDisplayId(id: string) {
  return `PAY-${id.slice(-6).toUpperCase()}`;
}

function toneFor(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

function toRecord(row: { id: string; employee: string; role: string; month: string; gross: unknown; deductions: unknown; bonus: unknown; status: string; createdAt: Date }, preference: CalendarPreference): SalaryRecord {
  const status: SalaryStatus = row.status === "Processing" ? "Processing" : row.status === "Pending" ? "Pending" : "Paid";
  return {
    id: row.id,
    displayId: toDisplayId(row.id),
    employee: row.employee,
    role: row.role,
    month: row.month,
    gross: Number(row.gross),
    deductions: Number(row.deductions),
    bonus: Number(row.bonus),
    status,
    initials: row.employee.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(),
    tone: toneFor(row.id),
    date: formatDisplayDate(row.createdAt, preference),
    dateISO: toLocalDateISO(row.createdAt),
  };
}

const salarySchema = z.object({
  employee: z.string().trim().min(1, "Enter an employee name."),
  role: z.string().trim().min(1, "Enter a role."),
  month: z.string().trim().min(1, "Select a payroll month."),
  gross: z.coerce.number().nonnegative("Gross salary must be 0 or more."),
  deductions: z.coerce.number().nonnegative("Deductions must be 0 or more."),
  bonus: z.coerce.number().nonnegative("Bonus must be 0 or more."),
  status: z.enum(["Paid", "Processing", "Pending"]),
});

export async function listSalaries(): Promise<SalaryRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.salary.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => toRecord(row, preference));
}

async function recordPayrollExpense(userId: string, salary: { employee: string; month: string; gross: number; deductions: number; bonus: number }) {
  const net = salary.gross - salary.deductions + salary.bonus;
  await prisma.expense.create({
    data: {
      userId,
      vendor: salary.employee,
      description: "Bank transfer",
      category: "Payroll",
      date: new Date(),
      amount: net,
      status: "Paid",
    },
  });
  revalidatePath("/expenses");
}

export async function createSalary(formData: FormData) {
  const userId = await requireUserId();
  const parsed = salarySchema.parse({
    employee: formData.get("employee"),
    role: formData.get("role"),
    month: formData.get("month"),
    gross: formData.get("gross"),
    deductions: formData.get("deductions"),
    bonus: formData.get("bonus"),
    status: formData.get("status"),
  });
  await prisma.salary.create({ data: { userId, ...parsed } });
  if (parsed.status === "Paid") await recordPayrollExpense(userId, parsed);
  revalidatePath("/salaries");
}

export async function updateSalary(id: string, formData: FormData) {
  const userId = await requireUserId();
  const parsed = salarySchema.parse({
    employee: formData.get("employee"),
    role: formData.get("role"),
    month: formData.get("month"),
    gross: formData.get("gross"),
    deductions: formData.get("deductions"),
    bonus: formData.get("bonus"),
    status: formData.get("status"),
  });
  const existing = await prisma.salary.findFirst({ where: { id, userId }, select: { status: true } });
  await prisma.salary.updateMany({ where: { id, userId }, data: parsed });
  if (parsed.status === "Paid" && existing?.status !== "Paid") await recordPayrollExpense(userId, parsed);
  revalidatePath("/salaries");
}

export async function deleteSalary(id: string) {
  const userId = await requireUserId();
  await prisma.salary.deleteMany({ where: { id, userId } });
  revalidatePath("/salaries");
}
