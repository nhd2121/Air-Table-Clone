"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Define the data structure for each row
interface TableRow {
  id: number;
  name: string;
  notes: string;
  assignee: string;
  status: string;
}

// Define column type options
type ColumnType = "Text" | "Number";

// Define the column types state structure
interface ColumnTypesState {
  name: ColumnType;
  notes: ColumnType;
  assignee: ColumnType;
  status: ColumnType;
}

const AirTableGrid: React.FC = () => {
  // Initial data with type safety
  const [data, setData] = useState<TableRow[]>([
    { id: 1, name: "", notes: "", assignee: "", status: "" },
    { id: 2, name: "", notes: "", assignee: "", status: "" },
    { id: 3, name: "", notes: "", assignee: "", status: "" },
    { id: 4, name: "", notes: "", assignee: "", status: "" },
    { id: 5, name: "", notes: "", assignee: "", status: "" },
  ]);

  // Column type state with type safety
  const [columnTypes, setColumnTypes] = useState<ColumnTypesState>({
    name: "Text",
    notes: "Text",
    assignee: "Text",
    status: "Text",
  });

  // State for active dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle cell value change with type safety
  const updateData = (
    rowIndex: number,
    columnId: keyof TableRow,
    value: string,
  ): void => {
    if (columnId === "id") return;

    const columnType = columnTypes[columnId as keyof ColumnTypesState];

    if (columnType === "Number" && isNaN(Number(value)) && value !== "") {
      return;
    }

    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: value,
          };
        }
        return row;
      }),
    );
  };

  const addRow = (): void => {
    const newRowId =
      data.length > 0 ? Math.max(...data.map((row) => row.id)) + 1 : 1;
    const newRow: TableRow = {
      id: newRowId,
      name: "",
      notes: "",
      assignee: "",
      status: "",
    };
    setData([...data, newRow]);
  };

  // Handle column type change
  const changeColumnType = (
    columnId: keyof ColumnTypesState,
    type: ColumnType,
  ): void => {
    setColumnTypes((prevTypes) => ({
      ...prevTypes,
      [columnId]: type,
    }));
    setActiveDropdown(null);
  };

  // Create a reusable dropdown component for column headers
  const ColumnTypeDropdown: React.FC<{
    columnId: keyof ColumnTypesState;
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
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "Text" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "Text")}
            >
              Text
            </div>
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "Number" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "Number")}
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
  const columns = [
    // Selection/row number column
    columnHelper.display({
      id: "select",
      header: () => <input type="checkbox" className="rounded text-blue-500" />,
      cell: ({ row }) => (
        <div className="flex items-center">
          <input type="checkbox" className="mr-2 rounded text-blue-500" />
          <span>{row.original.id}</span>
        </div>
      ),
      size: 60,
    }),

    // Data columns
    columnHelper.accessor("name", {
      header: () => <ColumnTypeDropdown columnId="name" label="Name" />,
      cell: ({ row, column, getValue }) => (
        <input
          type={columnTypes.name === "Number" ? "number" : "text"}
          value={getValue() || ""}
          onChange={(e) =>
            updateData(row.index, column.id as keyof TableRow, e.target.value)
          }
          className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ),
    }),

    columnHelper.accessor("notes", {
      header: () => <ColumnTypeDropdown columnId="notes" label="Notes" />,
      cell: ({ row, column, getValue }) => (
        <input
          type={columnTypes.notes === "Number" ? "number" : "text"}
          value={getValue() || ""}
          onChange={(e) =>
            updateData(row.index, column.id as keyof TableRow, e.target.value)
          }
          className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ),
    }),

    columnHelper.accessor("assignee", {
      header: () => <ColumnTypeDropdown columnId="assignee" label="Assignee" />,
      cell: ({ row, column, getValue }) => (
        <input
          type={columnTypes.assignee === "Number" ? "number" : "text"}
          value={getValue() || ""}
          onChange={(e) =>
            updateData(row.index, column.id as keyof TableRow, e.target.value)
          }
          className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ),
    }),

    columnHelper.accessor("status", {
      header: () => <ColumnTypeDropdown columnId="status" label="Status" />,
      cell: ({ row, column, getValue }) => (
        <input
          type={columnTypes.status === "Number" ? "number" : "text"}
          value={getValue() || ""}
          onChange={(e) =>
            updateData(row.index, column.id as keyof TableRow, e.target.value)
          }
          className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ),
    }),

    // Add column button
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
  ];

  // Initialize TanStack table with proper typing
  const table = useReactTable<TableRow>({
    data,
    columns,
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
            onClick={addRow}
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

export default AirTableGrid;
