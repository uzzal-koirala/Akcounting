"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

export type BusinessProfileRecord = {
  legalName: string;
  tradingName: string;
  panVat: string;
  registration: string;
  invoicePrefix: string;
  paymentTerms: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  swift: string;
  paymentMethod: string;
  paymentNote: string;
  logoUrl: string | null;
  qrUrl: string | null;
  signatureUrl: string | null;
};

const EMPTY_PROFILE: BusinessProfileRecord = {
  legalName: "",
  tradingName: "",
  panVat: "",
  registration: "",
  invoicePrefix: "INV",
  paymentTerms: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  branch: "",
  swift: "",
  paymentMethod: "Bank transfer",
  paymentNote: "",
  logoUrl: null,
  qrUrl: null,
  signatureUrl: null,
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const textField = () => z.string().trim().max(200).optional().default("");

const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Enter your legal business name."),
  tradingName: textField(),
  panVat: textField(),
  registration: textField(),
  invoicePrefix: z.string().trim().min(1, "Enter an invoice prefix.").max(10),
  paymentTerms: textField(),
  email: z.string().trim().email("Enter a valid email.").or(z.literal("")).optional().default(""),
  phone: textField(),
  website: textField(),
  address: textField(),
  city: textField(),
  province: textField(),
  postalCode: textField(),
  country: textField(),
  bankName: textField(),
  accountName: textField(),
  accountNumber: textField(),
  branch: textField(),
  swift: textField(),
  paymentMethod: textField(),
  paymentNote: z.string().trim().max(1000).optional().default(""),
});

async function readImage(formData: FormData, field: string): Promise<string | null | undefined> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error(`${field} must be an image file.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${field} must be smaller than 2 MB.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function getBusinessProfile(): Promise<BusinessProfileRecord> {
  const userId = await requireUserId();
  const row = await prisma.businessProfile.findUnique({ where: { userId } });
  if (!row) return EMPTY_PROFILE;
  return {
    legalName: row.legalName,
    tradingName: row.tradingName,
    panVat: row.panVat,
    registration: row.registration,
    invoicePrefix: row.invoicePrefix,
    paymentTerms: row.paymentTerms,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    country: row.country,
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    branch: row.branch,
    swift: row.swift,
    paymentMethod: row.paymentMethod,
    paymentNote: row.paymentNote,
    logoUrl: row.logoUrl,
    qrUrl: row.qrUrl,
    signatureUrl: row.signatureUrl,
  };
}

export async function saveBusinessProfile(formData: FormData) {
  const userId = await requireUserId();
  const parsed = profileSchema.parse(Object.fromEntries(formData.entries()));
  const logoUrl = await readImage(formData, "logo");
  const qrUrl = await readImage(formData, "qr");
  const signatureUrl = await readImage(formData, "signature");
  const removeLogo = formData.get("removeLogo") === "true";
  const removeQr = formData.get("removeQr") === "true";
  const removeSignature = formData.get("removeSignature") === "true";

  await prisma.businessProfile.upsert({
    where: { userId },
    update: {
      ...parsed,
      ...(logoUrl !== undefined ? { logoUrl } : removeLogo ? { logoUrl: null } : {}),
      ...(qrUrl !== undefined ? { qrUrl } : removeQr ? { qrUrl: null } : {}),
      ...(signatureUrl !== undefined ? { signatureUrl } : removeSignature ? { signatureUrl: null } : {}),
    },
    create: { userId, ...parsed, logoUrl: logoUrl ?? null, qrUrl: qrUrl ?? null, signatureUrl: signatureUrl ?? null },
  });
  revalidatePath("/settings");
  revalidatePath("/invoices");
}
