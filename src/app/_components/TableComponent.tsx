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

// Define the data structure for each row
interface TableRow {
  id: string;
  [key: string]: string;
}

// Define column type options
type ColumnType = "TEXT" | "NUMBER";

// Define the column types state structure
type ColumnTypesState = Record<string, ColumnType>;

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

  // Add search functionality
  const [searchTerm, setSearchTerm] = useState("");
  // State to track if the search is being performed
  const [isSearching, setIsSearching] = useState(false);
  // Track if we should show a message about performing a search
  const [showSearchMessage, setShowSearchMessage] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  // Ref for search input to implement debounce
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Debounce timeout reference
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Access the utility functions for invalidating queries
  const utils = api.useUtils();

  // Determine which query to use based on search term
  const shouldUseSearch = searchTerm.trim().length > 0;

  // Regular data query
  const regularDataQuery = api.table.getTableData.useQuery(
    { tableId },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 0,
      enabled: !shouldUseSearch,
    },
  );

  // Search query
  const searchQuery = api.table.searchTableData.useQuery(
    { tableId, searchTerm: searchTerm.trim() },
    {
      refetchOnWindowFocus: false,
      enabled: shouldUseSearch,
      onSuccess: () => {
        setIsSearching(false);
      },
      onError: () => {
        setIsSearching(false);
      },
    },
  );

  // Use the appropriate query result based on search state
  const {
    data: tableData,
    isLoading,
    error,
  } = shouldUseSearch ? searchQuery : regularDataQuery;

  // Handle table data when it's loaded
  useEffect(() => {
    if (tableData) {
      // Initialize column types
      const types: ColumnTypesState = {};
      tableData.columns.forEach((col) => {
        types[col.id] = col.type as ColumnType;
      });
      setColumnTypes(types);

      // Initialize data with rows
      if (tableData.rows) {
        // Ensure all rows conform to the TableRow interface by explicitly checking for id
        const typedRows: TableRow[] = tableData.rows.map((row) => {
          // Make sure each row has an id
          if (!("id" in row)) {
            console.error("Row is missing id property", row);
          }
          return row as TableRow;
        });
        setData(typedRows);
      }
    }
  }, [tableData]);

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

  // Modified: When cell edit is complete, update both local state and database
  // without causing a full table reload
  const handleCellBlur = (rowId: string, columnId: string): void => {
    const cellKey = `${rowId}-${columnId}`;
    const value = editingCells[cellKey] ?? "";

    // Skip updates for temporary rows that haven't been created in the database yet
    if (rowId.startsWith("temp-")) {
      return;
    }

    // Update local data state first
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

    // Then update the database without triggering a full data refetch
    updateCell.mutate(
      {
        rowId,
        columnId,
        value,
      },
      {
        // Important: Configure mutation options to prevent automatic invalidation
        onSuccess: () => {
          // We can optionally update a specific query data without refetching
          // This is more targeted than a full invalidation
          if (shouldUseSearch) {
            utils.table.searchTableData.setData(
              { tableId, searchTerm: searchTerm.trim() },
              (oldData) => {
                if (!oldData) return oldData;

                // Update just the specific cell in the cached data
                const updatedRows = oldData.rows.map((row) => {
                  if (row.id === rowId) {
                    return {
                      ...row,
                      [columnId]: value,
                    };
                  }
                  return row;
                });

                return {
                  ...oldData,
                  rows: updatedRows,
                };
              },
            );
          } else {
            utils.table.getTableData.setData({ tableId }, (oldData) => {
              if (!oldData) return oldData;

              // Update just the specific cell in the cached data
              const updatedRows = oldData.rows.map((row) => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    [columnId]: value,
                  };
                }
                return row;
              });

              return {
                ...oldData,
                rows: updatedRows,
              };
            });
          }
        },
      },
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
      // Server should return row with faker data
      if (newRow && tableData) {
        // Convert the cells to a row object
        const newRowObj: TableRow = { id: newRow.id };
        newRow.cells.forEach((cell) => {
          const column = tableData.columns.find(
            (col) => col.id === cell.columnId,
          );
          if (column) {
            newRowObj[column.id] = cell.value ?? "";
          }
        });

        // Update local state
        setData((prev) => [...prev, newRowObj]);
      }
    },
  });

  // Add column mutation
  const addColumn = api.table.addColumn.useMutation({
    onSuccess: (newColumn) => {
      // Reset form values
      setNewColumnName("");
      setNewColumnType("TEXT");
      setShowAddColumnModal(false);

      // Instead of invalidating queries, update the local state
      if (tableData) {
        // Update column types
        setColumnTypes((prev) => ({
          ...prev,
          [newColumn.id]: newColumn.type as ColumnType,
        }));

        // Update columns in tableData without refetching
        if (shouldUseSearch) {
          utils.table.searchTableData.setData(
            { tableId, searchTerm: searchTerm.trim() },
            (oldData) => {
              if (!oldData) return oldData;

              return {
                ...oldData,
                columns: [...oldData.columns, newColumn],
              };
            },
          );
        } else {
          utils.table.getTableData.setData({ tableId }, (oldData) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              columns: [...oldData.columns, newColumn],
            };
          });
        }
      }
    },
  });

  // Update cell mutation
  const updateCell = api.table.updateCell.useMutation();

  // Handle adding 100 rows
  const handleAdd100Rows = async () => {
    if (isAddingRows || !tableData) return;

    setIsAddingRows(true);

    try {
      // Create 100 rows sequentially to avoid overwhelming the database
      for (let i = 0; i < 100; i++) {
        // Create a temporary optimistic row for the UI
        const tempRowId = `temp-${Date.now()}-${i}`;
        const tempRow: TableRow = { id: tempRowId };

        // Add empty values for all columns
        tableData.columns.forEach((col) => {
          tempRow[col.id] = "";
        });

        // Add to UI
        setData((prev) => [...prev, tempRow]);

        // Create the actual row in the database
        const newRow = await addRow.mutateAsync({ tableId });

        // Replace temp row with actual row
        if (newRow) {
          // Convert cells to row object
          const newRowObj: TableRow = { id: newRow.id };
          newRow.cells.forEach((cell) => {
            const column = tableData.columns.find(
              (col) => col.id === cell.columnId,
            );
            if (column) {
              newRowObj[column.id] = cell.value ?? "";
            }
          });

          // Update the data by replacing the temp row
          setData((prev) =>
            prev.map((row) => (row.id === tempRowId ? newRowObj : row)),
          );
        }

        // Add a small delay between batches
        if (i % 10 === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
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

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Set searching state
    if (value.trim()) {
      setIsSearching(true);
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search is empty, immediately clear search results
    if (value.trim() === "") {
      setIsSearching(false);
      return;
    }

    // Show the search message
    setShowSearchMessage(true);

    // Debounce the search to avoid too many requests
    searchTimeoutRef.current = setTimeout(() => {
      // This will trigger the search query due to the dependency on searchTerm
      setShowSearchMessage(false);
    }, 500);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setShowSearchMessage(false);
    // Clear the timeout if it exists
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
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

    // Add data columns using columnHelper.accessor properly
    tableData.columns.forEach((column) => {
      columns.push(
        // Use display column instead of accessor for dynamic properties
        columnHelper.display({
          id: column.id,
          header: () => (
            <ColumnTypeDropdown columnId={column.id} label={column.name} />
          ),
          cell: ({ row }) => {
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
                : (row.original[columnId] ?? "");

            // Highlight matching text if searching
            if (
              !isEditing &&
              searchTerm &&
              (value ?? "")
                .toString()
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            ) {
              const valueLower = (value ?? "").toString().toLowerCase();
              const searchLower = searchTerm.toLowerCase();
              const startIndex = valueLower.indexOf(searchLower);
              const endIndex = startIndex + searchLower.length;

              return (
                <div
                  className="w-full cursor-pointer p-2 hover:bg-gray-50"
                  onClick={() => setEditingCell({ rowId, columnId })}
                >
                  {(value ?? "").toString().substring(0, startIndex)}
                  <span className="bg-yellow-200 font-medium">
                    {(value ?? "").toString().substring(startIndex, endIndex)}
                  </span>
                  {(value ?? "").toString().substring(endIndex)}
                </div>
              );
            }

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
          size: 150, // Add a default size
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
    data: data, // Use the data from the server
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

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading && !isSearching) {
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

  // Use optional chaining to safely access properties
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  return (
    <div className="flex h-full flex-col border border-gray-200">
      {/* Search Bar */}
      <div className="flex items-center border-b border-gray-200 bg-white p-2">
        <div className="relative flex-grow">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search in table..."
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Results Status */}
      {(isSearching || showSearchMessage) && (
        <div className="bg-blue-50 px-4 py-2 text-sm text-blue-600">
          <div className="flex items-center">
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Searching the database for &quot;{searchTerm}&quot;...
          </div>
        </div>
      )}

      {/* Search Results Count - Only show after search is complete */}
      {searchTerm && !isSearching && !showSearchMessage && (
        <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
          Found {data.length} {data.length === 1 ? "result" : "results"} for "
          {searchTerm}&quot;
        </div>
      )}

      {/* No Results Message */}
      {searchTerm &&
        !isSearching &&
        !showSearchMessage &&
        data.length === 0 && (
          <div className="flex h-32 items-center justify-center bg-gray-50 text-gray-500">
            No results found for &quot;{searchTerm}&quot;
          </div>
        )}

      <div
        ref={tableContainerRef}
        className="overflow-auto"
        style={{ height: "calc(100vh - 230px)" }} // Adjust height to account for search bar
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
            disabled={isAddingRows || isSearching}
          >
            {isAddingRows ? "Adding..." : "Add 100 Rows"}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {data.length} {searchTerm ? "matching" : ""} records
        </div>
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
