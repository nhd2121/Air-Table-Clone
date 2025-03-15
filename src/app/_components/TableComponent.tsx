/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import { ChevronLeft, Plus } from "lucide-react";
import { AddColumnModal, type ColumnType } from "./AddColumnModal";
import { CreateViewModal } from "./CreateViewModal";
import { ColumnTypeDropdown } from "./ColumnTypeDropdown";
import { SearchBarTable } from "./SearchBarTable";
import LoadingTableData from "./LoadingTableData";
import type { View } from "@/type/db";
import type { TableRow } from "@/type/db";
import AddRowsButton from "./AddRowsButton";
import RecordCountFooter from "./RecordCountFooter";
import AddRecordButton from "./AddRecordButton";
import type { ColumnTypesState, TableComponentProps } from "./types/type";
import CreateColumnButton from "./CreateColumnButton";
import ViewSelectButton from "./ViewSelectButton";
import ToggleViewSidebarButton from "./ToolbarButton";

const TableComponent: React.FC<TableComponentProps> = ({ tableId }) => {
  // State to track data
  const [data, setData] = useState<TableRow[]>([]);
  // Column types
  const [columnTypes, setColumnTypes] = useState<ColumnTypesState>({});
  // State for active dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // State for add column modal
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  // State to track if we're adding 100 rows
  const [isAddingRows, setIsAddingRows] = useState(false);
  // Reference to table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Local state to track current edits before sending to database
  const [editingCells, setEditingCells] = useState<Record<string, string>>({});

  // Views sidebar state
  const [viewsSidebarOpen, setViewsSidebarOpen] = useState(false);
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showCreateViewModal, setShowCreateViewModal] = useState(false);

  // Add search functionality
  const [searchTerm, setSearchTerm] = useState("");
  // State to track if the search is being performed
  const [isSearching, setIsSearching] = useState(false);
  // Track if we should show a message about performing a search
  const [showSearchMessage, setShowSearchMessage] = useState(false);

  const viewsSidebarRef = useRef<HTMLDivElement>(null);

  // Access the utility functions for invalidating queries
  const utils = api.useUtils();

  // Fetch views for the current table
  const { data: viewsData, isLoading: isLoadingViews } =
    api.view.getViewsForTable.useQuery(
      { tableId },
      {
        enabled: !!tableId,
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
          if (data && data.length > 0) {
            // Set the views in state
            setViews(data as View[]);

            // Set the first view as active by default if no active view
            if (!activeViewId && data[0]) {
              setActiveViewId(data[0].id);
            }
          }
        },
      },
    );

  // Reset active view and views when tableId changes
  useEffect(() => {
    setActiveViewId(null);
    setViews([]);
  }, [tableId]);

  // Set views data when it's loaded
  useEffect(() => {
    if (viewsData) {
      setViews(viewsData as View[]);

      // If no active view is set but we have views, set the first one as active
      if (!activeViewId && viewsData.length > 0) {
        if (viewsData[0]) {
          setActiveViewId(viewsData[0].id);
        }
      }
    }
  }, [viewsData, activeViewId]);

  // Create view mutation
  const createView = api.view.create.useMutation({
    onSuccess: (newView) => {
      // Update local views state
      setViews((prevViews) => [...prevViews, newView as View]);

      // Set the new view as active
      setActiveViewId(newView.id);

      // Close modal and reset form
      setShowCreateViewModal(false);

      // Invalidate views query to refresh data
      utils.view.getViewsForTable.invalidate({ tableId });
    },
  });

  // Handle creating a new view
  const handleCreateView = (viewName: string) => {
    if (!viewName.trim()) return;

    createView.mutate({
      tableId,
      name: viewName,
      config: {}, // Empty config for now
    });
  };

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
    },
  );

  useEffect(() => {
    if (shouldUseSearch && !searchQuery.isLoading) {
      setIsSearching(false);
    }
  }, [searchQuery.isLoading, shouldUseSearch]);

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
      tableData.columns.forEach(
        (col: { id: string | number; type: string }) => {
          types[col.id] = col.type as ColumnType;
        },
      );
      setColumnTypes(types);

      // Initialize data with rows
      if (tableData.rows) {
        // Ensure all rows conform to the TableRow interface by explicitly checking for id
        const typedRows: TableRow[] = tableData.rows.map((row: TableRow) => {
          // Make sure each row has an id
          if (!("id" in row)) {
            console.error("Row is missing id property", row);
          }
          return row;
        });
        setData(typedRows);
      }
    }
  }, [tableData]);

  // Toggle views sidebar
  const toggleViewsSidebar = () => {
    setViewsSidebarOpen(!viewsSidebarOpen);
  };

  // Handle selecting a view
  const handleViewSelect = (viewId: string) => {
    setActiveViewId(viewId);
    // Here you would apply the view's configuration (filters, sorts, etc.)
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

  // When cell edit is complete, update both local state and database without causing a full table reload
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
        onSuccess: () => {
          if (shouldUseSearch) {
            utils.table.searchTableData.setData(
              { tableId, searchTerm: searchTerm.trim() },
              (oldData: { rows: TableRow[] } | undefined) => {
                if (!oldData) return oldData;

                // Update just the specific cell in the cached data
                const updatedRows = oldData.rows.map((row: TableRow) => {
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
            (col: { id: string }) => col.id === cell.columnId,
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
            (
              oldData:
                | { columns: { id: string; name: string; type: string }[] }
                | undefined,
            ) => {
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

  const addMultipleRows = api.table.addMultipleRows.useMutation({
    onSuccess: (response) => {
      if (response && tableData) {
        // Convert the server response to TableRow format
        const newRows = response.map((newRow: any) => {
          const newRowObj: TableRow = { id: newRow.id };
          newRow.cells.forEach((cell: any) => {
            const column = tableData.columns.find(
              (col: { id: any }) => col.id === cell.columnId,
            );
            if (column) {
              newRowObj[column.id] = cell.value ?? "";
            }
          });
          return newRowObj;
        });

        // Replace all temp rows with real rows
        setData((prev) => {
          // Filter out temporary rows
          const nonTempRows = prev.filter((row) => !row.id.startsWith("temp-"));
          // Add the new real rows
          return [...nonTempRows, ...newRows];
        });
      }
    },
    onError: (error) => {
      console.error("Error adding 100 rows:", error);

      // Clean up temporary rows on error
      setData((prev) => prev.filter((row) => !row.id.startsWith("temp-")));

      // Show error to user
      alert("Failed to add rows. Please try again.");
    },
    onSettled: () => {
      setIsAddingRows(false);
    },
  });

  // Handle adding 100 rows
  const handleAdd100Rows = async () => {
    if (isAddingRows || !tableData) return;

    setIsAddingRows(true);

    try {
      // Create temporary placeholder rows for UI feedback
      const tempRows: TableRow[] = [];
      for (let i = 0; i < 100; i++) {
        const tempRowId = `temp-${Date.now()}-${i}`;
        const tempRow: TableRow = { id: tempRowId };

        // Add empty values for all columns
        tableData.columns.forEach((col: { id: string | number }) => {
          tempRow[col.id] = "";
        });

        tempRows.push(tempRow);
      }

      // Add all temp rows to UI immediately for better user experience
      setData((prev) => [...prev, ...tempRows]);

      // Call the mutation with the correct syntax
      addMultipleRows.mutate({
        tableId,
        count: 100,
      });
    } catch (error) {
      console.error("Error in handleAdd100Rows:", error);

      // Clean up temporary rows on error
      setData((prev) => prev.filter((row) => !row.id.startsWith("temp-")));
      setIsAddingRows(false);
    }
  };

  const handleAddRow = () => {
    if (!tableData) return;

    addRow.mutate({
      tableId,
    });
  };

  // Handle adding a new column
  const handleAddColumn = (
    columnName: string,
    columnType: ColumnType,
  ): void => {
    if (!columnName.trim()) {
      return;
    }

    addColumn.mutate({
      tableId,
      name: columnName.trim(),
      type: columnType,
    });
  };

  // Add Column Button Component for the column header
  const AddColumnHeader: React.FC = () => {
    return <CreateColumnButton onClick={() => setShowAddColumnModal(true)} />;
  };

  // Handle column type change
  const handleColumnTypeChange = (columnId: string, type: ColumnType): void => {
    setColumnTypes((prevTypes) => ({
      ...prevTypes,
      [columnId]: type,
    }));
    setActiveDropdown(null);
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
          <div className="flex items-center pl-2">
            <input type="checkbox" className="h-4 w-4 rounded text-blue-500" />
          </div>
        ),
        cell: () => (
          <div className="flex items-center pl-2">
            <input type="checkbox" className="h-4 w-4 rounded text-blue-500" />
          </div>
        ),
        size: 40,
      }),
    ];

    // Add data columns using columnHelper.accessor properly
    tableData.columns.forEach((column: { id: string; name: string }) => {
      columns.push(
        // Use display column instead of accessor for dynamic properties
        columnHelper.display({
          id: column.id,
          header: () => (
            <ColumnTypeDropdown
              columnId={column.id}
              label={column.name}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              columnTypes={columnTypes}
              onTypeChange={handleColumnTypeChange}
            />
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
                  className="w-full p-2 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              );
            }

            // Otherwise, show a display-only div that can be clicked to edit
            return (
              <div
                className="w-full cursor-pointer p-2 hover:bg-gray-50"
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                onClick={() => setEditingCell({ rowId, columnId })}
              >
                {value}
              </div>
            );
          },
          size: 200, // Match the design with larger column widths
        }),
      );
    });

    // Add the "Add Column" button as the last column
    columns.push(
      columnHelper.display({
        id: "add-column",
        header: () => <AddColumnHeader />,
        cell: () => null, // Empty cells for this column
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
    estimateSize: () => 45, // Slightly smaller row height to match the design
    overscan: 10,
  });

  if (isLoading && !isSearching) {
    return <LoadingTableData />;
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
    <div className="relative flex h-full w-full">
      {/* Views Sidebar */}
      <div
        ref={viewsSidebarRef}
        className={`absolute inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out ${
          viewsSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "250px" }}
      >
        <div className="flex h-full flex-col border-r border-gray-200 bg-white shadow-md">
          <button
            onClick={toggleViewsSidebar}
            className="flex items-center justify-between rounded border-b border-gray-200 p-3 text-gray-500 hover:bg-gray-100"
          >
            <h3 className="text-lg font-medium">Views</h3>
            <ChevronLeft size={18} />
          </button>

          {/* Views List */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingViews ? (
              <div className="flex items-center justify-center p-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              </div>
            ) : (
              <ul className="space-y-1">
                {views.map((view) => (
                  <li key={view.id}>
                    {/* View Button */}
                    <ViewSelectButton
                      key={view.id}
                      id={view.id}
                      name={view.name}
                      isActive={activeViewId === view.id}
                      onSelect={handleViewSelect}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Create View Button */}
          <div className="border-t border-gray-200 p-3">
            <button
              onClick={() => setShowCreateViewModal(true)}
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} className="mr-1" />
              Create new view
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full w-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-gray-200 bg-white p-2">
          <div className="flex items-center justify-between">
            {/* Toggle view sidebar Components */}
            <div className="flex items-center space-x-2">
              <ToggleViewSidebarButton
                isOpen={viewsSidebarOpen}
                onClick={toggleViewsSidebar}
                label="Views"
              />
            </div>

            {/* Search Bar Component */}
            <SearchBarTable
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setIsSearching={setIsSearching}
              setShowSearchMessage={setShowSearchMessage}
            />
          </div>
        </div>

        {/* Search Results Status */}
        {(isSearching || showSearchMessage) && (
          <div className="bg-blue-50 px-4 py-2 text-sm text-blue-600">
            <div className="flex items-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              Searching for &quot;{searchTerm}&quot;...
            </div>
          </div>
        )}

        {/* Search Results Count - Only show after search is complete */}
        {searchTerm && !isSearching && !showSearchMessage && (
          <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
            Found {data.length} {data.length === 1 ? "result" : "results"} for
            &quot;{searchTerm}&quot;
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

        {/* Make the table container fill the available width */}
        <div ref={tableContainerRef} className="w-full flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.column.getSize() }}
                      className="border-r border-gray-200 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                  {/* Add an empty column as a spacer at the end */}
                  <th className="w-10 border-none"></th>
                </tr>
              ))}
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td
                    style={{ height: `${paddingTop}px` }}
                    colSpan={table.getAllColumns().length + 1}
                  ></td>
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 hover:bg-blue-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-r border-gray-200 px-0 py-0 text-sm text-gray-800"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                    {/* Add an empty cell at the end */}
                    <td className="w-10 border-none"></td>
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td
                    style={{ height: `${paddingBottom}px` }}
                    colSpan={table.getAllColumns().length + 1}
                  ></td>
                </tr>
              )}

              {/* Add a row at the bottom with the "+" button to add new records */}
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="border-r border-gray-200 p-0">
                  <AddRecordButton handleAddRow={handleAddRow} />
                </td>
                {/* Empty cells for the rest of the row */}
                {Array.from({ length: table.getAllColumns().length - 1 }).map(
                  (_, i) => (
                    <td key={i}></td>
                  ),
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer with row count */}
        <RecordCountFooter count={data.length} searchTerm={searchTerm} />

        {/* Add Row Button - add this fixed button */}
        <AddRowsButton
          handleAdd100Rows={handleAdd100Rows}
          isAddingRows={isAddingRows}
          isSearching={isSearching}
        />

        <AddColumnModal
          isOpen={showAddColumnModal}
          onClose={() => setShowAddColumnModal(false)}
          onAddColumn={handleAddColumn}
          isPending={addColumn.isPending}
        />

        <CreateViewModal
          isOpen={showCreateViewModal}
          onClose={() => setShowCreateViewModal(false)}
          onCreateView={handleCreateView}
          isPending={createView.isPending}
        />
      </div>
    </div>
  );
};

export default TableComponent;
