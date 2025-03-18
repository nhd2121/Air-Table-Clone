/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ColumnType } from "@prisma/client";
import { nanoid } from "nanoid";
import { faker } from "@faker-js/faker";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Schema validation for Base creation
const createBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

// Schema validation for Base update
const updateBaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

// Helper to generate fake data cells for a new table
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

export const baseRouter = createTRPCRouter({
  // Get all bases for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Optimized query to fetch only necessary data
    const bases = await ctx.db.base.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tabs: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return bases;
  }),

  // Get a single base by ID with its tabs, views, and tables
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          tabs: {
            select: {
              id: true,
              name: true,
              description: true,
              position: true,
              views: {
                select: {
                  id: true,
                  name: true,
                  isDefault: true,
                  position: true,
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
          },
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found",
        });
      }

      return base;
    }),

  // Create a new base with default tab, view, and table
  create: protectedProcedure
    .input(createBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Use a transaction to ensure all related entities are created together
      return await ctx.db.$transaction(async (prisma) => {
        // 1. Create the base
        const base = await prisma.base.create({
          data: {
            name: input.name,
            description: input.description,
            ownerId: userId,
          },
        });

        // 2. Create a default tab
        const tab = await prisma.tab.create({
          data: {
            name: "Table",
            description: "Default tab",
            position: 0,
            baseId: base.id,
          },
        });

        // 3. Create a default table with columns
        const table = await prisma.table.create({
          data: {
            name: "Default Table",
            description: "Automatically created table",
          },
        });

        // 4. Create default columns for the table
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

        // 5. Create default view
        const view = await prisma.view.create({
          data: {
            name: "View 1",
            isDefault: true,
            position: 0,
            tabId: tab.id,
            tableId: table.id,
          },
        });

        // 6. Create default rows (between 5-10 random rows)
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

        // 7. Create cells with realistic fake data
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
          id: base.id,
          name: base.name,
          description: base.description,
        };
      });
    }),

  // Update base name and description
  update: protectedProcedure
    .input(updateBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the base exists and belongs to the user
      const existingBase = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
      });

      if (!existingBase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have permission to update it",
        });
      }

      // Update the base
      const updatedBase = await ctx.db.base.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
          updatedAt: new Date(),
        },
      });

      return updatedBase;
    }),

  // Delete a base and all its related data
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the base exists and belongs to the user
      const existingBase = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
      });

      if (!existingBase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you don't have permission to delete it",
        });
      }

      // Get all tabs belonging to this base
      const tabs = await ctx.db.tab.findMany({
        where: {
          baseId: input.id,
        },
        select: {
          id: true,
          views: {
            select: {
              tableId: true,
            },
          },
        },
      });

      // Get all unique table IDs associated with this base's views
      const tableIds = new Set<string>();
      tabs.forEach((tab) => {
        tab.views.forEach((view) => {
          tableIds.add(view.tableId);
        });
      });

      // Use a transaction to ensure all related data is deleted consistently
      return await ctx.db.$transaction(async (prisma) => {
        // Delete all tables associated with this base's views
        for (const tableId of tableIds) {
          // This will cascade delete columns, rows, and cells
          await prisma.table.delete({
            where: {
              id: tableId,
            },
          });
        }

        // Delete the base (which will cascade delete tabs and views)
        await prisma.base.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      });
    }),
});
