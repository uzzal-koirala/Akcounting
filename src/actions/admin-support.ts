"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import type { SupportTicketStatus, TicketReplyRecord } from "@/actions/support";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session;
}

export type AdminTicketRecord = {
  id: string;
  subject: string;
  message: string;
  imageUrl: string | null;
  requester: string;
  email: string;
  organization: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  status: SupportTicketStatus;
  updated: string;
  created: string;
  replies: TicketReplyRecord[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, "hour");
  return relativeFormatter.format(Math.round(diffHours / 24), "day");
}

export async function listAllSupportTickets(): Promise<AdminTicketRecord[]> {
  await requireAdmin();
  const rows = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true, businessProfile: { select: { tradingName: true, legalName: true } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    message: row.message,
    imageUrl: row.imageUrl,
    requester: row.user.name,
    email: row.user.email,
    organization: row.user.businessProfile?.tradingName || row.user.businessProfile?.legalName || "—",
    category: row.category,
    priority: (["High", "Medium", "Low"].includes(row.priority) ? row.priority : "Medium") as AdminTicketRecord["priority"],
    status: (["Open", "In progress", "Resolved"].includes(row.status) ? row.status : "Open") as SupportTicketStatus,
    updated: relativeTime(row.updatedAt),
    created: dateTimeFormatter.format(row.createdAt),
    replies: row.replies.map((reply) => ({ id: reply.id, authorName: reply.authorName, isAdmin: reply.isAdmin, message: reply.message, imageUrl: reply.imageUrl, createdAt: reply.createdAt.toISOString() })),
  }));
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  await requireAdmin();
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath("/super-admin/support");
  revalidatePath("/support");
}

export async function replyToTicketAsAdmin(ticketId: string, message: string) {
  const session = await requireAdmin();
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Write a reply before sending.");

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { status: true } });
  if (!ticket) throw new Error("This ticket could not be found.");

  await prisma.$transaction([
    prisma.ticketReply.create({ data: { ticketId, authorName: session.name, isAdmin: true, message: trimmed } }),
    ...(ticket.status === "Open" ? [prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "In progress" } })] : []),
  ]);

  revalidatePath("/super-admin/support");
  revalidatePath("/support");
}
