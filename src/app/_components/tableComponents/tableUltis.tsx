/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import type { Column } from "@/type/db";

/**
 * Generates table columns with proper configuration for editing
 *
 * @param tableColumns The column definitions from the database
 * @returns Array of column definitions for the table component
 */
export function generateTableColumns(tableColumns: Column[]) {
  const columnHelper = createColumnHelper<any>();

  return tableColumns.map((column) =>
    columnHelper.accessor((row) => row.cells[column.id], {
      id: column.id,
      header: () => (
        <div
          className="flex items-center"
          style={{ width: "179px", maxWidth: "179px", overflow: "hidden" }}
        >
          <span
            className="truncate"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {column.name}
          </span>
          <ArrowUpDown className="ml-2 h-4 w-4 flex-shrink-0" />
        </div>
      ),
      // Let the DataTable component handle the cell rendering for editing
      cell: (info) => info.getValue() || "",
      // Store original column type for validation
      meta: {
        type: column.type,
      },
      size: 179, // Fixed width for columns
    }),
  );
}

/**
 * Validates cell value based on column type
 *
 * @param value The value to validate
 * @param type The column type (TEXT or NUMBER)
 * @returns Whether the value is valid for the column type
 */
export function validateCellValue(value: string, type: string): boolean {
  if (type === "NUMBER") {
    return !isNaN(Number(value));
  }
  return true; // TEXT type accepts anything
}

/**
 * Formats cell value based on column type
 *
 * @param value The value to format
 * @param type The column type
 * @returns The formatted value
 */
export function formatCellValue(value: string, type: string): string {
  if (type === "NUMBER" && value && !isNaN(Number(value))) {
    return Number(value).toString();
  }
  return value;
}
