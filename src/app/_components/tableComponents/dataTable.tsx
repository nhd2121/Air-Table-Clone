/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { AddColumnButton } from "./addColumnButton";
import { api } from "@/trpc/react";

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

  // State for handling cell editing
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Utility function to access the APIs
  const utils = api.useUtils();

  // Cell update mutation
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => {
      // Invalidate the query to refresh the table data
      void utils.table.getTableForView.invalidate();
    },
  });

  // Create column definitions with cell editing capabilities
  const enhancedColumns = React.useMemo(() => {
    return columns.map((column) => ({
      ...column,
      cell: (info: any) => {
        const rowId = info.row.original.id;
        const columnId = info.column.id;
        const value = info.getValue();
        const columnType = column.meta?.type || "TEXT";

        const isEditing =
          editingCell?.rowId === rowId && editingCell?.columnId === columnId;

        if (isEditing) {
          return (
            <input
              ref={inputRef}
              type={columnType === "NUMBER" ? "number" : "text"}
              value={editingValue}
              onChange={(e) => {
                // For number columns, only allow numeric input
                if (columnType === "NUMBER") {
                  if (e.target.value === "" || !isNaN(Number(e.target.value))) {
                    setEditingValue(e.target.value);
                  }
                } else {
                  setEditingValue(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCellUpdate(rowId, columnId, columnType);
                } else if (e.key === "Escape") {
                  setEditingCell(null);
                }
              }}
              onBlur={() => handleCellUpdate(rowId, columnId, columnType)}
              className="w-full rounded border-none bg-blue-50 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          );
        }

        return (
          <div
            className="min-h-[24px] w-full cursor-pointer rounded px-1 py-1 hover:bg-blue-100"
            onClick={() => handleCellClick(rowId, columnId, value)}
          >
            {value || ""}
          </div>
        );
      },
    }));
  }, [columns, editingCell, editingValue]);

  // Add the "Add Column" button as a static column
  const allColumns = [
    ...enhancedColumns,
    {
      id: "add-column",
      header: () => <AddColumnButton onClick={onAddColumn} />,
      cell: () => null,
      size: 50,
    },
  ];

  // Handle clicking on a cell to edit it
  const handleCellClick = (rowId: string, columnId: string, value: any) => {
    setEditingCell({ rowId, columnId });
    setEditingValue(value || "");

    // Focus the input after a small delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  // Handle updating cell value
  const handleCellUpdate = (
    rowId: string,
    columnId: string,
    columnType: string,
  ) => {
    if (editingCell) {
      // Validate input based on column type
      let validatedValue = editingValue;

      if (columnType === "NUMBER") {
        // For number columns, ensure it's a valid number or empty
        if (editingValue !== "" && isNaN(Number(editingValue))) {
          // If invalid number, either revert or set to empty string
          validatedValue = "";
        }
      }

      // Update the cell in the database
      updateCell.mutate({
        rowId,
        columnId,
        value: validatedValue,
      });

      // Exit edit mode
      setEditingCell(null);
    }
  };

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
    <div className={`rounded-md border border-gray-300 shadow-sm ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b-2 border-gray-300 bg-gray-50"
            >
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 text-left text-sm font-medium text-gray-600 ${
                    index < headerGroup.headers.length - 1
                      ? "border-r border-gray-300"
                      : ""
                  }`}
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
            <tr
              key={row.id}
              className="border-b border-gray-300 hover:bg-blue-50"
            >
              {row.getVisibleCells().map((cell, index) => (
                <td
                  key={cell.id}
                  className={`px-4 py-3 text-sm text-gray-700 ${
                    index < row.getVisibleCells().length - 1
                      ? "border-r border-gray-300"
                      : ""
                  }`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}

          {/* Add Row Button Row */}
          <tr className="border-t border-gray-300 hover:bg-gray-100">
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
