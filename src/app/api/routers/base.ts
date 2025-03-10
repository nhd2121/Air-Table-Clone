import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import { Base, Column, Table } from "@/type/db";

export const baseRouter = createTRPCRouter({
  // Get all bases for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.base.findMany({
      where: {
        ownerId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        tables: true,
      },
    });
  }),

  // Get a single base by ID
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

  // Create a new base with default tables and specific columns
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create a new base with a default table and specific columns
      const base = await ctx.db.base.create({
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
              // No rows created here
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

      // Now create 4 initial rows with faker data
      if (base.tables && base.tables.length > 0) {
        const table = base.tables[0];
        if (!table) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Table not found",
          });
        }

        // Create 4 rows
        for (let i = 0; i < 4; i++) {
          // First create a row
          const row = await ctx.db.row.create({
            data: {
              table: { connect: { id: table.id } },
            },
          });

          // Add cells with fake data for each column
          for (const column of table.columns) {
            let value = "";

            // Generate appropriate fake data based on column name
            if (column.name === "Name") {
              value = faker.person.fullName();
            } else if (column.name === "Email") {
              value = faker.internet.email();
            } else if (column.name === "Phone") {
              value = faker.phone.number();
            } else if (column.name === "Notes") {
              value = faker.lorem.sentence();
            }

            // Create the cell
            await ctx.db.cell.create({
              data: {
                columnId: column.id,
                rowId: row.id,
                value,
              },
            });
          }
        }
      }

      return base as Base & {
        tables: (Table & {
          columns: Column[];
        })[];
      };
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
