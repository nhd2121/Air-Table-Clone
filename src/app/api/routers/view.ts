/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Modified view router to create a new table when creating a view
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { faker } from "@faker-js/faker";

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

  // Create a new view with a new table - UPDATED LOGIC
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
            const sourceTable = await tx.table.findFirst({
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

            if (!sourceTable) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Table not found or you don't have access",
              });
            }

            // Generate a unique suffix for the new table name
            const viewSuffix = input.name
              .replace(/[^a-zA-Z0-9]/g, "")
              .substring(0, 5);
            const newTableName = `${sourceTable.name}_View_${viewSuffix}`;

            // 1. Create a new table with similar structure as the source table
            const newTable = await tx.table.create({
              data: {
                name: newTableName,
                description: `Generated table for view: ${input.name}`,
                base: { connect: { id: sourceTable.baseId } },
                // Add a flag to indicate this is a view-linked table
                isViewLinked: true,
                // Copy columns from source table
                columns: {
                  create: sourceTable.columns.map((column) => ({
                    name: column.name,
                    type: column.type,
                  })),
                },
              },
              include: {
                columns: true,
              },
            });

            // 2. Create rows with fake data for the new table
            // Generate 5 rows of fake data
            for (let i = 0; i < 5; i++) {
              // Create a row
              const row = await tx.row.create({
                data: {
                  table: { connect: { id: newTable.id } },
                },
              });

              // Create cells for each column
              for (const column of newTable.columns) {
                let value = "";

                // Generate appropriate data based on column name or type
                if (column.name.toLowerCase().includes("name")) {
                  value = faker.person.fullName();
                } else if (column.name.toLowerCase().includes("email")) {
                  value = faker.internet.email();
                } else if (column.name.toLowerCase().includes("phone")) {
                  value = faker.phone.number();
                } else if (
                  column.name.toLowerCase().includes("note") ||
                  column.name.toLowerCase().includes("notes")
                ) {
                  value = faker.lorem.sentence();
                } else if (column.type === "NUMBER") {
                  value = faker.number.int({ min: 1, max: 1000 }).toString();
                } else {
                  value = faker.lorem.words(3);
                }

                await tx.cell.create({
                  data: {
                    columnId: column.id,
                    rowId: row.id,
                    value,
                  },
                });
              }
            }

            // 3. Create a view that links to the original table, but stores reference to the new table in config
            const view = await tx.view.create({
              data: {
                name: input.name,
                config: {
                  ...(input.config || {}),
                  linkedTableId: newTable.id, // Store the linked table ID in the config
                },
                table: {
                  connect: { id: sourceTable.id }, // Still connect to original table
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

            // Return the view with its linked table information
            return {
              ...view,
              linkedTable: newTable,
            };
          },
          {
            timeout: 30000,
            maxWait: 5000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error creating view with table:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create view with table. Please try again.",
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
        select: { id: true, config: true },
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
        // Make sure we preserve the linkedTableId when updating config
        const currentConfig = view.config as Record<string, any>;
        updateData.config = {
          ...input.config,
          linkedTableId: currentConfig.linkedTableId,
        };
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
      // Verify user has access to the view and get the linked table ID
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          table: {
            base: {
              ownerId: ctx.session.user.id,
            },
          },
        },
        select: { id: true, config: true },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      try {
        return await ctx.db.$transaction(async (tx) => {
          // First delete the view
          await tx.view.delete({
            where: { id: input.id },
          });

          // Then attempt to delete the linked table if it exists
          const config = view.config as Record<string, any>;
          if (config && config.linkedTableId) {
            // Check if there are other views linking to this table
            const otherViews = await tx.view.findMany({
              where: {
                config: {
                  path: ["linkedTableId"],
                  equals: config.linkedTableId,
                },
                id: { not: input.id }, // Exclude the view we're deleting
              },
            });

            // Only delete the table if no other views are using it
            if (otherViews.length === 0) {
              await tx.table.delete({
                where: { id: config.linkedTableId },
              });
            }
          }

          return { success: true };
        });
      } catch (error) {
        console.error("Error deleting view and linked table:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete view and linked table",
          cause: error,
        });
      }
    }),
});
