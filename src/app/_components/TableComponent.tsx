"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "@/trpc/react";

// Define the data structure for each row
interface TableRow {
  id: string;
  [key: string]: string;
}

// Define column type options
type ColumnType = "TEXT" | "NUMBER";

// Define the column types state structure
interface ColumnTypesState {
  [columnId: string]: ColumnType;
}

interface TableComponentProps {
  tableId: string;
}

const TableComponent: React.FC<TableComponentProps> = ({ tableId }) => {
  // State to track data
  const [data, setData] = useState<TableRow[]>([]);
  // Column types
  const [columnTypes, setColumnTypes] = useState<ColumnTypesState>({});
  // State for active dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch table data
  const {
    data: tableData,
    isLoading,
    error,
  } = api.table.getTableData.useQuery(
    { tableId },
    {
      onSuccess: (data) => {
        setData(data.rows || []);

        // Initialize column types
        const types: ColumnTypesState = {};
        data.columns.forEach((col) => {
          types[col.id] = col.type === "NUMBER" ? "NUMBER" : "TEXT";
        });
        setColumnTypes(types);
      },
    },
  );

  // Handle cell value change with type safety
  const updateData = (rowId: string, columnId: string, value: string): void => {
    const columnType = columnTypes[columnId];

    if (columnType === "NUMBER" && isNaN(Number(value)) && value !== "") {
      return;
    }

    // Update local state
    setData((old) =>
      old.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            [columnId]: value,
          };
        }
        return row;
      }),
    );

    // Update in the database
    updateCell.mutate({
      rowId,
      columnId,
      value,
    });
  };

  // Add row mutation
  const addRow = api.table.addRow.useMutation({
    onSuccess: (newRow) => {
      // Create a new row object with empty values for all columns
      const newRowObj: TableRow = { id: newRow.id };

      if (tableData) {
        tableData.columns.forEach((col) => {
          newRowObj[col.id] = "";
        });
      }

      setData([...data, newRowObj]);
    },
  });

  // Update cell mutation
  const updateCell = api.table.updateCell.useMutation();

  // Handle adding a new row
  const handleAddRow = (): void => {
    if (tableId) {
      addRow.mutate({ tableId });
    }
  };

  // Handle column type change
  const changeColumnType = (columnId: string, type: ColumnType): void => {
    setColumnTypes((prevTypes) => ({
      ...prevTypes,
      [columnId]: type,
    }));
    setActiveDropdown(null);
  };

  // Create a reusable dropdown component for column headers
  const ColumnTypeDropdown: React.FC<{
    columnId: string;
    label: string;
  }> = ({ columnId, label }) => {
    return (
      <div className="relative">
        <div
          className="flex cursor-pointer items-center"
          onClick={() => setActiveDropdown(columnId)}
        >
          <span className="mr-1">{label}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {activeDropdown === columnId && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-gray-200 bg-white shadow-lg"
          >
            <div className="p-2 text-sm font-semibold text-gray-700">
              Column Type
            </div>
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "TEXT" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "TEXT")}
            >
              Text
            </div>
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "NUMBER" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "NUMBER")}
            >
              Number
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create column helper with type safety
  const columnHelper = createColumnHelper<TableRow>();

  // Define columns with proper typing
  const buildColumns = () => {
    if (!tableData) return [];

    const columns = [
      // Selection/row number column
      columnHelper.display({
        id: "select",
        header: () => (
          <input type="checkbox" className="rounded text-blue-500" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <input type="checkbox" className="mr-2 rounded text-blue-500" />
            <span>{row.index + 1}</span>
          </div>
        ),
        size: 60,
      }),
    ];

    // Add data columns
    tableData.columns.forEach((column) => {
      columns.push(
        columnHelper.accessor(column.id, {
          header: () => (
            <ColumnTypeDropdown columnId={column.id} label={column.name} />
          ),
          cell: ({ row, column: col, getValue }) => (
            <input
              type={columnTypes[column.id] === "NUMBER" ? "number" : "text"}
              value={(getValue() as string) || ""}
              onChange={(e) =>
                updateData(row.original.id, column.id, e.target.value)
              }
              className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ),
        }),
      );
    });

    // Add column button
    columns.push(
      columnHelper.display({
        id: "addColumn",
        header: () => (
          <button className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        ),
        cell: () => null,
        size: 40,
      }),
    );

    return columns;
  };

  // Initialize TanStack table with proper typing
  const table = useReactTable<TableRow>({
    data,
    columns: buildColumns(),
    getCoreRowModel: getCoreRowModel(),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        Loading table data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        Error loading table: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className="relative border-l px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
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
                  <td
                    key={cell.id}
                    className={`border-r px-4 py-3 text-sm ${
                      cell.column.id === "select" ? "bg-gray-50" : ""
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <div className="flex-1"></div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-white px-4 py-2">
        <div className="flex items-center">
          <button
            className="mr-2 rounded-full p-1 hover:bg-gray-100"
            onClick={handleAddRow}
            disabled={addRow.isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-500">{data.length} records</div>
      </div>
    </div>
  );
};

export default TableComponent;
