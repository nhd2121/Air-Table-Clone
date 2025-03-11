import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import type { Base, Column, Table } from "@/type/db";
import { Prisma } from "@prisma/client";

export const baseRouter = createTRPCRouter({
  // Get all bases for the current user - optimized query
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.base.findMany({
      where: {
        ownerId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      // Only select what we need for the list view
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tables: true,
          },
        },
      },
    });
  }),

  // Get a single base by ID - optimized to fetch just what's needed
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: ctx.session.user.id,
        },
        include: {
          tables: {
            include: {
              columns: true,
            },
          },
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have access",
        });
      }

      return base;
    }),

  // Create a new base with improved error handling and transaction
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Add a timeout extension for this operation
      ctx.headers.set("request-timeout", "30000"); // 30 seconds

      try {
        // Use a transaction to ensure all operations succeed or fail together
        return await ctx.db.$transaction(
          async (tx) => {
            // Create the base with initial table structure
            const base = await tx.base.create({
              data: {
                name: input.name,
                description: input.description,
                owner: { connect: { id: ctx.session.user.id } },
                tables: {
                  create: {
                    name: "Table 1",
                    columns: {
                      create: [
                        { name: "Name", type: "TEXT" },
                        { name: "Email", type: "TEXT" },
                        { name: "Phone", type: "TEXT" },
                        { name: "Notes", type: "TEXT" },
                      ],
                    },
                  },
                },
              },
              include: {
                tables: {
                  include: {
                    columns: true,
                  },
                },
              },
            });

            // Early return with just the base if no tables were created
            if (!base.tables || base.tables.length === 0) {
              return base as Base & {
                tables: (Table & {
                  columns: Column[];
                })[];
              };
            }

            const table = base.tables[0];
            if (!table) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Table not found in the newly created base.",
              });
            }

            // Prepare all row and cell creation operations for a batch insert
            const rowsToCreate = [];

            // Create 4 rows with pre-generated data
            for (let i = 0; i < 4; i++) {
              // Generate fake data for each column upfront
              const fakeData = {
                Name: faker.person.fullName(),
                Email: faker.internet.email(),
                Phone: faker.phone.number(),
                Notes: faker.lorem.sentence(),
              };

              // Create the row
              const row = await tx.row.create({
                data: {
                  table: { connect: { id: table.id } },
                },
              });

              // Prepare cell creation for each column
              for (const column of table.columns) {
                // Get appropriate fake data based on column name
                let value = "";
                if (column.name === "Name") value = fakeData.Name;
                else if (column.name === "Email") value = fakeData.Email;
                else if (column.name === "Phone") value = fakeData.Phone;
                else if (column.name === "Notes") value = fakeData.Notes;

                // Create the cell
                await tx.cell.create({
                  data: {
                    columnId: column.id,
                    rowId: row.id,
                    value,
                  },
                });
              }
            }

            return base as Base & {
              tables: (Table & {
                columns: Column[];
              })[];
            };
          },
          {
            // Transaction options
            timeout: 25000, // 25 seconds timeout
            maxWait: 5000, // Maximum wait time for acquiring connection
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // Less restrictive isolation level for better performance
          },
        );
      } catch (error) {
        console.error("Error creating base:", error);

        // If it's a timeout error, provide a clearer message
        if (
          error instanceof Error &&
          (error.message.includes("timeout") ||
            error.message.includes("exceed") ||
            error.message.includes("timed out"))
        ) {
          throw new TRPCError({
            code: "TIMEOUT",
            message:
              "Database operation timed out, but your workspace might have been created. Please check your workspace list.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workspace. Please try again.",
          cause: error,
        });
      }
    }),

  // Update a base
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First, verify the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: ctx.session.user.id,
        },
        select: { id: true }, // Only select the ID to optimize the query
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have access",
        });
      }

      return ctx.db.base.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),

  // Delete a base
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First, verify the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: ctx.session.user.id,
        },
        select: { id: true }, // Only select the ID to optimize the query
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have access",
        });
      }

      return ctx.db.base.delete({
        where: { id: input.id },
      });
    }),
});
