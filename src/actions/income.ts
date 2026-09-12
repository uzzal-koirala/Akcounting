"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";

export type IncomeRecord = {
  id: string;
  displayId: string;
  client: string;
  description: string;
  source: string;
  date: string;
  dateISO: string;
  amount: number;
  status: "Received" | "Pending";
  proofUrl: string | null;
};

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

function toDisplayId(id: string) {
  return `INC-${id.slice(-6).toUpperCase()}`;
}

function toRecord(row: { id: string; client: string; description: string; source: string; date: Date; amount: unknown; status: string; proofUrl: string | null }, preference: CalendarPreference): IncomeRecord {
  return {
    id: row.id,
    displayId: toDisplayId(row.id),
    client: row.client,
    description: row.description,
    source: row.source,
    date: formatDisplayDate(row.date, preference),
    dateISO: toLocalDateISO(row.date),
    amount: Number(row.amount),
    status: row.status === "Pending" ? "Pending" : "Received",
    proofUrl: row.proofUrl,
  };
}

async function currentCalendarPreference(userId: string): Promise<CalendarPreference> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

const incomeSchema = z.object({
  client: z.string().trim().min(1, "Enter an income title."),
  description: z.enum(PAYMENT_METHODS, { message: "Select a payment method." }),
  source: z.string().trim().min(1, "Enter an income source."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  status: z.enum(["Received", "Pending"]),
  date: z.string().optional(),
});

async function readProof(formData: FormData): Promise<string | null | undefined> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Income proof must be an image file.");
  if (file.size > MAX_PROOF_BYTES) throw new Error("Income proof image must be smaller than 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function listIncome(): Promise<IncomeRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.income.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => toRecord(row, preference));
}

export async function createIncome(formData: FormData) {
  const userId = await requireUserId();
  const parsed = incomeSchema.parse({
    client: formData.get("client"),
    description: formData.get("description"),
    source: formData.get("source"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    date: formData.get("date"),
  });
  const proofUrl = await readProof(formData);
  const date = parsed.date ? new Date(`${parsed.date}T00:00:00`) : new Date();
  await prisma.income.create({ data: { userId, client: parsed.client, description: parsed.description, source: parsed.source, amount: parsed.amount, status: parsed.status, date, proofUrl: proofUrl ?? null } });
  revalidatePath("/income");
}

export async function updateIncome(id: string, formData: FormData) {
  const userId = await requireUserId();
  const parsed = incomeSchema.omit({ date: true }).parse({
    client: formData.get("client"),
    description: formData.get("description"),
    source: formData.get("source"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const proofUrl = await readProof(formData);
  const removeProof = formData.get("removeProof") === "true";
  await prisma.income.updateMany({
    where: { id, userId },
    data: { client: parsed.client, description: parsed.description, source: parsed.source, amount: parsed.amount, status: parsed.status, ...(proofUrl !== undefined ? { proofUrl } : removeProof ? { proofUrl: null } : {}) },
  });
  revalidatePath("/income");
}

export async function deleteIncome(id: string) {
  const userId = await requireUserId();
  await prisma.income.deleteMany({ where: { id, userId } });
  revalidatePath("/income");
}
