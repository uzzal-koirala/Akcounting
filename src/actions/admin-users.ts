"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sendMail } from "@/lib/mailer";
import { adminInviteEmailHtml } from "@/lib/email-templates";

export type AdminUserRecord = { id: string; name: string; email: string; phone: string | null; joined: string; isYou: boolean; pendingSetup: boolean };

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });
const PASSWORD_SET_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only super admins can do this.");
  return session.userId;
}

function toRecord(row: { id: string; name: string; email: string; phone: string | null; createdAt: Date; passwordSetToken: string | null; passwordSetExpiresAt: Date | null }, currentUserId: string): AdminUserRecord {
  const pendingSetup = Boolean(row.passwordSetToken) && Boolean(row.passwordSetExpiresAt) && row.passwordSetExpiresAt!.getTime() > Date.now();
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, joined: dateFormatter.format(row.createdAt), isYou: row.id === currentUserId, pendingSetup };
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const currentUserId = await requireAdminId();
  const rows = await prisma.user.findMany({ where: { role: "admin" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, phone: true, createdAt: true, passwordSetToken: true, passwordSetExpiresAt: true } });
  return rows.map((row) => toRecord(row, currentUserId));
}

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function createAdminUser(formData: FormData): Promise<AdminUserRecord> {
  const currentUserId = await requireAdminId();
  const parsed = createAdminSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  const existing = await prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } });
  if (existing) throw new Error("An account with this email already exists.");

  const placeholderHash = await bcrypt.hash(randomUUID(), 10);
  const passwordSetToken = randomBytes(32).toString("hex");
  const passwordSetExpiresAt = new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS);

  const created = await prisma.user.create({
    data: { name: parsed.name, email: parsed.email, passwordHash: placeholderHash, role: "admin", passwordSetToken, passwordSetExpiresAt, emailVerifiedAt: new Date() },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, passwordSetToken: true, passwordSetExpiresAt: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/set-password?token=${passwordSetToken}`;

  try {
    await sendMail({ to: parsed.email, subject: "You've been added as an AKCounting super admin", html: adminInviteEmailHtml({ name: parsed.name, link }) });
  } catch (caught) {
    await prisma.user.delete({ where: { id: created.id } });
    throw new Error(caught instanceof Error ? `Could not send the invite email: ${caught.message}` : "Could not send the invite email.");
  }

  revalidatePath("/super-admin/users");
  return toRecord(created, currentUserId);
}

export async function resendAdminInvite(userId: string): Promise<AdminUserRecord> {
  const currentUserId = await requireAdminId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, createdAt: true, role: true } });
  if (user.role !== "admin") throw new Error("This account is not a super admin.");

  const passwordSetToken = randomBytes(32).toString("hex");
  const passwordSetExpiresAt = new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS);
  const updated = await prisma.user.update({ where: { id: userId }, data: { passwordSetToken, passwordSetExpiresAt }, select: { id: true, name: true, email: true, phone: true, createdAt: true, passwordSetToken: true, passwordSetExpiresAt: true } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/set-password?token=${passwordSetToken}`;
  await sendMail({ to: user.email, subject: "Set your AKCounting super admin password", html: adminInviteEmailHtml({ name: user.name, link, isResend: true }) });

  revalidatePath("/super-admin/users");
  return toRecord(updated, currentUserId);
}
