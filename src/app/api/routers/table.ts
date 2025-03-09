import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";

const ColumnTypeEnum = z.enum(["TEXT", "NUMBER"]);

export const tableRouter = createTRPCRouter({
  // Get all tables for a base
  getTablesForBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have access",
        });
      }

      return ctx.db.table.findMany({
        where: {
          baseId: input.baseId,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          columns: true,
        },
      });
    }),

  // Get all data for a table, including columns, rows, and cells
  getTableData: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the table belongs to a base owned by the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            ownerId: ctx.session.user.id,
          },
        },
        include: {
          columns: {
            orderBy: {
              createdAt: "asc",
            },
          },
          rows: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              cells: true,
            },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Transform data into a more convenient format for the frontend
      const formattedRows = table.rows.map((row) => {
        const rowData: Record<string, string> = { id: row.id };

        row.cells.forEach((cell) => {
          const column = table.columns.find((col) => col.id === cell.columnId);
          if (column) {
            rowData[column.id] = cell.value ?? "";
          }
        });

        return rowData;
      });

      return {
        table,
        columns: table.columns,
        rows: formattedRows,
      };
    }),

  // Create a new table in a base with specific columns and initial data
  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have access",
        });
      }

      // Create the table with specific column names
      const table = await ctx.db.table.create({
        data: {
          name: input.name,
          description: input.description,
          base: { connect: { id: input.baseId } },
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
        include: {
          columns: true,
        },
      });

      // Now create 4 initial rows with faker data
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

      return table;
    }),

  // Add a column to a table
  addColumn: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        type: ColumnTypeEnum.default("TEXT"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the table belongs to a base owned by the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            ownerId: ctx.session.user.id,
          },
        },
        include: {
          rows: true,
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Create the new column
      const column = await ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          table: { connect: { id: input.tableId } },
        },
      });

      // Generate faker data for the new column
      for (const row of table.rows) {
        let value = "";

        // Generate data based on column name first, then fall back to type
        if (input.name.toLowerCase().includes("name")) {
          value = faker.person.fullName();
        } else if (input.name.toLowerCase().includes("email")) {
          value = faker.internet.email();
        } else if (input.name.toLowerCase().includes("phone")) {
          value = faker.phone.number();
        } else if (input.name.toLowerCase().includes("note")) {
          value = faker.lorem.sentence();
        } else if (input.type === "NUMBER") {
          value = faker.number.int({ min: 1, max: 1000 }).toString();
        } else {
          // Default for TEXT type
          value = faker.lorem.words(3);
        }

        await ctx.db.cell.create({
          data: {
            columnId: column.id,
            rowId: row.id,
            value,
          },
        });
      }

      return column;
    }),

  // Update a cell value
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the cell belongs to a table in a base owned by the user
      const cell = await ctx.db.cell.findUnique({
        where: {
          columnId_rowId: {
            columnId: input.columnId,
            rowId: input.rowId,
          },
        },
        include: {
          row: {
            include: {
              table: {
                include: {
                  base: true,
                },
              },
            },
          },
        },
      });

      if (!cell || cell.row.table.base.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found or you don't have access",
        });
      }

      return ctx.db.cell.update({
        where: {
          columnId_rowId: {
            columnId: input.columnId,
            rowId: input.rowId,
          },
        },
        data: {
          value: input.value,
        },
      });
    }),

  // Add a new row to a table
  addRow: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the table belongs to a base owned by the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            ownerId: ctx.session.user.id,
          },
        },
        include: {
          columns: true,
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Create the new row
      const row = await ctx.db.row.create({
        data: {
          table: { connect: { id: input.tableId } },
        },
      });

      // Generate appropriate faker data for each column
      for (const column of table.columns) {
        let value = "";

        // Generate data based on column name first, then fall back to type
        if (column.name === "Name") {
          value = faker.person.fullName();
        } else if (column.name === "Email") {
          value = faker.internet.email();
        } else if (column.name === "Phone") {
          value = faker.phone.number();
        } else if (column.name === "Notes") {
          value = faker.lorem.sentence();
        } else if (column.type === "NUMBER") {
          value = faker.number.int({ min: 1, max: 1000 }).toString();
        } else {
          // Default for TEXT type
          value = faker.lorem.words(3);
        }

        await ctx.db.cell.create({
          data: {
            columnId: column.id,
            rowId: row.id,
            value,
          },
        });
      }

      // Return the row with cells included for better client-side caching
      return ctx.db.row.findUnique({
        where: { id: row.id },
        include: {
          cells: true,
        },
      });
    }),
});
