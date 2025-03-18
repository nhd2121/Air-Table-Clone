/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ColumnType } from "@prisma/client";
import { nanoid } from "nanoid";
import { faker } from "@faker-js/faker";

// Schema validations
const getTableSchema = z.object({
  viewId: z.string(),
});

const addColumnSchema = z.object({
  tableId: z.string(),
  name: z.string().min(1).max(255),
  type: z.enum([ColumnType.TEXT, ColumnType.NUMBER]),
  position: z.number().optional(),
});

const updateCellSchema = z.object({
  columnId: z.string(),
  rowId: z.string(),
  value: z.string().nullable(),
});

const addRowSchema = z.object({
  tableId: z.string(),
  position: z.number().optional(),
});

const addMultipleRowsSchema = z.object({
  tableId: z.string(),
  count: z.number().min(1).max(100),
  startPosition: z.number().optional(),
});

const generateFakeCells = (
  columns: { id: string; type: ColumnType; name: string }[],
  rowIds: string[],
) => {
  const cells = [];

  const statusOptions = ["In Progress", "Done", "In Review"];

  for (const rowId of rowIds) {
    for (const column of columns) {
      let value;

      // Generate appropriate fake data based on column name and type
      if (column.type === ColumnType.NUMBER) {
        if (column.name.toLowerCase().includes("priority")) {
          value = faker.number.int({ min: 1, max: 5 }).toString();
        } else if (
          column.name.toLowerCase().includes("price") ||
          column.name.toLowerCase().includes("cost")
        ) {
          value = faker.commerce.price({ min: 10, max: 1000 }).toString();
        } else if (column.name.toLowerCase().includes("age")) {
          value = faker.number.int({ min: 18, max: 65 }).toString();
        } else {
          value = faker.number.int({ min: 1, max: 100 }).toString();
        }
      } else {
        // TEXT type
        if (column.name.toLowerCase().includes("title")) {
          value = faker.lorem.sentence({ min: 2, max: 5 });
        } else if (column.name.toLowerCase().includes("name")) {
          value = faker.person.fullName();
        } else if (column.name.toLowerCase().includes("email")) {
          value = faker.internet.email();
        } else if (column.name.toLowerCase().includes("phone")) {
          value = faker.phone.number();
        } else if (column.name.toLowerCase().includes("address")) {
          value = faker.location.streetAddress();
        } else if (column.name.toLowerCase().includes("company")) {
          value = faker.company.name();
        } else if (column.name.toLowerCase().includes("status")) {
          value =
            statusOptions[Math.floor(Math.random() * statusOptions.length)];
        } else if (column.name.toLowerCase().includes("description")) {
          value = faker.lorem.paragraph();
        } else if (column.name.toLowerCase().includes("date")) {
          value = faker.date.recent().toISOString().split("T")[0];
        } else {
          value = faker.lorem.words({ min: 1, max: 3 });
        }
      }

      cells.push({
        rowId,
        columnId: column.id,
        value,
      });
    }
  }

  return cells;
};

export const tableRouter = createTRPCRouter({
  // Get table data for a specific view
  getTableForView: protectedProcedure
    .input(getTableSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // First check if the view belongs to the user
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tab: {
            base: {
              ownerId: userId,
            },
          },
        },
        select: {
          tableId: true,
        },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have permission to access it",
        });
      }

      // Get the table data with all columns, rows, and cells
      const table = await ctx.db.table.findUnique({
        where: {
          id: view.tableId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isViewLinked: true,
          createdAt: true,
          updatedAt: true,
          columns: {
            select: {
              id: true,
              name: true,
              type: true,
              position: true,
            },
            orderBy: {
              position: "asc",
            },
          },
          rows: {
            select: {
              id: true,
              position: true,
              cells: {
                select: {
                  columnId: true,
                  value: true,
                },
              },
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found",
        });
      }

      // Transform the data into a more convenient format for the frontend
      const formattedRows = table.rows.map((row) => {
        const cells = {};
        row.cells.forEach((cell) => {
          cells[cell.columnId] = cell.value;
        });

        return {
          id: row.id,
          position: row.position,
          cells,
        };
      });

      return {
        ...table,
        formattedRows,
      };
    }),

  // Add a new column to a table
  addColumn: protectedProcedure
    .input(addColumnSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the table belongs to the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          views: {
            some: {
              tab: {
                base: {
                  ownerId: userId,
                },
              },
            },
          },
        },
        include: {
          rows: true,
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have permission to modify it",
        });
      }

      // Get the highest position if not provided
      let position = input.position;
      if (position === undefined) {
        const highestColumn = await ctx.db.column.findFirst({
          where: {
            tableId: input.tableId,
          },
          orderBy: {
            position: "desc",
          },
          select: {
            position: true,
          },
        });

        position = highestColumn ? highestColumn.position + 1 : 0;
      }

      // Use a transaction to create the column and cells for all existing rows
      return await ctx.db.$transaction(async (prisma) => {
        // Create the new column
        const column = await prisma.column.create({
          data: {
            name: input.name,
            type: input.type,
            position,
            tableId: input.tableId,
          },
        });

        // Create cells for all existing rows
        if (table.rows.length > 0) {
          const rowIds = table.rows.map((row) => row.id);
          const cellData = generateFakeCells(
            [{ id: column.id, type: column.type, name: column.name }],
            rowIds,
          );

          await Promise.all(
            cellData.map((cell) =>
              prisma.cell.create({
                data: cell,
              }),
            ),
          );
        }

        return column;
      });
    }),

  // Update a cell value
  updateCell: protectedProcedure
    .input(updateCellSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the cell belongs to the user
      const cell = await ctx.db.cell.findFirst({
        where: {
          columnId: input.columnId,
          rowId: input.rowId,
          column: {
            table: {
              views: {
                some: {
                  tab: {
                    base: {
                      ownerId: userId,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!cell) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found or you don't have permission to update it",
        });
      }

      // Update the cell value
      const updatedCell = await ctx.db.cell.update({
        where: {
          columnId_rowId: {
            columnId: input.columnId,
            rowId: input.rowId,
          },
        },
        data: {
          value: input.value,
          updatedAt: new Date(),
        },
      });

      return updatedCell;
    }),

  // Add a single row to a table
  addRow: protectedProcedure
    .input(addRowSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the table belongs to the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          views: {
            some: {
              tab: {
                base: {
                  ownerId: userId,
                },
              },
            },
          },
        },
        include: {
          columns: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have permission to modify it",
        });
      }

      // Get the highest position if not provided
      let position = input.position;
      if (position === undefined) {
        const highestRow = await ctx.db.row.findFirst({
          where: {
            tableId: input.tableId,
          },
          orderBy: {
            position: "desc",
          },
          select: {
            position: true,
          },
        });

        position = highestRow ? highestRow.position + 1 : 0;
      }

      // Use a transaction to create the row and its cells
      return await ctx.db.$transaction(async (prisma) => {
        // Create the new row
        const rowId = nanoid();
        const row = await prisma.row.create({
          data: {
            id: rowId,
            position,
            tableId: input.tableId,
          },
        });

        // Create cells for the new row with fake data
        if (table.columns.length > 0) {
          const cellData = generateFakeCells(table.columns, [rowId]);

          await Promise.all(
            cellData.map((cell) =>
              prisma.cell.create({
                data: cell,
              }),
            ),
          );
        }

        // Return the row with its cells
        const completeRow = await prisma.row.findUnique({
          where: {
            id: row.id,
          },
          include: {
            cells: {
              select: {
                columnId: true,
                value: true,
              },
            },
          },
        });

        // Format the cells as an object for easier frontend consumption
        const formattedCells = {};
        completeRow?.cells.forEach((cell) => {
          formattedCells[cell.columnId] = cell.value;
        });

        return {
          id: row.id,
          position: row.position,
          cells: formattedCells,
        };
      });
    }),

  // Add multiple rows to a table
  addMultipleRows: protectedProcedure
    .input(addMultipleRowsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the table belongs to the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          views: {
            some: {
              tab: {
                base: {
                  ownerId: userId,
                },
              },
            },
          },
        },
        include: {
          columns: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have permission to modify it",
        });
      }

      // Get the starting position if not provided
      let startPosition = input.startPosition;
      if (startPosition === undefined) {
        const highestRow = await ctx.db.row.findFirst({
          where: {
            tableId: input.tableId,
          },
          orderBy: {
            position: "desc",
          },
          select: {
            position: true,
          },
        });

        startPosition = highestRow ? highestRow.position + 1 : 0;
      }

      // Use a transaction to create multiple rows and their cells
      return await ctx.db.$transaction(async (prisma) => {
        const createdRows = [];
        const rowIds = [];

        // Create the new rows
        for (let i = 0; i < input.count; i++) {
          const rowId = nanoid();
          rowIds.push(rowId);

          const row = await prisma.row.create({
            data: {
              id: rowId,
              position: startPosition + i,
              tableId: input.tableId,
            },
          });

          createdRows.push(row);
        }

        // Create cells for all the new rows with fake data
        if (table.columns.length > 0) {
          const cellData = generateFakeCells(table.columns, rowIds);

          await Promise.all(
            cellData.map((cell) =>
              prisma.cell.create({
                data: cell,
              }),
            ),
          );
        }

        return {
          count: createdRows.length,
          rows: createdRows.map((row) => ({
            id: row.id,
            position: row.position,
          })),
        };
      });
    }),
});
