/**
 * Updated tRPC context with optimizations for production environments
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/auth";
import { db, withRetry } from "@/server/db";

/**
 * Context for tRPC requests with optimizations
 * Adds request timeouts and better error handling
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Get session with retry for production environments
  let session;
  if (process.env.NODE_ENV === "production") {
    session = await withRetry(() => auth(), 2, 500);
  } else {
    session = await auth();
  }

  // Create a custom headers object that we can modify
  const headers = new Headers(opts.headers);

  // Set a default request timeout
  if (!headers.has("request-timeout")) {
    headers.set("request-timeout", "15000"); // 15 seconds default timeout
  }

  return {
    db,
    session,
    headers,
  };
};

/**
 * Initialize tRPC with optimized settings
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Log critical errors in production for monitoring
    if (
      process.env.NODE_ENV === "production" &&
      (error.code === "INTERNAL_SERVER_ERROR" || error.code === "TIMEOUT")
    ) {
      console.error(`[TRPC ERROR] ${error.code}: ${error.message}`, error);
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Create new routers
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing with production optimizations
 */
const timingMiddleware = t.middleware(async ({ path, next, ctx }) => {
  const start = Date.now();

  // Get request timeout from headers or use default
  const timeoutStr = ctx.headers.get("request-timeout");
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 15000;

  try {
    // Create a promise that resolves after the timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new TRPCError({
            code: "TIMEOUT",
            message: `Request timed out after ${timeout}ms`,
          }),
        );
      }, timeout);
    });

    // Race the operation against the timeout
    const result = await Promise.race([next(), timeoutPromise]);

    const end = Date.now();
    const duration = end - start;

    // Only log slow operations in production to reduce log volume
    if (process.env.NODE_ENV === "production" && duration > 1000) {
      console.warn(
        `[TRPC] Slow operation detected: ${path} took ${duration}ms`,
      );
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`[TRPC] ${path} took ${duration}ms to execute`);
    }

    return result;
  } catch (error) {
    // Enhance error with timing information
    const end = Date.now();
    const duration = end - start;

    if (error instanceof TRPCError) {
      console.error(
        `[TRPC] Error in ${path} after ${duration}ms: ${error.code}`,
      );
      throw error;
    }

    console.error(
      `[TRPC] Unknown error in ${path} after ${duration}ms:`,
      error,
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      cause: error,
    });
  }
});

/**
 * Public procedure with improved timing middleware
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure with better error handling
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action",
      });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
