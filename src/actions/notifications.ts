"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";

export type NotifType = "Info" | "Success" | "Warning" | "Urgent";
export type Audience = "All" | "Starter Package" | "Growth Package" | "Premium Package";

export type AdminNotification = { id: string; title: string; message: string; type: NotifType; audience: Audience; recipients: number; time: string; createdAtISO: string };
export type UserNotification = { id: string; title: string; message: string; type: NotifType; time: string; unread: boolean; createdAtISO: string };

const createSchema = z.object({
  title: z.string().trim().min(1, "Give the notification a title.").max(140),
  message: z.string().trim().min(1, "Write a message.").max(2000),
  type: z.enum(["Info", "Success", "Warning", "Urgent"]),
  audience: z.enum(["All", "Starter Package", "Growth Package", "Premium Package"]),
});

const relativeTime = (date: Date) => {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

async function requireAdminId() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Only admins can do this.");
  return session.userId;
}

export async function createNotification(formData: FormData) {
  await requireAdminId();
  const parsed = createSchema.parse({
    title: formData.get("title"),
    message: formData.get("message"),
    type: formData.get("type"),
    audience: formData.get("audience"),
  });
  await prisma.notification.create({ data: parsed });
  revalidatePath("/super-admin/announcements");
  revalidatePath("/notifications");
}

export async function listNotificationsAdmin(): Promise<AdminNotification[]> {
  await requireAdminId();
  const [notifications, planCounts] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
  ]);
  const totalUsers = await prisma.user.count();
  const countFor = (audience: Audience) => audience === "All" ? totalUsers : planCounts.find((row) => row.plan === audience)?._count.plan ?? 0;

  return notifications.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type as NotifType,
    audience: row.audience as Audience,
    recipients: countFor(row.audience as Audience),
    time: relativeTime(row.createdAt),
    createdAtISO: row.createdAt.toISOString(),
  }));
}

export async function listNotificationsForUser(): Promise<UserNotification[]> {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ audience: "All" }, { audience: user.plan }] },
    orderBy: { createdAt: "desc" },
    include: { reads: { where: { userId } } },
  });

  return notifications
    .filter((row) => !row.reads[0]?.dismissed)
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type as NotifType,
      time: relativeTime(row.createdAt),
      unread: !row.reads[0]?.read,
      createdAtISO: row.createdAt.toISOString(),
    }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ audience: "All" }, { audience: user.plan }] },
    select: { id: true, reads: { where: { userId }, select: { read: true, dismissed: true } } },
  });
  return notifications.filter((row) => !row.reads[0]?.dismissed && !row.reads[0]?.read).length;
}

export async function markNotificationRead(notificationId: string, read = true) {
  const userId = await requireUserId();
  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    update: { read },
    create: { notificationId, userId, read },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const notifications = await prisma.notification.findMany({ where: { OR: [{ audience: "All" }, { audience: user.plan }] }, select: { id: true } });
  await prisma.$transaction(notifications.map((row) => prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId: row.id, userId } },
    update: { read: true },
    create: { notificationId: row.id, userId, read: true },
  })));
  revalidatePath("/notifications");
}

export async function dismissNotification(notificationId: string) {
  const userId = await requireUserId();
  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    update: { dismissed: true, read: true },
    create: { notificationId, userId, dismissed: true, read: true },
  });
  revalidatePath("/notifications");
}
