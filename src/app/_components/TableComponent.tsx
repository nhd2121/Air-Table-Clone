"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "@/trpc/react";
import { faker } from "@faker-js/faker";

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
  // State to track if we're adding 100 rows
  const [isAddingRows, setIsAddingRows] = useState(false);
  // Reference to table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Local state to track current edits before sending to database
  const [editingCells, setEditingCells] = useState<Record<string, string>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Access the utility functions for invalidating queries
  const utils = api.useUtils();

  // Fetch table data
  const {
    data: tableData,
    isLoading,
    error,
  } = api.table.getTableData.useQuery(
    { tableId },
    {
      onSuccess: (data) => {
        // Initialize column types
        const types: ColumnTypesState = {};
        data.columns.forEach((col) => {
          types[col.id] = col.type as ColumnType;
        });
        setColumnTypes(types);

        // Check if we need to ensure we have at least 10 rows
        if (data.rows.length < 10) {
          // Instead of waiting for API calls to complete, create 10 rows immediately in the UI
          const existingRows = [...data.rows];
          const fakerRows: TableRow[] = [];

          // Create a complete set of 10 rows
          for (let i = 0; i < 10; i++) {
            if (i < existingRows.length) {
              // Use existing row
              fakerRows.push(existingRows[i]);
            } else {
              // Create a temporary row with a fake ID until real one is created
              const tempId = `temp-${i}`;
              const newRow: TableRow = { id: tempId };

              // Add the row to our UI data
              fakerRows.push(newRow);

              // Create the row in the database (but don't wait for it)
              addRow.mutate(
                { tableId },
                {
                  onSuccess: (addedRow) => {
                    // When the row is created, update our internal data structure
                    setData((prevData) =>
                      prevData.map((row) =>
                        row.id === tempId ? { ...row, id: addedRow.id } : row,
                      ),
                    );
                  },
                },
              );
            }
          }

          // Generate fake data for all 10 rows
          const fakerData = generateFakerData(fakerRows, data.columns);
          setData(fakerData);

          // Update the cells in the database for existing rows (don't wait for new rows)
          fakerData.forEach((row) => {
            // Only update existing rows (not temporary ones)
            if (!row.id.startsWith("temp-")) {
              data.columns.forEach((col) => {
                if (row[col.id]) {
                  updateCell.mutate({
                    rowId: row.id,
                    columnId: col.id,
                    value: row[col.id],
                  });
                }
              });
            }
          });
        } else {
          // We have enough rows, just generate fake data for them
          // Only take the first 10 rows for initial display
          const initialRows = data.rows.slice(0, 10);
          const fakerData = generateFakerData(initialRows, data.columns);
          setData(fakerData);

          // Update the cells in the database
          fakerData.forEach((row) => {
            data.columns.forEach((col) => {
              if (row[col.id]) {
                updateCell.mutate({
                  rowId: row.id,
                  columnId: col.id,
                  value: row[col.id],
                });
              }
            });
          });
        }
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 0,
    },
  );

  // Function to generate faker data based on column types
  const generateFakerData = (rows: TableRow[], columns: any[]): TableRow[] => {
    return rows.map((row) => {
      const newRow: TableRow = { ...row };

      columns.forEach((column) => {
        const columnType = column.type as ColumnType;

        switch (columnType) {
          case "TEXT":
            if (column.name.toLowerCase().includes("name")) {
              newRow[column.id] = faker.person.fullName();
            } else if (column.name.toLowerCase().includes("email")) {
              newRow[column.id] = faker.internet.email();
            } else if (column.name.toLowerCase().includes("address")) {
              newRow[column.id] = faker.location.streetAddress();
            } else if (column.name.toLowerCase().includes("company")) {
              newRow[column.id] = faker.company.name();
            } else if (column.name.toLowerCase().includes("phone")) {
              newRow[column.id] = faker.phone.number();
            } else if (
              column.name.toLowerCase().includes("notes") ||
              column.name.toLowerCase().includes("description")
            ) {
              newRow[column.id] = faker.lorem.sentence();
            } else if (column.name.toLowerCase().includes("status")) {
              newRow[column.id] = faker.helpers.arrayElement([
                "Pending",
                "In Progress",
                "Completed",
                "Cancelled",
              ]);
            } else if (column.name.toLowerCase().includes("assignee")) {
              newRow[column.id] = faker.person.firstName();
            } else {
              newRow[column.id] = faker.lorem.words(2);
            }
            break;
          case "NUMBER":
            newRow[column.id] = faker.number
              .int({ min: 1, max: 1000 })
              .toString();
            break;
          case "DATE":
            newRow[column.id] = faker.date.recent().toISOString().split("T")[0];
            break;
          case "BOOLEAN":
            newRow[column.id] = faker.datatype.boolean().toString();
            break;
          case "SELECT":
            newRow[column.id] = faker.helpers.arrayElement([
              "Option 1",
              "Option 2",
              "Option 3",
            ]);
            break;
          default:
            newRow[column.id] = faker.lorem.word();
        }
      });

      return newRow;
    });
  };

  // Function to handle cell changes when a cell is being edited
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

    // Skip updates for temporary rows that haven't been created in the database yet
    if (rowId.startsWith("temp-")) {
      return;
    }

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

      // Generate faker data for the new row
      const newRowWithFakerData = generateFakerData(
        [newRowObj],
        tableData?.columns || [],
      )[0];

      // Update local state
      setData((prev) => [...prev, newRowWithFakerData]);

      // Update the cells in the database with faker data
      if (tableData) {
        tableData.columns.forEach((col) => {
          if (newRowWithFakerData[col.id]) {
            updateCell.mutate({
              rowId: newRow.id,
              columnId: col.id,
              value: newRowWithFakerData[col.id],
            });
          }
        });
      }
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
    },
  });

  // Update cell mutation
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => {
      // Invalidate table data
      utils.table.getTableData.invalidate({ tableId });
    },
  });

  // Handle adding 100 rows
  const handleAdd100Rows = async () => {
    if (isAddingRows || !tableData) return;

    setIsAddingRows(true);

    try {
      // Create an array to hold promises and new row objects
      const newRows: TableRow[] = [];
      const promises = [];

      // Create 100 rows
      for (let i = 0; i < 100; i++) {
        const promise = addRow.mutateAsync({ tableId }).then((newRow) => {
          // Create a new row object
          const newRowObj: TableRow = { id: newRow.id };

          // Add placeholder data for each column
          if (tableData) {
            tableData.columns.forEach((col) => {
              newRowObj[col.id] = "";
            });
          }

          // Generate fake data
          const rowWithFakerData = generateFakerData(
            [newRowObj],
            tableData.columns,
          )[0];

          // Store the row with fake data
          newRows.push(rowWithFakerData);

          // Update cells in database
          if (tableData) {
            tableData.columns.forEach((col) => {
              if (rowWithFakerData[col.id]) {
                updateCell.mutate({
                  rowId: newRow.id,
                  columnId: col.id,
                  value: rowWithFakerData[col.id],
                });
              }
            });
          }
        });

        promises.push(promise);
      }

      // Wait for all rows to be created
      await Promise.all(promises);

      // Update the data state with all new rows
      setData((prevData) => [...prevData, ...newRows]);
    } catch (error) {
      console.error("Error adding 100 rows:", error);
    } finally {
      setIsAddingRows(false);
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
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "DATE" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "DATE")}
            >
              Date
            </div>
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "BOOLEAN" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "BOOLEAN")}
            >
              Boolean
            </div>
            <div
              className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "SELECT" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => changeColumnType(columnId, "SELECT")}
            >
              Select
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create column helper with type safety
  const columnHelper = createColumnHelper<TableRow>();

  // State to track which cell is being edited
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

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
            const isEditing =
              editingCell?.rowId === rowId &&
              editingCell?.columnId === columnId;

            // Use the editing value if it exists, otherwise use the data value
            const value =
              cellKey in editingCells
                ? editingCells[cellKey]
                : row.original[columnId] || "";

            // If the cell is being edited, show an input field
            if (isEditing) {
              return (
                <input
                  type={columnTypes[columnId] === "NUMBER" ? "number" : "text"}
                  value={value}
                  onChange={(e) =>
                    handleCellChange(rowId, columnId, e.target.value)
                  }
                  onBlur={() => {
                    handleCellBlur(rowId, columnId);
                    setEditingCell(null);
                  }}
                  autoFocus
                  className="w-full p-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              );
            }

            // Otherwise, show a display-only div that can be clicked to edit
            return (
              <div
                className="w-full cursor-pointer p-2 hover:bg-gray-50"
                onClick={() => setEditingCell({ rowId, columnId })}
              >
                {value}
              </div>
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

  // Set up virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 53, // Estimated row height
    overscan: 5,
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

  // Get the virtualized rows
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div className="flex h-full flex-col border border-gray-200">
      <div
        ref={tableContainerRef}
        className="overflow-auto"
        style={{ height: "calc(100vh - 180px)" }} // Adjust height to fit the screen better
      >
        <table className="min-w-full table-fixed border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
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
            {paddingTop > 0 && (
              <tr>
                <td
                  style={{ height: `${paddingTop}px` }}
                  colSpan={table.getAllColumns().length}
                ></td>
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) return null;

              return (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`border-r px-4 py-3 text-sm ${
                        cell.column.id === "select" ? "bg-gray-50" : ""
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td
                  style={{ height: `${paddingBottom}px` }}
                  colSpan={table.getAllColumns().length}
                ></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with Add 100 Rows button */}
      <div className="flex items-center justify-between border-t bg-white px-4 py-2">
        <div className="flex items-center">
          <button
            className="rounded bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            onClick={handleAdd100Rows}
            disabled={isAddingRows}
          >
            {isAddingRows ? "Adding..." : "Add 100 Rows"}
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
