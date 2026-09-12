"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { formatDisplayDate, toLocalDateISO, type CalendarPreference } from "@/lib/calendar";

export type InvoiceItemRecord = { id: string; description: string; quantity: number; rate: number; amount: number };
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type InvoiceDocType = "Invoice" | "Quotation";
export type InvoiceRecord = {
  id: string;
  number: string;
  status: InvoiceStatus;
  docType: InvoiceDocType;
  template: string;
  accentColor: string;
  secondaryColor: string;
  showPaymentInfo: boolean;
  footerMessage: string;
  iconColor: string;
  descriptionFontSize: number;
  issueDate: string;
  dueDate: string;
  issueDateISO: string;
  dueDateISO: string;
  notes: string;
  contactId: string | null;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItemRecord[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  amount: number;
};

const itemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
});

const invoiceSchema = z.object({
  contactId: z.string().trim().min(1, "Select a client."),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue"]),
  docType: z.enum(["Invoice", "Quotation"]).optional().default("Invoice"),
  template: z.enum(["bold", "diagonal", "clean", "corporate", "professional", "creative"]),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color."),
  secondaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid secondary color."),
  showPaymentInfo: z.enum(["true", "false"]).transform((value) => value === "true"),
  footerMessage: z.string().trim().max(240).optional().default("Thank you for your business! We truly appreciate your trust and support."),
  iconColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid icon color."),
  descriptionFontSize: z.coerce.number().int().min(9).max(16),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  discount: z.coerce.number().min(0).optional().default(0),
  notes: z.string().trim().max(1000).optional().default(""),
  items: z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      const result = z.array(itemSchema).min(1, "Add at least one line item.").parse(parsed);
      return result;
    } catch {
      ctx.addIssue({ code: "custom", message: "Add at least one valid line item." });
      return z.NEVER;
    }
  }),
});

function toRecord(row: {
  id: string;
  number: string;
  status: string;
  docType: string;
  template: string;
  accentColor: string;
  secondaryColor: string;
  showPaymentInfo: boolean;
  footerMessage: string;
  iconColor: string;
  descriptionFontSize: number;
  taxRate: unknown;
  discount: unknown;
  issueDate: Date;
  dueDate: Date;
  notes: string;
  contactId: string | null;
  contact: { name: string; email: string; address: string } | null;
  items: { id: string; description: string; quantity: unknown; rate: unknown }[];
}, preference: CalendarPreference): InvoiceRecord {
  const items = row.items.map((item) => {
    const quantity = Number(item.quantity);
    const rate = Number(item.rate);
    return { id: item.id, description: item.description, quantity, rate, amount: quantity * rate };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = Number(row.taxRate);
  const discount = Number(row.discount);
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  return {
    id: row.id,
    number: row.number,
    status: (["Draft", "Sent", "Paid", "Overdue"].includes(row.status) ? row.status : "Draft") as InvoiceStatus,
    docType: row.docType === "Quotation" ? "Quotation" : "Invoice",
    template: row.template,
    accentColor: row.accentColor,
    secondaryColor: row.secondaryColor,
    showPaymentInfo: row.showPaymentInfo,
    footerMessage: row.footerMessage,
    iconColor: row.iconColor,
    descriptionFontSize: row.descriptionFontSize,
    issueDate: formatDisplayDate(row.issueDate, preference),
    dueDate: formatDisplayDate(row.dueDate, preference),
    issueDateISO: toLocalDateISO(row.issueDate),
    dueDateISO: toLocalDateISO(row.dueDate),
    notes: row.notes,
    contactId: row.contactId,
    clientName: row.contact?.name ?? "Unknown client",
    clientEmail: row.contact?.email ?? "",
    clientAddress: row.contact?.address ?? "",
    items,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    amount: subtotal - discount + taxAmount,
  };
}

const INCLUDE = { contact: { select: { name: true, email: true, address: true } }, items: true } as const;

async function currentCalendarPreference(userId: string): Promise<CalendarPreference> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  const userId = await requireUserId();
  const [rows, preference] = await Promise.all([
    prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: INCLUDE }),
    currentCalendarPreference(userId),
  ]);
  return rows.map((row) => toRecord(row, preference));
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  const userId = await requireUserId();
  const [row, preference] = await Promise.all([
    prisma.invoice.findFirst({ where: { id, userId }, include: INCLUDE }),
    currentCalendarPreference(userId),
  ]);
  return row ? toRecord(row, preference) : null;
}

async function nextInvoiceNumber(userId: string, docType: InvoiceDocType) {
  if (docType === "Quotation") {
    const count = await prisma.invoice.count({ where: { userId, docType: "Quotation" } });
    return `QUO-${String(1000 + count + 1)}`;
  }
  const [profile, count] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId }, select: { invoicePrefix: true } }),
    prisma.invoice.count({ where: { userId, docType: "Invoice" } }),
  ]);
  const prefix = profile?.invoicePrefix?.trim() || "INV";
  return `${prefix}-${String(1000 + count + 1)}`;
}

export async function createInvoice(formData: FormData) {
  const userId = await requireUserId();
  const parsed = invoiceSchema.parse({
    contactId: formData.get("contactId"),
    status: formData.get("status"),
    docType: formData.get("docType") || undefined,
    template: formData.get("template"),
    accentColor: formData.get("accentColor"),
    secondaryColor: formData.get("secondaryColor"),
    showPaymentInfo: formData.get("showPaymentInfo"),
    footerMessage: formData.get("footerMessage"),
    iconColor: formData.get("iconColor"),
    descriptionFontSize: formData.get("descriptionFontSize"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    taxRate: formData.get("taxRate"),
    discount: formData.get("discount"),
    notes: formData.get("notes"),
    items: formData.get("items"),
  });
  const number = await nextInvoiceNumber(userId, parsed.docType);
  const created = await prisma.invoice.create({
    data: {
      userId,
      number,
      contactId: parsed.contactId,
      status: parsed.status,
      docType: parsed.docType,
      template: parsed.template,
      accentColor: parsed.accentColor,
      secondaryColor: parsed.secondaryColor,
      showPaymentInfo: parsed.showPaymentInfo,
      footerMessage: parsed.footerMessage,
      iconColor: parsed.iconColor,
      descriptionFontSize: parsed.descriptionFontSize,
      taxRate: parsed.taxRate,
      discount: parsed.discount,
      issueDate: new Date(`${parsed.issueDate}T00:00:00`),
      dueDate: new Date(`${parsed.dueDate}T00:00:00`),
      notes: parsed.notes,
      items: { create: parsed.items.map((item) => ({ description: item.description, quantity: item.quantity, rate: item.rate })) },
    },
    include: INCLUDE,
  });
  revalidatePath("/invoices");
  return toRecord(created, await currentCalendarPreference(userId));
}

export async function updateInvoice(id: string, formData: FormData) {
  const userId = await requireUserId();
  const parsed = invoiceSchema.parse({
    contactId: formData.get("contactId"),
    status: formData.get("status"),
    template: formData.get("template"),
    accentColor: formData.get("accentColor"),
    secondaryColor: formData.get("secondaryColor"),
    showPaymentInfo: formData.get("showPaymentInfo"),
    footerMessage: formData.get("footerMessage"),
    iconColor: formData.get("iconColor"),
    descriptionFontSize: formData.get("descriptionFontSize"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    taxRate: formData.get("taxRate"),
    discount: formData.get("discount"),
    notes: formData.get("notes"),
    items: formData.get("items"),
  });
  const owned = await prisma.invoice.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Invoice not found.");
  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        contactId: parsed.contactId,
        status: parsed.status,
        template: parsed.template,
        accentColor: parsed.accentColor,
        secondaryColor: parsed.secondaryColor,
        showPaymentInfo: parsed.showPaymentInfo,
        footerMessage: parsed.footerMessage,
        iconColor: parsed.iconColor,
        descriptionFontSize: parsed.descriptionFontSize,
        taxRate: parsed.taxRate,
        discount: parsed.discount,
        issueDate: new Date(`${parsed.issueDate}T00:00:00`),
        dueDate: new Date(`${parsed.dueDate}T00:00:00`),
        notes: parsed.notes,
        items: { create: parsed.items.map((item) => ({ description: item.description, quantity: item.quantity, rate: item.rate })) },
      },
    }),
  ]);
  revalidatePath("/invoices");
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  const userId = await requireUserId();
  await prisma.invoice.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  const userId = await requireUserId();
  await prisma.invoice.deleteMany({ where: { id, userId } });
  revalidatePath("/invoices");
}
