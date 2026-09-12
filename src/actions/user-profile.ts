"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

export type MyProfileRecord = {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl: string | null;
  businessName: string;
};

export async function getMyProfile(): Promise<MyProfileRecord> {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true, location: true, avatarUrl: true, businessProfile: { select: { tradingName: true, legalName: true } } },
  });
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    location: user.location,
    avatarUrl: user.avatarUrl,
    businessName: user.businessProfile?.tradingName || user.businessProfile?.legalName || "",
  };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
});

export async function updateMyProfile(formData: FormData): Promise<{ name: string; phone: string; location: string; businessName: string }> {
  const userId = await requireUserId();
  const parsed = profileSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    location: formData.get("location"),
  });
  const businessName = String(formData.get("businessName") ?? "").trim();

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: parsed }),
    prisma.businessProfile.upsert({
      where: { userId },
      update: { tradingName: businessName },
      create: { userId, tradingName: businessName, legalName: businessName },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ...parsed, businessName };
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function updateMyAvatar(formData: FormData): Promise<string> {
  const userId = await requireUserId();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose an image to upload.");
  if (!file.type.startsWith("image/")) throw new Error("Profile photo must be an image file.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Profile photo must be smaller than 2 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return avatarUrl;
}

export async function removeMyAvatar(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
