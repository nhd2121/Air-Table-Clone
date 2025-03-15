/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";

const ColumnTypeEnum = z.enum(["TEXT", "NUMBER"]);

export const tableRouter = createTRPCRouter({
  // Get all tables for a base - optimized to retrieve only what's needed
  getTablesForBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Use a more efficient query to verify access
      const hasAccess = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
        select: { id: true },
      });

      if (!hasAccess) {
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

  // Get table data with pagination for better performance with large datasets
  getTableData: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().int().min(1).max(1000).optional().default(100),
        cursor: z.string().optional(), // for pagination
      }),
    )
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
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // Get rows with pagination
      const rows = await ctx.db.row.findMany({
        where: {
          tableId: input.tableId,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: input.limit + 1, // Take an extra item to determine if there are more
        ...(input.cursor
          ? {
              cursor: { id: input.cursor },
              skip: 1, // Skip the cursor
            }
          : {}),
        include: {
          cells: true,
        },
      });

      // Check if we have more results
      const hasMore = rows.length > input.limit;
      if (hasMore) {
        rows.pop(); // Remove the extra item
      }

      // Get the next cursor
      const nextCursor = hasMore ? rows[rows.length - 1]?.id : undefined;

      // Transform data into a more convenient format for the frontend
      const formattedRows = rows.map((row) => {
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
        nextCursor,
        hasMore,
      };
    }),

  // Search with optimization and pagination
  searchTableData: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        searchTerm: z.string(),
        limit: z.number().int().min(1).max(1000).optional().default(100),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // First verify the table belongs to a base owned by the user - optimized query
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
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have access",
        });
      }

      // If search term is empty, return using the standard getTableData logic
      if (!input.searchTerm.trim()) {
        return this.getTableData.query({
          tableId: input.tableId,
          limit: input.limit,
          cursor: input.cursor,
        });
      }

      // Use more efficient query pattern for search
      // First find cells that contain the search term
      const matchingCells = await ctx.db.cell.findMany({
        where: {
          column: {
            tableId: input.tableId,
          },
          value: {
            contains: input.searchTerm,
            mode: "insensitive", // Case-insensitive search
          },
        },
        select: {
          rowId: true,
        },
        take: 1000, // Reasonable limit for search results
      });

      // Extract unique row IDs
      const matchingRowIds = [
        ...new Set(matchingCells.map((cell) => cell.rowId)),
      ];

      // If no matches, return empty result with table structure
      if (matchingRowIds.length === 0) {
        return {
          table,
          columns: table.columns,
          rows: [],
          nextCursor: undefined,
          hasMore: false,
          searchTerm: input.searchTerm,
        };
      }

      // Get the full data for matching rows with pagination
      const paginatedIds = matchingRowIds.slice(
        input.cursor ? matchingRowIds.indexOf(input.cursor) + 1 : 0,
        input.cursor
          ? matchingRowIds.indexOf(input.cursor) + 1 + input.limit
          : input.limit,
      );

      const hasMore =
        paginatedIds.length <
        matchingRowIds.length -
          (input.cursor ? matchingRowIds.indexOf(input.cursor) + 1 : 0);
      const nextCursor = hasMore
        ? paginatedIds[paginatedIds.length - 1]
        : undefined;

      // Get the actual row data
      const rows = await ctx.db.row.findMany({
        where: {
          id: {
            in: paginatedIds,
          },
        },
        include: {
          cells: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Transform data into a more convenient format for the frontend
      const formattedRows = rows.map((row) => {
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
        nextCursor,
        hasMore,
        searchTerm: input.searchTerm,
      };
    }),

  // Create a new table using transactions for reliability
  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Extend timeout for this operation
      ctx.headers.set("request-timeout", "30000");

      try {
        // Use a transaction to ensure all operations complete together
        return await ctx.db.$transaction(
          async (tx) => {
            // Verify the base belongs to the user
            const base = await tx.base.findFirst({
              where: {
                id: input.baseId,
                ownerId: ctx.session.user.id,
              },
              select: { id: true },
            });

            if (!base) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Base not found or you don't have access",
              });
            }

            // Create the table with specific column names
            const table = await tx.table.create({
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
              },
              include: {
                columns: true,
              },
            });

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
                    table: { connect: { id: table.id } },
                  },
                })
                .then(async (row) => {
                  // Add cells for each column
                  const cellPromises = table.columns.map((column) => {
                    let value = "";
                    if (column.name === "Name") value = fakeData.Name;
                    else if (column.name === "Email") value = fakeData.Email;
                    else if (column.name === "Phone") value = fakeData.Phone;
                    else if (column.name === "Notes") value = fakeData.Notes;

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

            return table;
          },
          {
            timeout: 25000,
            maxWait: 5000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error creating table:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create table. Please try again.",
          cause: error,
        });
      }
    }),

  // Add a column to a table with optimized transaction
  addColumn: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        type: ColumnTypeEnum.default("TEXT"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(
          async (tx) => {
            // Verify the table belongs to a base owned by the user
            const table = await tx.table.findFirst({
              where: {
                id: input.tableId,
                base: {
                  ownerId: ctx.session.user.id,
                },
              },
              include: {
                rows: {
                  select: { id: true }, // Only select row IDs to optimize
                },
              },
            });

            if (!table) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Table not found or you don't have access",
              });
            }

            // Create the new column
            const column = await tx.column.create({
              data: {
                name: input.name,
                type: input.type,
                table: { connect: { id: input.tableId } },
              },
            });

            // Generate faker data for all rows in bulk
            if (table.rows.length > 0) {
              const cellCreations = table.rows.map((row) => {
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

                return tx.cell.create({
                  data: {
                    columnId: column.id,
                    rowId: row.id,
                    value,
                  },
                });
              });

              await Promise.all(cellCreations);
            }

            return column;
          },
          {
            timeout: 15000,
            maxWait: 3000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error adding column:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add column",
          cause: error,
        });
      }
    }),

  // Update a cell value with better error handling
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Optimize the verification query - only fetch what we need
        const cellWithOwnership = await ctx.db.cell.findUnique({
          where: {
            columnId_rowId: {
              columnId: input.columnId,
              rowId: input.rowId,
            },
          },
          select: {
            row: {
              select: {
                table: {
                  select: {
                    base: {
                      select: {
                        ownerId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (
          !cellWithOwnership ||
          cellWithOwnership.row.table.base.ownerId !== ctx.session.user.id
        ) {
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
      } catch (error) {
        console.error("Error updating cell:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update cell",
          cause: error,
        });
      }
    }),

  // Add a new row with optimized transaction
  addRow: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(
          async (tx) => {
            // Verify the table belongs to a base owned by the user
            const table = await tx.table.findFirst({
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
            const row = await tx.row.create({
              data: {
                table: { connect: { id: input.tableId } },
              },
            });

            // Pre-generate fake data for each column type
            const fakerData = {
              name: faker.person.fullName(),
              email: faker.internet.email(),
              phone: faker.phone.number(),
              notes: faker.lorem.sentence(),
              number: faker.number.int({ min: 1, max: 1000 }).toString(),
              text: faker.lorem.words(3),
            };

            // Create cells for all columns in parallel
            const cellPromises = table.columns.map((column) => {
              let value = "";

              // Generate appropriate data based on column name or type
              if (
                column.name === "Name" ||
                column.name.toLowerCase().includes("name")
              ) {
                value = fakerData.name;
              } else if (
                column.name === "Email" ||
                column.name.toLowerCase().includes("email")
              ) {
                value = fakerData.email;
              } else if (
                column.name === "Phone" ||
                column.name.toLowerCase().includes("phone")
              ) {
                value = fakerData.phone;
              } else if (
                column.name === "Notes" ||
                column.name.toLowerCase().includes("note")
              ) {
                value = fakerData.notes;
              } else if (column.type === "NUMBER") {
                value = fakerData.number;
              } else {
                value = fakerData.text;
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

            // Return the row with cells included
            return tx.row.findUnique({
              where: { id: row.id },
              include: {
                cells: true,
              },
            });
          },
          {
            timeout: 10000,
            maxWait: 2000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error adding row:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add row",
          cause: error,
        });
      }
    }),

  addMultipleRows: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().int().min(1).max(100).default(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(
          async (tx) => {
            // Verify the table belongs to a base owned by the user
            const table = await tx.table.findFirst({
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

            // Pre-generate fake data for each column type for all rows
            const rowsData: any[] = [];

            for (let i = 0; i < input.count; i++) {
              const fakerData = {
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                notes: faker.lorem.sentence(),
                number: faker.number.int({ min: 1, max: 1000 }).toString(),
                text: faker.lorem.words(3),
              };

              rowsData.push(fakerData);
            }

            // Batch create all rows
            const createdRows: Array<{
              id: string;
              cells: Array<{
                columnId: string;
                value: string | null;
              }>;
            }> = [];

            // Process in smaller batches of 10 to avoid overwhelming the DB
            const batchSize = 10;
            const batches = Math.ceil(input.count / batchSize);

            for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
              const startIdx = batchIndex * batchSize;
              const endIdx = Math.min(startIdx + batchSize, input.count);
              const batchPromises = [];

              for (let i = startIdx; i < endIdx; i++) {
                // Create the row
                const rowPromise = tx.row
                  .create({
                    data: {
                      table: { connect: { id: input.tableId } },
                    },
                  })
                  .then(async (row) => {
                    // Get the faker data for this row
                    const fakerData = rowsData[i];

                    // Create cells for all columns in parallel
                    const cellPromises = table.columns.map((column) => {
                      let value = "";

                      // Generate appropriate data based on column name or type
                      if (
                        column.name === "Name" ||
                        column.name.toLowerCase().includes("name")
                      ) {
                        value = fakerData.name;
                      } else if (
                        column.name === "Email" ||
                        column.name.toLowerCase().includes("email")
                      ) {
                        value = fakerData.email;
                      } else if (
                        column.name === "Phone" ||
                        column.name.toLowerCase().includes("phone")
                      ) {
                        value = fakerData.phone;
                      } else if (
                        column.name === "Notes" ||
                        column.name.toLowerCase().includes("note")
                      ) {
                        value = fakerData.notes;
                      } else if (column.type === "NUMBER") {
                        value = fakerData.number;
                      } else {
                        value = fakerData.text;
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

                    // Get the complete row with cells
                    const completeRow = await tx.row.findUnique({
                      where: { id: row.id },
                      include: {
                        cells: true,
                      },
                    });

                    if (!completeRow) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to retrieve created row",
                      });
                    }

                    // Add properly typed row to our results
                    createdRows.push({
                      id: completeRow.id,
                      cells: completeRow.cells.map((cell) => ({
                        columnId: cell.columnId,
                        value: cell.value,
                      })),
                    });

                    return completeRow;
                  });

                batchPromises.push(rowPromise);
              }

              // Wait for each batch to complete before moving to the next
              await Promise.all(batchPromises);
            }

            return createdRows;
          },
          {
            timeout: 60000, // Increase timeout for batch operations
            maxWait: 5000,
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          },
        );
      } catch (error) {
        console.error("Error adding multiple rows:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add rows",
          cause: error,
        });
      }
    }),
});
