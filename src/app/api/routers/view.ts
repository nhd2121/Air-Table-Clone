/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ColumnType } from "@prisma/client";
import { nanoid } from "nanoid";
import { faker } from "@faker-js/faker";

// Schema validation for View creation
const createViewSchema = z.object({
  name: z.string().min(1).max(255),
  tabId: z.string(),
  position: z.number().optional(),
  isDefault: z.boolean().optional().default(false),
});

// Helper to generate fake data cells for a new table
const generateFakeCells = (
  columns: { id: string; type: ColumnType; name: string }[],
  rowIds: string[],
) => {
  const cells = [];

  const statusOptions = [
    "To Do",
    "In Progress",
    "Done",
    "Blocked",
    "In Review",
  ];

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

export const viewRouter = createTRPCRouter({
  // Get all views belonging to a specific tab
  getViewsForTab: protectedProcedure
    .input(z.object({ tabId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // First check if the tab belongs to the user
      const tab = await ctx.db.tab.findFirst({
        where: {
          id: input.tabId,
          base: {
            ownerId: userId,
          },
        },
      });

      if (!tab) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tab not found or you don't have permission to access it",
        });
      }

      // Get all views for the tab with optimized query
      const views = await ctx.db.view.findMany({
        where: {
          tabId: input.tabId,
        },
        select: {
          id: true,
          name: true,
          position: true,
          isDefault: true,
          tableId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          position: "asc",
        },
      });

      return views;
    }),

  // Get a specific view with its associated table data
  getView: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the view exists and belongs to the user
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          tab: {
            base: {
              ownerId: userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          config: true,
          position: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
          tabId: true,
          tableId: true,
          table: {
            select: {
              id: true,
              name: true,
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
          },
        },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or you don't have permission to access it",
        });
      }

      // Transform the data to a more convenient format for front-end
      const formattedRows = view.table.rows.map((row) => {
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
        ...view,
        table: {
          ...view.table,
          formattedRows,
        },
      };
    }),

  // Create a new view with a new table and fake data
  create: protectedProcedure
    .input(createViewSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the tab exists and belongs to the user
      const tab = await ctx.db.tab.findFirst({
        where: {
          id: input.tabId,
          base: {
            ownerId: userId,
          },
        },
      });

      if (!tab) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Tab not found or you don't have permission to create a view in it",
        });
      }

      // Get the highest current position for proper ordering
      const highestPositionView = await ctx.db.view.findFirst({
        where: {
          tabId: input.tabId,
        },
        orderBy: {
          position: "desc",
        },
        select: {
          position: true,
        },
      });

      const position =
        input.position ??
        (highestPositionView ? highestPositionView.position + 1 : 0);

      // Use a transaction to ensure all related entities are created together
      return await ctx.db.$transaction(async (prisma) => {
        // 1. Create a new table for this view
        const table = await prisma.table.create({
          data: {
            name: `${input.name} Table`,
            description: `Table created for view: ${input.name}`,
          },
        });

        // 2. Create default columns for the table
        const columns = await Promise.all([
          prisma.column.create({
            data: {
              name: "Title",
              type: ColumnType.TEXT,
              position: 0,
              tableId: table.id,
            },
          }),
          prisma.column.create({
            data: {
              name: "Status",
              type: ColumnType.TEXT,
              position: 1,
              tableId: table.id,
            },
          }),
          prisma.column.create({
            data: {
              name: "Priority",
              type: ColumnType.NUMBER,
              position: 2,
              tableId: table.id,
            },
          }),
          prisma.column.create({
            data: {
              name: "Description",
              type: ColumnType.TEXT,
              position: 3,
              tableId: table.id,
            },
          }),
          prisma.column.create({
            data: {
              name: "Due Date",
              type: ColumnType.TEXT,
              position: 4,
              tableId: table.id,
            },
          }),
        ]);

        // 3. Create the view
        const view = await prisma.view.create({
          data: {
            name: input.name,
            isDefault: input.isDefault ?? false,
            position,
            tabId: input.tabId,
            tableId: table.id,
          },
        });

        // If this view is set as default, update other views to not be default
        if (input.isDefault) {
          await prisma.view.updateMany({
            where: {
              tabId: input.tabId,
              id: {
                not: view.id,
              },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // 4. Create rows with fake data
        const rowCount = faker.number.int({ min: 5, max: 10 });
        const rowIds = [];

        for (let i = 0; i < rowCount; i++) {
          const rowId = nanoid();
          rowIds.push(rowId);

          await prisma.row.create({
            data: {
              id: rowId,
              position: i,
              tableId: table.id,
            },
          });
        }

        // 5. Create cells with realistic fake data
        const cellData = generateFakeCells(
          columns.map((c) => ({ id: c.id, type: c.type, name: c.name })),
          rowIds,
        );

        await Promise.all(
          cellData.map((cell) =>
            prisma.cell.create({
              data: cell,
            }),
          ),
        );

        return {
          id: view.id,
          name: view.name,
          tabId: view.tabId,
          tableId: view.tableId,
        };
      });
    }),
});
