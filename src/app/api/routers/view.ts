/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Modified view router to create a new table when creating a view
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
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
        select: { id: true, baseId: true },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Get all views for this table's base (not just the table)
      return ctx.db.view.findMany({
        where: {
          table: {
            baseId: table.baseId,
          },
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

  // Create a new view - now also creates a new table
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
            const originalTable = await tx.table.findFirst({
              where: {
                id: input.tableId,
                base: {
                  ownerId: ctx.session.user.id,
                },
              },
              include: {
                base: {
                  select: {
                    id: true,
                  },
                },
                columns: true,
              },
            });

            if (!originalTable) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Table not found or you don't have access",
              });
            }

            // Create a new table for this view with the same structure as the original table
            const newTable = await tx.table.create({
              data: {
                name: `${input.name} Table`,
                base: { connect: { id: originalTable.base.id } },
                // Create columns matching the original table
                columns: {
                  create: originalTable.columns.map((column) => ({
                    name: column.name,
                    type: column.type,
                  })),
                },
              },
              include: {
                columns: true,
              },
            });

            // Create the view associated with the new table
            const view = await tx.view.create({
              data: {
                name: input.name,
                config: input.config || {},
                table: {
                  connect: { id: newTable.id },
                },
              },
            });

            // Generate some fake data for the new table (similar to createTable mutation)
            // Create initial rows in batch
            const rowPromises = [];
            for (let i = 0; i < 4; i++) {
              // Generate a set of fake data for this row
              const fakeData = {
                Name: faker.person.fullName(),
                Email: faker.internet.email(),
                Phone: faker.phone.number(),
                Notes: faker.lorem.sentence(),
              };

              // Create the row
              const rowPromise = tx.row
                .create({
                  data: {
                    table: { connect: { id: newTable.id } },
                  },
                })
                .then(async (row) => {
                  // Add cells for each column
                  const cellPromises = newTable.columns.map((column) => {
                    let value = "";
                    if (
                      column.name === "Name" ||
                      column.name.toLowerCase().includes("name")
                    ) {
                      value = fakeData.Name;
                    } else if (
                      column.name === "Email" ||
                      column.name.toLowerCase().includes("email")
                    ) {
                      value = fakeData.Email;
                    } else if (
                      column.name === "Phone" ||
                      column.name.toLowerCase().includes("phone")
                    ) {
                      value = fakeData.Phone;
                    } else if (
                      column.name === "Notes" ||
                      column.name.toLowerCase().includes("note")
                    ) {
                      value = fakeData.Notes;
                    } else if (column.type === "NUMBER") {
                      value = faker.number
                        .int({ min: 1, max: 1000 })
                        .toString();
                    } else {
                      // Default for TEXT type
                      value = faker.lorem.words(3);
                    }

                    return tx.cell.create({
                      data: {
                        columnId: column.id,
                        rowId: row.id,
                        value,
                      },
                    });
                  });

                  await Promise.all(cellPromises);
                  return row;
                });

              rowPromises.push(rowPromise);
            }

            // Wait for all rows to be created
            await Promise.all(rowPromises);

            // Return both the view and its associated table
            return {
              ...view,
              table: newTable,
            };
          },
          {
            timeout: 25000,
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
        select: { id: true, tableId: true, table: { select: { name: true } } },
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

        // Also update the associated table's name
        await ctx.db.table.update({
          where: { id: view.tableId },
          data: {
            name: `${input.name} Table`,
          },
        });
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
        select: { id: true, tableId: true },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have access",
        });
      }

      // Start a transaction to delete both the view and its associated table
      return ctx.db.$transaction(async (tx) => {
        // Delete the view first
        await tx.view.delete({
          where: { id: input.id },
        });

        // Then delete the associated table
        return tx.table.delete({
          where: { id: view.tableId },
        });
      });
    }),
});
