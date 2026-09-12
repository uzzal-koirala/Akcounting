"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { canUploadDocuments, toPlanName } from "@/lib/plan";

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Financial", color: "bg-emerald-500" },
  { name: "Contracts", color: "bg-blue-500" },
  { name: "Receipts", color: "bg-amber-500" },
  { name: "Reports", color: "bg-rose-500" },
  { name: "Other", color: "bg-slate-400" },
];
const CATEGORY_COLOR_CYCLE = ["bg-violet-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500", "bg-orange-500", "bg-teal-500"];

const DOCUMENT_EXTENSIONS = ["PDF", "DOC", "DOCX", "XLS", "XLSX", "CSV", "TXT", "PPT", "PPTX"];
const IMAGE_EXTENSIONS = ["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"];
const ALLOWED_EXTENSIONS = [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS];
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type DocumentCategoryRecord = { id: string; name: string; color: string };
export type DocumentRecord = {
  id: string;
  name: string;
  extension: string;
  size: string;
  bytes: number;
  category: string;
  uploaded: string;
  owner: string;
  starred: boolean;
  url: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function listDocumentCategories(): Promise<DocumentCategoryRecord[]> {
  const userId = await requireUserId();
  const existing = await prisma.documentCategory.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing.length > 0) return existing.map((row) => ({ id: row.id, name: row.name, color: row.color }));

  await prisma.documentCategory.createMany({ data: DEFAULT_CATEGORIES.map((item) => ({ userId, ...item })), skipDuplicates: true });
  const seeded = await prisma.documentCategory.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return seeded.map((row) => ({ id: row.id, name: row.name, color: row.color }));
}

const categoryNameSchema = z.string().trim().min(1, "Enter a category name.").max(40, "Category name is too long.");

export async function createDocumentCategory(name: string): Promise<DocumentCategoryRecord> {
  const userId = await requireUserId();
  const parsed = categoryNameSchema.parse(name);
  const existingCount = await prisma.documentCategory.count({ where: { userId } });
  const category = await prisma.documentCategory.upsert({
    where: { userId_name: { userId, name: parsed } },
    update: {},
    create: { userId, name: parsed, color: CATEGORY_COLOR_CYCLE[existingCount % CATEGORY_COLOR_CYCLE.length] },
  });
  revalidatePath("/documents");
  return { id: category.id, name: category.name, color: category.color };
}

export async function deleteDocumentCategory(id: string): Promise<void> {
  const userId = await requireUserId();
  const categories = await prisma.documentCategory.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (categories.length <= 1) return;
  const target = categories.find((item) => item.id === id);
  if (!target) return;
  const fallback = categories.find((item) => item.id !== id)?.name ?? "Other";

  await prisma.document.updateMany({ where: { userId, category: target.name }, data: { category: fallback } });
  await prisma.documentCategory.delete({ where: { id } });
  revalidatePath("/documents");
}

function toRecord(row: { id: string; name: string; extension: string; sizeBytes: number; category: string; dataUrl: string; starred: boolean; createdAt: Date }, owner: string): DocumentRecord {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    size: formatBytes(row.sizeBytes),
    bytes: row.sizeBytes,
    category: row.category,
    uploaded: dateFormatter.format(row.createdAt),
    owner,
    starred: row.starred,
    url: row.dataUrl,
  };
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const userId = await requireUserId();
  const [rows, user] = await Promise.all([
    prisma.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  const owner = user?.name ?? "You";
  return rows.map((row) => toRecord(row, owner));
}

export async function uploadDocument(formData: FormData): Promise<DocumentRecord> {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, plan: true } });
  const existingCount = await prisma.document.count({ where: { userId } });
  if (!canUploadDocuments(existingCount, toPlanName(user?.plan))) {
    throw new Error("You've reached your document limit for this plan. Upgrade to upload more.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be smaller than 4 MB.");

  const parts = file.name.split(".");
  const extension = parts.length > 1 ? parts.pop()!.toUpperCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) throw new Error("Only document and image files can be uploaded.");

  const name = (formData.get("name") as string | null)?.trim() || parts.join(".") || file.name;
  const category = (formData.get("category") as string | null)?.trim() || "Other";

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;

  const created = await prisma.document.create({
    data: { userId, name, extension, sizeBytes: file.size, category, dataUrl },
  });
  revalidatePath("/documents");
  return toRecord(created, user?.name ?? "You");
}

export async function deleteDocument(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.document.deleteMany({ where: { id, userId } });
  revalidatePath("/documents");
}

export async function toggleDocumentStar(id: string): Promise<void> {
  const userId = await requireUserId();
  const doc = await prisma.document.findFirst({ where: { id, userId }, select: { starred: true } });
  if (!doc) return;
  await prisma.document.update({ where: { id }, data: { starred: !doc.starred } });
  revalidatePath("/documents");
}
