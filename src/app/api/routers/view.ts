/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Modified view router to create a new table when creating a view
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

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

      // Get views specifically for this table only, not the entire base
      return ctx.db.view.findMany({
        where: {
          tableId: input.tableId,
        },
        include: {
          table: {
            select: {
              id: true,
              name: true,
            },
          },
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

  // Create a new view - FIXED to associate with existing table
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        config: ViewConfigSchema.optional().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Extend timeout for this operation
      ctx.headers.set("request-timeout", "30000");

      try {
        // Use a transaction to ensure all operations complete together
        return await ctx.db.$transaction(
          async (tx) => {
            // Verify user has access to the table
            const table = await tx.table.findFirst({
              where: {
                id: input.tableId,
                base: {
                  ownerId: ctx.session.user.id,
                },
              },
              select: {
                id: true,
                name: true,
                baseId: true,
                columns: true,
              },
            });

            if (!table) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Table not found or you don't have access",
              });
            }

            // Create the view associated with the EXISTING table
            const view = await tx.view.create({
              data: {
                name: input.name,
                config: input.config || {},
                table: {
                  connect: { id: table.id },
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

            // Return the view with its table information
            return view;
          },
          {
            timeout: 25000,
            maxWait: 5000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error creating view:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create view. Please try again.",
          cause: error,
        });
      }
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
        select: { id: true },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      const updateData: any = {};

      if (input.name) {
        updateData.name = input.name;
      }

      if (input.config) {
        updateData.config = input.config;
      }

      // Update the view
      return ctx.db.view.update({
        where: { id: input.id },
        data: updateData,
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
