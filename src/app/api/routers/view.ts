import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Define the ViewConfig schema for validation
const ViewConfigSchema = z.object({
  filters: z.record(z.any()).optional(),
  sorts: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .optional(),
  hiddenColumns: z.array(z.string()).optional(),
});

export const viewRouter = createTRPCRouter({
  // Get all views for a table
  getViewsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to the table
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            ownerId: ctx.session.user.id,
          },
        },
        select: { id: true },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Get all views for this table
      return ctx.db.view.findMany({
        where: {
          tableId: input.tableId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  // Get a specific view
  getView: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to the view
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          table: {
            base: {
              ownerId: ctx.session.user.id,
            },
          },
        },
        include: {
          table: {
            select: {
              id: true,
              name: true,
              baseId: true,
            },
          },
        },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      return view;
    }),

  // Create a new view
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        config: ViewConfigSchema.optional().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the table
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            ownerId: ctx.session.user.id,
          },
        },
        select: { id: true },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Check if a view with the same name already exists for this table
      const existingView = await ctx.db.view.findFirst({
        where: {
          tableId: input.tableId,
          name: input.name,
        },
      });

      if (existingView) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A view with this name already exists",
        });
      }

      // Create the view
      return ctx.db.view.create({
        data: {
          name: input.name,
          config: input.config || {},
          table: {
            connect: { id: input.tableId },
          },
        },
      });
    }),

  // Update a view
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        config: ViewConfigSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the view
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          table: {
            base: {
              ownerId: ctx.session.user.id,
            },
          },
        },
        select: { id: true, tableId: true },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      // Check for name uniqueness if name is being updated
      if (input.name) {
        const existingView = await ctx.db.view.findFirst({
          where: {
            tableId: view.tableId,
            name: input.name,
            id: { not: input.id }, // Exclude the current view
          },
        });

        if (existingView) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A view with this name already exists",
          });
        }
      }

      // Update the view
      return ctx.db.view.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.config && { config: input.config }),
        },
      });
    }),

  // Delete a view
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the view
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          table: {
            base: {
              ownerId: ctx.session.user.id,
            },
          },
        },
        select: { id: true },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      // Delete the view
      return ctx.db.view.delete({
        where: { id: input.id },
      });
    }),
});
