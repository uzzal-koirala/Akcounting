import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaWithProducts?: PrismaClient };

// Use a versioned development singleton whenever the generated client gains new
// models. Turbopack otherwise keeps the older global instance alive across hot
// reloads, leaving newly generated delegates (such as `product`) undefined.
export const prisma = globalForPrisma.prismaWithProducts ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaWithProducts = prisma;
