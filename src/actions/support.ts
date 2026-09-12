"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

export type SupportTicketStatus = "Open" | "In progress" | "Resolved";
export type TicketReplyRecord = { id: string; authorName: string; isAdmin: boolean; message: string; imageUrl: string | null; createdAt: string };
export type SupportTicketRecord = {
  id: string;
  subject: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  message: string;
  imageUrl: string | null;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  replies: TicketReplyRecord[];
};

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Add a short subject."),
  category: z.enum(["General", "Billing", "Invoices", "Transactions", "Reports", "Technical"]),
  priority: z.enum(["High", "Medium", "Low"]),
  message: z.string().trim().min(10, "Describe your issue in a bit more detail."),
});

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

async function readImage(formData: FormData): Promise<string | undefined> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Attachments must be an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image attachments must be smaller than 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

type TicketRow = { id: string; subject: string; category: string; priority: string; message: string; imageUrl: string | null; status: string; createdAt: Date; updatedAt: Date; replies?: { id: string; authorName: string; isAdmin: boolean; message: string; imageUrl: string | null; createdAt: Date }[] };

function toRecord(row: TicketRow): SupportTicketRecord {
  return {
    id: row.id,
    subject: row.subject,
    category: row.category,
    priority: (["High", "Medium", "Low"].includes(row.priority) ? row.priority : "Medium") as SupportTicketRecord["priority"],
    message: row.message,
    imageUrl: row.imageUrl,
    status: (["Open", "In progress", "Resolved"].includes(row.status) ? row.status : "Open") as SupportTicketStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    replies: (row.replies ?? []).map((reply) => ({ id: reply.id, authorName: reply.authorName, isAdmin: reply.isAdmin, message: reply.message, imageUrl: reply.imageUrl, createdAt: reply.createdAt.toISOString() })),
  };
}

export async function listSupportTickets(): Promise<SupportTicketRecord[]> {
  const userId = await requireUserId();
  const rows = await prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { replies: { orderBy: { createdAt: "asc" } } } });
  return rows.map(toRecord);
}

export async function createSupportTicket(formData: FormData) {
  const userId = await requireUserId();
  const parsed = ticketSchema.parse({
    subject: formData.get("subject"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    message: formData.get("message"),
  });
  const imageUrl = await readImage(formData);
  const created = await prisma.supportTicket.create({ data: { userId, ...parsed, imageUrl }, include: { replies: true } });
  revalidatePath("/support");
  revalidatePath("/super-admin/support");
  return toRecord(created);
}

export async function replyToMyTicket(ticketId: string, formData: FormData) {
  const userId = await requireUserId();
  const message = String(formData.get("message") ?? "").trim();
  const imageUrl = await readImage(formData);
  if (!message && !imageUrl) throw new Error("Write a message or attach an image before sending.");

  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId }, select: { id: true, status: true } });
  if (!ticket) throw new Error("This ticket could not be found.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.$transaction([
    prisma.ticketReply.create({ data: { ticketId, authorName: user?.name ?? "You", isAdmin: false, message, imageUrl } }),
    ...(ticket.status === "Resolved" ? [prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "Open" } })] : []),
  ]);

  revalidatePath("/support");
  revalidatePath("/super-admin/support");
}
