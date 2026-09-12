"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/require-user";

const DEFAULT_CATEGORIES = ["Software", "Operations", "Marketing", "Payroll", "Facilities", "Other"];

export type ExpenseCategoryRecord = { id: string; name: string };

export async function listExpenseCategories(): Promise<ExpenseCategoryRecord[]> {
  const userId = await requireUserId();
  const existing = await prisma.expenseCategory.findMany({ where: { userId }, orderBy: { name: "asc" } });
  if (existing.length > 0) return existing.map((row) => ({ id: row.id, name: row.name }));

  await prisma.expenseCategory.createMany({ data: DEFAULT_CATEGORIES.map((name) => ({ userId, name })), skipDuplicates: true });
  const seeded = await prisma.expenseCategory.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return seeded.map((row) => ({ id: row.id, name: row.name }));
}

const nameSchema = z.string().trim().min(1, "Enter a category name.").max(40, "Category name is too long.");

export async function createExpenseCategory(name: string): Promise<ExpenseCategoryRecord> {
  const userId = await requireUserId();
  const parsed = nameSchema.parse(name);
  const category = await prisma.expenseCategory.upsert({
    where: { userId_name: { userId, name: parsed } },
    update: {},
    create: { userId, name: parsed },
  });
  revalidatePath("/expenses");
  return { id: category.id, name: category.name };
}

export async function deleteExpenseCategory(id: string) {
  const userId = await requireUserId();
  await prisma.expenseCategory.deleteMany({ where: { id, userId } });
  revalidatePath("/expenses");
}
