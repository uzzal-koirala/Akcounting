"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { toLocalDateISO } from "@/lib/calendar";

export type PurchaseStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type Purchase = { id: string; name: string; date: string; dateISO: string; amount: number; status: PurchaseStatus; invoiceNumber: string };
export type CustomerRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  panVat: string;
  status: "Active" | "Inactive";
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  invoiceCount: number;
  joinedDate: string;
  purchases: Purchase[];
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

function invoiceAmount(items: { quantity: unknown; rate: unknown }[], taxRate: unknown, discount: unknown) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
  const discountValue = Number(discount) || 0;
  const taxAmount = Math.max(subtotal - discountValue, 0) * (Number(taxRate) / 100);
  return Math.max(subtotal - discountValue, 0) + taxAmount;
}

type ContactWithInvoices = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  panVat: string;
  createdAt: Date;
  invoices: { status: string; taxRate: unknown; discount: unknown; issueDate: Date; number: string; items: { id: string; description: string; quantity: unknown; rate: unknown }[] }[];
};

function buildCustomerRecord(contact: ContactWithInvoices): CustomerRecord {
  let totalInvoiced = 0;
  let totalPaid = 0;
  const purchases: Purchase[] = [];

  for (const invoice of contact.invoices) {
    const amount = invoiceAmount(invoice.items, invoice.taxRate, invoice.discount);
    totalInvoiced += amount;
    if (invoice.status === "Paid") totalPaid += amount;
    const status: PurchaseStatus = invoice.status === "Paid" || invoice.status === "Sent" || invoice.status === "Overdue" ? invoice.status : "Draft";
    for (const item of invoice.items) {
      purchases.push({
        id: item.id,
        name: item.description || "Line item",
        date: dateFmt.format(invoice.issueDate),
        dateISO: toLocalDateISO(invoice.issueDate),
        amount: Number(item.quantity) * Number(item.rate),
        status,
        invoiceNumber: invoice.number,
      });
    }
  }

  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    panVat: contact.panVat,
    status: contact.invoices.length > 0 ? "Active" : "Inactive",
    totalInvoiced,
    totalPaid,
    outstanding: totalInvoiced - totalPaid,
    invoiceCount: contact.invoices.length,
    joinedDate: dateFmt.format(contact.createdAt),
    purchases,
  };
}

export async function listCustomers(): Promise<CustomerRecord[]> {
  const userId = await requireUserId();
  const contacts = await prisma.contact.findMany({
    where: { userId, type: "Client" },
    orderBy: { name: "asc" },
    include: { invoices: { include: { items: true }, orderBy: { issueDate: "desc" } } },
  });

  return contacts.map(buildCustomerRecord);
}

export async function getCustomer(id: string): Promise<CustomerRecord | null> {
  const userId = await requireUserId();
  const contact = await prisma.contact.findFirst({
    where: { id, userId, type: "Client" },
    include: { invoices: { include: { items: true }, orderBy: { issueDate: "desc" } } },
  });
  return contact ? buildCustomerRecord(contact) : null;
}
