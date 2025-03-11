import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

/**
 * Connection configuration based on environment
 */
const connectionConfig = {
  // Development - simpler settings
  development: {
    log: ["query", "error", "warn"],
  },
  // Production - optimized settings
  production: {
    log: ["error"],
  },
};

// Select configuration based on environment
const config =
  env.NODE_ENV === "production"
    ? connectionConfig.production
    : connectionConfig.development;

/**
 * Create a new Prisma client with optimized settings
 */
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: config.log,
    // Prisma Client doesn't support connectionLimit as a direct option
    // We can only configure what's supported by the client
  });

  // Add connection event handlers in production
  if (env.NODE_ENV === "production") {
    client.$on("query", (e) => {
      // Only log slow queries (over 1000ms)
      if (e.duration >= 1000) {
        console.warn(`Slow query detected (${e.duration}ms): ${e.query}`);
      }
    });

    client.$on("error", (e) => {
      console.error("Prisma Client error:", e);
    });
  }

  return client;
};

// Use global reference pattern to avoid multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Create or reuse the Prisma client
export const db = globalForPrisma.prisma ?? createPrismaClient();

// In development, store the client instance in global to prevent multiple instances
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Export a function to explicitly close the database connection
// This is useful for serverless environments like Vercel
export const disconnectDb = async () => {
  try {
    await db.$disconnect();
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};

// Helper function to execute queries with retry logic for production
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 300,
): Promise<T> => {
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Only retry on connection errors, not on business logic errors
      if (
        error instanceof Error &&
        (error.message.includes("connection") ||
          error.message.includes("timeout") ||
          error.message.includes("network") ||
          error.message.includes("ECONNRESET"))
      ) {
        retries++;
        // Exponential backoff: 300ms, 600ms, 1200ms, etc.
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(
          `Database operation failed, retrying (${retries}/${maxRetries}) after ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Don't retry business logic errors
        throw error;
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError ?? new Error("Unknown error occurred");
};
