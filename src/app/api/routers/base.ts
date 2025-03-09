import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";

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

  // Create a new base with default tables and random column names
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate random column names using faker
      const generateRandomColumns = () => {
        const columnTypes = [
          "TEXT",
          "NUMBER",
          "DATE",
          "BOOLEAN",
          "SELECT",
        ] as const;
        return [
          { name: faker.database.column(), type: "TEXT" as const },
          { name: faker.database.column(), type: "TEXT" as const },
          { name: faker.database.column(), type: "TEXT" as const },
          { name: faker.database.column(), type: "TEXT" as const },
        ];
      };

      const randomColumns = generateRandomColumns();

      // Create a new base with a default table and random columns
      const base = await ctx.db.base.create({
        data: {
          name: input.name,
          description: input.description,
          owner: { connect: { id: ctx.session.user.id } },
          tables: {
            create: {
              name: "Table 1",
              columns: {
                create: randomColumns,
              },
              rows: {
                create: Array(10).fill({}), // Create 10 empty rows
              },
            },
          },
        },
        include: {
          tables: {
            include: {
              columns: true,
              rows: true,
            },
          },
        },
      });

      // Create cells for each row and column
      for (const table of base.tables) {
        for (const row of table.rows) {
          for (const column of table.columns) {
            await ctx.db.cell.create({
              data: {
                columnId: column.id,
                rowId: row.id,
                value: "",
              },
            });
          }
        }
      }

      return base;
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
