"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS } from "@/lib/payment-methods";

export type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  category: string;
  type: "Product" | "Service";
  description: string;
  unit: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status: "Active" | "Inactive";
  createdAt: string;
};

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name."),
  sku: z.string().trim().min(2, "Enter a SKU."),
  category: z.string().trim().min(2, "Enter a category."),
  type: z.enum(["Product", "Service"]),
  description: z.string().trim().max(1000).optional().default(""),
  unit: z.string().trim().min(1),
  sellingPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  reorderLevel: z.coerce.number().int().min(0),
  status: z.enum(["Active", "Inactive"]),
});

function toRecord(row: { id: string; name: string; sku: string; category: string; type: string; description: string; unit: string; sellingPrice: unknown; costPrice: unknown; stock: number; reorderLevel: number; status: string; createdAt: Date }): ProductRecord {
  return { id: row.id, name: row.name, sku: row.sku, category: row.category, type: row.type === "Service" ? "Service" : "Product", description: row.description, unit: row.unit, sellingPrice: Number(row.sellingPrice), costPrice: Number(row.costPrice), stock: row.stock, reorderLevel: row.reorderLevel, status: row.status === "Inactive" ? "Inactive" : "Active", createdAt: row.createdAt.toISOString() };
}

function parseProduct(formData: FormData) {
  return productSchema.parse({ name: formData.get("name"), sku: formData.get("sku"), category: formData.get("category"), type: formData.get("type"), description: formData.get("description"), unit: formData.get("unit"), sellingPrice: formData.get("sellingPrice"), costPrice: formData.get("costPrice"), stock: formData.get("stock"), reorderLevel: formData.get("reorderLevel"), status: formData.get("status") });
}

export async function listProducts(): Promise<ProductRecord[]> {
  const userId = await requireUserId();
  const rows = await prisma.product.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

export async function createProduct(formData: FormData): Promise<ProductRecord> {
  const userId = await requireUserId();
  const data = parseProduct(formData);
  const created = await prisma.product.create({ data: { userId, ...data } });
  revalidatePath("/products");
  return toRecord(created);
}

export async function updateProduct(id: string, formData: FormData): Promise<ProductRecord> {
  const userId = await requireUserId();
  const data = parseProduct(formData);
  const existing = await prisma.product.findFirstOrThrow({ where: { id, userId } });
  const updated = await prisma.product.update({ where: { id: existing.id }, data });
  revalidatePath("/products");
  return toRecord(updated);
}

export async function deleteProduct(id: string) {
  const userId = await requireUserId();
  await prisma.product.deleteMany({ where: { id, userId } });
  revalidatePath("/products");
}

const sellSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().trim().min(1, "Enter a customer name."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  discount: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Select a payment method." }),
  status: z.enum(["Received", "Pending"]),
});

export async function sellProduct(formData: FormData): Promise<{ product: ProductRecord; amount: number }> {
  const userId = await requireUserId();
  const parsed = sellSchema.parse({
    productId: formData.get("productId"),
    customerName: formData.get("customerName"),
    quantity: formData.get("quantity"),
    discount: formData.get("discount") || 0,
    paymentMethod: formData.get("paymentMethod"),
    status: formData.get("status"),
  });

  const product = await prisma.product.findFirstOrThrow({ where: { id: parsed.productId, userId } });
  const subtotal = Number(product.sellingPrice) * parsed.quantity;
  const amount = Math.max(0, subtotal - parsed.discount);

  const [, updatedProduct] = await prisma.$transaction([
    prisma.income.create({ data: { userId, client: parsed.customerName, description: parsed.paymentMethod, source: product.name, amount, status: parsed.status, date: new Date() } }),
    prisma.product.update({ where: { id: product.id }, data: product.type === "Service" ? {} : { stock: Math.max(0, product.stock - parsed.quantity) } }),
  ]);

  revalidatePath("/products");
  revalidatePath("/income");
  return { product: toRecord(updatedProduct), amount };
}
