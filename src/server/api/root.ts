import { baseRouter } from "@/app/api/routers/base";
import { tabRouter } from "@/app/api/routers/tab";
import { tableRouter } from "@/app/api/routers/table";
import { viewRouter } from "@/app/api/routers/view";
import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  base: baseRouter,
  table: tableRouter,
  view: viewRouter,
  tab: tabRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
