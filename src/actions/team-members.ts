"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sendMail } from "@/lib/mailer";
import { teamInviteEmailHtml } from "@/lib/email-templates";
import { canAddTeamMembers, toPlanName } from "@/lib/plan";

export type TeamMemberRole = "Administrator" | "Accountant" | "Manager" | "Viewer";
export type TeamMemberStatus = "Active" | "Invited" | "Suspended";
export type TeamMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | TeamMemberRole;
  status: TeamMemberStatus;
  joined: string;
  lastActive: string;
  isYou: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });
const PASSWORD_SET_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

async function requireOwner() {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in to do this.");
  if (session.ownerId) throw new Error("Only the workspace owner can manage team members.");

  const owner = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, plan: true } });
  if (!owner) throw new Error("Your account could not be found.");
  return owner;
}

function ownerRecord(owner: { id: string; name: string; email: string }, viewerId: string): TeamMemberRecord {
  return { id: owner.id, name: owner.name, email: owner.email, role: "Owner", status: "Active", joined: "", lastActive: "Online now", isYou: owner.id === viewerId };
}

function memberRecord(row: { id: string; name: string; email: string; role: string; status: string; createdAt: Date }, viewerId: string): TeamMemberRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as TeamMemberRole,
    status: row.status as TeamMemberStatus,
    joined: dateFormatter.format(row.createdAt),
    lastActive: row.status === "Invited" ? "Invitation sent" : "—",
    isYou: row.id === viewerId,
  };
}

export async function listTeamMembers(): Promise<TeamMemberRecord[]> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in to do this.");
  const ownerId = session.ownerId ?? session.userId;

  const [owner, rows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { id: true, name: true, email: true } }),
    prisma.teamMember.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } }),
  ]);

  return [ownerRecord(owner, session.userId), ...rows.map((row) => memberRecord(row, session.userId))];
}

const roleSchema = z.enum(["Administrator", "Accountant", "Manager", "Viewer"]);
const createTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: roleSchema,
});

export async function createTeamMember(formData: FormData): Promise<TeamMemberRecord> {
  const owner = await requireOwner();

  const parsed = createTeamMemberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  const existingCount = await prisma.teamMember.count({ where: { ownerId: owner.id, status: { not: "Suspended" } } });
  if (!canAddTeamMembers(existingCount + 1, toPlanName(owner.plan))) {
    // existingCount + 1 accounts for the owner's own seat, matching the UI's "users.length" check
    throw new Error("Your current plan doesn't allow more team members. Upgrade your plan to invite more people.");
  }

  const [existingUser, existingMember] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } }),
    prisma.teamMember.findUnique({ where: { email: parsed.email }, select: { id: true } }),
  ]);
  if (existingUser || existingMember) throw new Error("An account with this email already exists.");

  const placeholderHash = await bcrypt.hash(randomUUID(), 10);
  const passwordSetToken = randomBytes(32).toString("hex");
  const passwordSetExpiresAt = new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS);

  const created = await prisma.teamMember.create({
    data: { ownerId: owner.id, name: parsed.name, email: parsed.email, role: parsed.role, passwordHash: placeholderHash, passwordSetToken, passwordSetExpiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/set-password?token=${passwordSetToken}`;

  try {
    await sendMail({
      to: parsed.email,
      subject: `You've been invited to join ${owner.name} on AKCounting`,
      html: teamInviteEmailHtml({ name: parsed.name, link, businessName: owner.name, roleLabel: parsed.role }),
    });
  } catch (caught) {
    await prisma.teamMember.delete({ where: { id: created.id } });
    throw new Error(caught instanceof Error ? `Could not send the invite email: ${caught.message}` : "Could not send the invite email.");
  }

  revalidatePath("/users");
  return memberRecord(created, owner.id);
}

export async function resendTeamInvite(memberId: string): Promise<TeamMemberRecord> {
  const owner = await requireOwner();
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id: memberId } });
  if (member.ownerId !== owner.id) throw new Error("This team member does not belong to your workspace.");

  const passwordSetToken = randomBytes(32).toString("hex");
  const passwordSetExpiresAt = new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS);
  const updated = await prisma.teamMember.update({ where: { id: memberId }, data: { passwordSetToken, passwordSetExpiresAt, status: "Invited" } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/set-password?token=${passwordSetToken}`;
  await sendMail({
    to: member.email,
    subject: `Set your password to join ${owner.name} on AKCounting`,
    html: teamInviteEmailHtml({ name: member.name, link, businessName: owner.name, roleLabel: member.role, isResend: true }),
  });

  revalidatePath("/users");
  return memberRecord(updated, owner.id);
}

const updateTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name."),
  role: roleSchema,
  status: z.enum(["Active", "Invited", "Suspended"]),
});

export async function updateTeamMember(memberId: string, formData: FormData): Promise<TeamMemberRecord> {
  const owner = await requireOwner();
  const parsed = updateTeamMemberSchema.parse({
    name: formData.get("name"),
    role: formData.get("role"),
    status: formData.get("status"),
  });

  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id: memberId } });
  if (member.ownerId !== owner.id) throw new Error("This team member does not belong to your workspace.");

  const updated = await prisma.teamMember.update({ where: { id: memberId }, data: { name: parsed.name, role: parsed.role, status: parsed.status } });
  revalidatePath("/users");
  return memberRecord(updated, owner.id);
}

export async function removeTeamMember(memberId: string): Promise<void> {
  const owner = await requireOwner();
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id: memberId } });
  if (member.ownerId !== owner.id) throw new Error("This team member does not belong to your workspace.");
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/users");
}
