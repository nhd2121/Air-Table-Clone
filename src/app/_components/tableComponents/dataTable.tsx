/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AddColumnButton } from "./addColumnButton";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  className?: string;
  tableId: string;
  onAddRow: (tableId: string) => void;
  onAddColumn: () => void;
  isAddingRow?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  className = "",
  tableId,
  onAddRow,
  onAddColumn,
  isAddingRow = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Add the "Add Column" button as a static column
  const allColumns = [
    ...columns,
    {
      id: "add-column",
      header: () => <AddColumnButton onClick={onAddColumn} />,
      cell: () => null,
      size: 50,
    },
  ];

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={`rounded-md border ${className}`}>
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-gray-50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-500"
                  onClick={header.column.getToggleSortingHandler()}
                  style={
                    header.id === "add-column"
                      ? { width: "50px", minWidth: "50px" }
                      : {}
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-gray-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}

          {/* Add Row Button Row */}
          <tr className="border-t hover:bg-gray-100">
            <td
              colSpan={table.getAllColumns().length}
              className="px-4 py-2 text-center"
            >
              <button
                onClick={() => onAddRow(tableId)}
                disabled={isAddingRow}
                className="flex w-full items-center justify-start py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {isAddingRow ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" />
                  </>
                )}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
