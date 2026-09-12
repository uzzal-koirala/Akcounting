"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

export type DueStatus = "Paid" | "Partial" | "Pending";
export type DuePaymentRecord = { id: string; amount: number; note: string; paidAt: string };
export type DueRecord = {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: DueStatus;
  dueDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  payments: DuePaymentRecord[];
};

function statusOf(totalAmount: number, paidAmount: number): DueStatus {
  if (paidAmount >= totalAmount) return "Paid";
  if (paidAmount > 0) return "Partial";
  return "Pending";
}

type DueRow = {
  id: string;
  contactId: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  contact: { name: string; email: string; phone: string };
  payments: { id: string; amount: number; note: string; paidAt: Date }[];
};

function toRecord(row: DueRow): DueRecord {
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact.name,
    contactEmail: row.contact.email,
    contactPhone: row.contact.phone,
    title: row.title,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    remaining: Math.max(0, row.totalAmount - row.paidAmount),
    status: statusOf(row.totalAmount, row.paidAmount),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    payments: row.payments.map((payment) => ({ id: payment.id, amount: payment.amount, note: payment.note, paidAt: payment.paidAt.toISOString() })),
  };
}

const dueInclude = { contact: { select: { name: true, email: true, phone: true } }, payments: { orderBy: { paidAt: "desc" as const } } };

export async function listDues(): Promise<DueRecord[]> {
  const userId = await requireUserId();
  const rows = await prisma.due.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: dueInclude });
  return rows.map(toRecord);
}

export async function listDuesForContact(contactId: string): Promise<DueRecord[]> {
  const userId = await requireUserId();
  const rows = await prisma.due.findMany({ where: { userId, contactId }, orderBy: { createdAt: "desc" }, include: dueInclude });
  return rows.map(toRecord);
}

const createSchema = z.object({
  contactId: z.string().trim().min(1, "Choose a customer."),
  title: z.string().trim().max(140).optional().default(""),
  totalAmount: z.coerce.number().int().min(1, "Enter a due amount greater than 0."),
  dueDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function createDue(formData: FormData): Promise<DueRecord> {
  const userId = await requireUserId();
  const parsed = createSchema.parse({
    contactId: formData.get("contactId"),
    title: formData.get("title"),
    totalAmount: formData.get("totalAmount"),
    dueDate: formData.get("dueDate") || undefined,
    notes: formData.get("notes"),
  });

  const contact = await prisma.contact.findFirst({ where: { id: parsed.contactId, userId, type: "Client" }, select: { id: true } });
  if (!contact) throw new Error("This customer could not be found.");

  const created = await prisma.due.create({
    data: {
      userId,
      contactId: parsed.contactId,
      title: parsed.title,
      totalAmount: parsed.totalAmount,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      notes: parsed.notes,
    },
    include: dueInclude,
  });

  revalidatePath("/dues");
  revalidatePath("/customers");
  return toRecord(created);
}

const paymentSchema = z.object({
  amount: z.coerce.number().int().min(1, "Enter a payment amount greater than 0."),
  note: z.string().trim().max(200).optional().default(""),
  paidAt: z.string().optional(),
});

export async function recordDuePayment(dueId: string, formData: FormData): Promise<DueRecord> {
  const userId = await requireUserId();
  const parsed = paymentSchema.parse({ amount: formData.get("amount"), note: formData.get("note"), paidAt: formData.get("paidAt") || undefined });

  const due = await prisma.due.findFirst({ where: { id: dueId, userId } });
  if (!due) throw new Error("This due entry could not be found.");

  const remaining = Math.max(0, due.totalAmount - due.paidAmount);
  if (parsed.amount > remaining) throw new Error(`This customer only owes Rs ${remaining} more — enter an amount up to that.`);

  const paidAt = parsed.paidAt ? new Date(parsed.paidAt) : undefined;
  if (paidAt && Number.isNaN(paidAt.getTime())) throw new Error("Enter a valid payment date.");

  const contact = await prisma.contact.findUnique({ where: { id: due.contactId }, select: { name: true } });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.duePayment.create({ data: { dueId, amount: parsed.amount, note: parsed.note, ...(paidAt ? { paidAt } : {}) } });
    await tx.income.create({
      data: {
        userId,
        client: contact?.name ?? "Customer",
        description: "Cash",
        source: due.title ? `Due payment · ${due.title}` : "Due payment",
        amount: parsed.amount,
        status: "Received",
        date: paidAt ?? new Date(),
      },
    });
    return tx.due.update({ where: { id: dueId }, data: { paidAmount: due.paidAmount + parsed.amount }, include: dueInclude });
  });

  revalidatePath("/dues");
  revalidatePath("/customers");
  revalidatePath("/income");
  revalidatePath("/dashboard");
  return toRecord(updated);
}

const editSchema = z.object({
  title: z.string().trim().max(140).optional().default(""),
  totalAmount: z.coerce.number().int().min(1, "Enter a due amount greater than 0."),
  dueDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function updateDue(dueId: string, formData: FormData): Promise<DueRecord> {
  const userId = await requireUserId();
  const parsed = editSchema.parse({
    title: formData.get("title"),
    totalAmount: formData.get("totalAmount"),
    dueDate: formData.get("dueDate") || undefined,
    notes: formData.get("notes"),
  });

  const due = await prisma.due.findFirst({ where: { id: dueId, userId } });
  if (!due) throw new Error("This due entry could not be found.");
  if (parsed.totalAmount < due.paidAmount) throw new Error(`The due amount cannot be less than the Rs ${due.paidAmount} already paid.`);

  const updated = await prisma.due.update({
    where: { id: dueId },
    data: { title: parsed.title, totalAmount: parsed.totalAmount, dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null, notes: parsed.notes },
    include: dueInclude,
  });

  revalidatePath("/dues");
  revalidatePath("/customers");
  return toRecord(updated);
}

export async function deleteDue(dueId: string) {
  const userId = await requireUserId();
  await prisma.due.deleteMany({ where: { id: dueId, userId } });
  revalidatePath("/dues");
  revalidatePath("/customers");
}
