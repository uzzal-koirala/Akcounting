"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import type { CalendarPreference } from "@/lib/calendar";

export async function getCalendarPreference(): Promise<CalendarPreference> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarPreference: true } });
  return user?.calendarPreference === "BS" ? "BS" : "AD";
}

const preferenceSchema = z.enum(["AD", "BS"]);

export async function setCalendarPreference(preference: string) {
  const userId = await requireUserId();
  const parsed = preferenceSchema.parse(preference);
  await prisma.user.update({ where: { id: userId }, data: { calendarPreference: parsed } });
  revalidatePath("/", "layout");
}

export type BusinessCycle = { startDay: number; endDay: number };

export async function getBusinessCycle(): Promise<BusinessCycle> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { businessCycleStartDay: true, businessCycleEndDay: true } });
  return { startDay: user?.businessCycleStartDay ?? 1, endDay: user?.businessCycleEndDay ?? 31 };
}

const dayOfMonthSchema = z.coerce.number().int().min(1).max(31);

export async function setBusinessCycle(startDay: number, endDay: number) {
  const userId = await requireUserId();
  const parsedStart = dayOfMonthSchema.parse(startDay);
  const parsedEnd = dayOfMonthSchema.parse(endDay);
  await prisma.user.update({ where: { id: userId }, data: { businessCycleStartDay: parsedStart, businessCycleEndDay: parsedEnd } });
  revalidatePath("/settings");
}
