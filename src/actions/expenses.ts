"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";

export type ExpenseRecord = {
  id: string;
  displayId: string;
  vendor: string;
  description: string;
  category: string;
  date: string;
  dateISO: string;
  amount: number;
  status: "Paid" | "Pending";
  proofUrl: string | null;
};

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

function toDisplayId(id: string) {
  return `EXP-${id.slice(-6).toUpperCase()}`;
}

function toRecord(row: { id: string; vendor: string; description: string; category: string; date: Date; amount: unknown; status: string; proofUrl: string | null }, preference: CalendarPreference): ExpenseRecord {
  return {
    id: row.id,
    displayId: toDisplayId(row.id),
    vendor: row.vendor,
    description: row.description,
    category: row.category,
    date: formatDisplayDate(row.date, preference),
    dateISO: toLocalDateISO(row.date),
    amount: Number(row.amount),
    status: row.status === "Pending" ? "Pending" : "Paid",
    proofUrl: row.proofUrl,
  };
}

async function currentCalendarPreference(userId: string): Promise<CalendarPreference> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

const expenseSchema = z.object({
  vendor: z.string().trim().min(1, "Enter a vendor name."),
  description: z.enum(PAYMENT_METHODS, { message: "Select a payment method." }),
  category: z.string().trim().min(1, "Enter a category."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  status: z.enum(["Paid", "Pending"]),
  date: z.string().optional(),
});

async function readProof(formData: FormData): Promise<string | null | undefined> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Expense proof must be an image file.");
  if (file.size > MAX_PROOF_BYTES) throw new Error("Expense proof image must be smaller than 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function listExpenses(): Promise<ExpenseRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => toRecord(row, preference));
}

export async function createExpense(formData: FormData) {
  const userId = await requireUserId();
  const parsed = expenseSchema.parse({
    vendor: formData.get("vendor"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    date: formData.get("date"),
  });
  const proofUrl = await readProof(formData);
  const date = parsed.date ? new Date(`${parsed.date}T00:00:00`) : new Date();
  await prisma.expense.create({ data: { userId, vendor: parsed.vendor, description: parsed.description, category: parsed.category, amount: parsed.amount, status: parsed.status, date, proofUrl: proofUrl ?? null } });
  revalidatePath("/expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  const userId = await requireUserId();
  const parsed = expenseSchema.omit({ date: true }).parse({
    vendor: formData.get("vendor"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const proofUrl = await readProof(formData);
  const removeProof = formData.get("removeProof") === "true";
  await prisma.expense.updateMany({
    where: { id, userId },
    data: { vendor: parsed.vendor, description: parsed.description, category: parsed.category, amount: parsed.amount, status: parsed.status, ...(proofUrl !== undefined ? { proofUrl } : removeProof ? { proofUrl: null } : {}) },
  });
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const userId = await requireUserId();
  await prisma.expense.deleteMany({ where: { id, userId } });
  revalidatePath("/expenses");
}
