"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

export type ContactRecord = {
  id: string;
  type: "Client" | "Vendor";
  name: string;
  email: string;
  phone: string;
  address: string;
  panVat: string;
};

function toRecord(row: { id: string; type: string; name: string; email: string; phone: string; address: string; panVat: string }): ContactRecord {
  return { id: row.id, type: row.type === "Vendor" ? "Vendor" : "Client", name: row.name, email: row.email, phone: row.phone, address: row.address, panVat: row.panVat };
}

const contactSchema = z.object({
  type: z.enum(["Client", "Vendor"]),
  name: z.string().trim().min(1, "Enter a name."),
  email: z.string().trim().email("Enter a valid email.").or(z.literal("")).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  panVat: z.string().trim().max(60).optional().default(""),
});

export async function listContacts(): Promise<ContactRecord[]> {
  const userId = await requireUserId();
  const rows = await prisma.contact.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return rows.map(toRecord);
}

export async function createContact(formData: FormData): Promise<ContactRecord> {
  const userId = await requireUserId();
  const parsed = contactSchema.parse({
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    panVat: formData.get("panVat"),
  });
  const contact = await prisma.contact.create({ data: { userId, ...parsed } });
  revalidatePath("/invoices");
  return toRecord(contact);
}

export async function updateContact(id: string, formData: FormData): Promise<ContactRecord> {
  const userId = await requireUserId();
  const parsed = contactSchema.parse({
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    panVat: formData.get("panVat"),
  });
  await prisma.contact.updateMany({ where: { id, userId }, data: parsed });
  revalidatePath("/invoices");
  return { id, ...parsed };
}

export async function deleteContact(id: string) {
  const userId = await requireUserId();
  await prisma.contact.deleteMany({ where: { id, userId } });
  revalidatePath("/invoices");
}
