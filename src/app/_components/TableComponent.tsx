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
type ColumnType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";

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
  // State for add column modal
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("TEXT");

  // Local state to track current edits before sending to database
  const [editingCells, setEditingCells] = useState<Record<string, string>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Access the utility functions for invalidating queries
  const utils = api.useUtils();

  // Fetch table data with refetch enabled
  const {
    data: tableData,
    isLoading,
    error,
    refetch,
  } = api.table.getTableData.useQuery(
    { tableId },
    {
      onSuccess: (data) => {
        setData(data.rows || []);

        // Initialize column types
        const types: ColumnTypesState = {};
        data.columns.forEach((col) => {
          types[col.id] = col.type as ColumnType;
        });
        setColumnTypes(types);
      },
      // These options ensure we always get fresh data
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 0, // Consider data stale immediately
    },
  );

  // Re-fetch when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Handle cell value change with type safety
  const handleCellChange = (
    rowId: string,
    columnId: string,
    value: string,
  ): void => {
    const cellKey = `${rowId}-${columnId}`;
    const columnType = columnTypes[columnId];

    if (columnType === "NUMBER" && isNaN(Number(value)) && value !== "") {
      return;
    }

    // Update local editing state - this doesn't trigger table re-render
    setEditingCells((prev) => ({
      ...prev,
      [cellKey]: value,
    }));
  };

  // When cell edit is complete, update both local state and database
  const handleCellBlur = (rowId: string, columnId: string): void => {
    const cellKey = `${rowId}-${columnId}`;
    const value = editingCells[cellKey] || "";

    // Update the database
    updateCell.mutate({
      rowId,
      columnId,
      value,
    });

    // Update the local data state to match
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

    // Clear this cell from editing state
    setEditingCells((prev) => {
      const newState = { ...prev };
      delete newState[cellKey];
      return newState;
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

      // Update local state
      setData((prev) => [...prev, newRowObj]);

      // Invalidate all relevant queries
      utils.table.getTableData.invalidate({ tableId });
      utils.table.getTablesForBase.invalidate();

      // Force a refetch to ensure data consistency
      refetch();
    },
  });

  // Add column mutation
  const addColumn = api.table.addColumn.useMutation({
    onSuccess: () => {
      // Reset form values
      setNewColumnName("");
      setNewColumnType("TEXT");
      setShowAddColumnModal(false);

      // Invalidate all relevant queries
      utils.table.getTableData.invalidate({ tableId });
      utils.table.getTablesForBase.invalidate();

      // Force a refetch to ensure data consistency
      refetch();
    },
  });

  // Update cell mutation
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => {
      // Invalidate table data
      utils.table.getTableData.invalidate({ tableId });
    },
  });

  // Handle adding a new row
  const handleAddRow = (): void => {
    if (tableId) {
      addRow.mutate({ tableId });
    }
  };

  // Handle adding a new column
  const handleAddColumn = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!newColumnName.trim()) {
      return;
    }

    addColumn.mutate({
      tableId,
      name: newColumnName.trim(),
      type: newColumnType,
    });
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
          cell: ({ row, column: col }) => {
            const rowId = row.original.id;
            const columnId = column.id;
            const cellKey = `${rowId}-${columnId}`;

            // Use the editing value if it exists, otherwise use the data value
            const value =
              cellKey in editingCells
                ? editingCells[cellKey]
                : row.original[columnId] || "";

            return (
              <input
                type={columnTypes[columnId] === "NUMBER" ? "number" : "text"}
                value={value}
                onChange={(e) =>
                  handleCellChange(rowId, columnId, e.target.value)
                }
                onBlur={() => handleCellBlur(rowId, columnId)}
                className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            );
          },
        }),
      );
    });

    // Add column button
    columns.push(
      columnHelper.display({
        id: "addColumn",
        header: () => (
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setShowAddColumnModal(true)}
          >
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

      if (
        showAddColumnModal &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowAddColumnModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, modalRef, showAddColumnModal]);

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
          <button
            className="ml-2 text-sm text-blue-500 hover:text-blue-700"
            onClick={() => refetch()}
          >
            Refresh
          </button>
        </div>
        <div className="text-sm text-gray-500">{data.length} records</div>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h3 className="mb-4 text-xl font-medium">Add New Column</h3>
            <form onSubmit={handleAddColumn}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter column name"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  Column Type
                </label>
                <select
                  value={newColumnType}
                  onChange={(e) =>
                    setNewColumnType(e.target.value as ColumnType)
                  }
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="BOOLEAN">Boolean</option>
                  <option value="SELECT">Select</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddColumnModal(false)}
                  className="mr-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  disabled={addColumn.isPending}
                >
                  {addColumn.isPending ? "Adding..." : "Add Column"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableComponent;
