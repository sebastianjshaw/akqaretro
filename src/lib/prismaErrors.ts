import { Prisma } from "@prisma/client";

/**
 * Safe, short messages for clients when Prisma fails (no stack / internal details).
 */
export function publicMessageForPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database connection failed. Check that DATABASE_URL is set in deployment.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return "Cannot reach the database. Verify DATABASE_URL (Neon) and network access.";
      case "P1002":
      case "P1008":
        return "Database connection timed out. Try again; if it persists, check Neon and pooling settings.";
      case "P1017":
        return "Database connection closed. Retry or check serverless connection limits.";
      case "P2021":
        return "Database schema is out of date. Redeploy so migrations run, or run prisma migrate deploy.";
      case "P2002":
        return "A conflict occurred (duplicate). Try again.";
      default:
        return "Database error. Check deployment logs.";
    }
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "Database client error. Redeploy or contact support.";
  }
  return "Something went wrong. Check deployment configuration.";
}
