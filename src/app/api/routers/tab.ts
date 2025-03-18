/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { nanoid } from "nanoid";
import { faker } from "@faker-js/faker";
import { ColumnType } from "@prisma/client";

// Schema validation for Tab creation
const createTabSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  baseId: z.string(),
  position: z.number().optional(),
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

export const tabRouter = createTRPCRouter({
  // Get all tabs for a specific base
  getTabsForBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // First check if the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: userId,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have permission to access it",
        });
      }

      // Get all tabs for the base with optimized query
      const tabs = await ctx.db.tab.findMany({
        where: {
          baseId: input.baseId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          position: true,
          createdAt: true,
          updatedAt: true,
          views: {
            select: {
              id: true,
              name: true,
              position: true,
              isDefault: true,
              tableId: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      });

      return tabs;
    }),

  // Create a new tab with a default view and table
  create: protectedProcedure
    .input(createTabSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the base exists and belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: userId,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Base not found or you don't have permission to create a tab in it",
        });
      }

      // Get the highest current position for proper ordering
      let position = input.position;
      if (position === undefined) {
        const highestPositionTab = await ctx.db.tab.findFirst({
          where: {
            baseId: input.baseId,
          },
          orderBy: {
            position: "desc",
          },
          select: {
            position: true,
          },
        });

        position = highestPositionTab ? highestPositionTab.position + 1 : 0;
      }

      // Use a transaction to create the tab and related entities
      return await ctx.db.$transaction(async (prisma) => {
        // 1. Create the new tab
        const tab = await prisma.tab.create({
          data: {
            name: input.name,
            description: input.description,
            position,
            baseId: input.baseId,
          },
        });

        // 2. Create a new table for this tab's default view
        const table = await prisma.table.create({
          data: {
            name: `${input.name} Table`,
            description: `Table created for tab: ${input.name}`,
          },
        });

        // 3. Create default columns for the table
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

        // 4. Create the default view
        const view = await prisma.view.create({
          data: {
            name: "View 1",
            isDefault: true,
            position: 0,
            tabId: tab.id,
            tableId: table.id,
          },
        });

        // 5. Create rows with fake data
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

        // 6. Create cells with realistic fake data
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

        // Return the tab with its view and table
        return {
          id: tab.id,
          name: tab.name,
          position: tab.position,
          baseId: tab.baseId,
          views: [
            {
              id: view.id,
              name: view.name,
              tableId: view.tableId,
            },
          ],
        };
      });
    }),
});
