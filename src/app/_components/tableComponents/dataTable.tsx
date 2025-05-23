/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { AddColumnButton } from "./addColumnButton";
import { api } from "@/trpc/react";
import RecordCountFooter from "./recordCountFooter";
import AddRowButton from "./addRowButton";

interface DataTableProps<TData> {
  viewId: string;
  columns: ColumnDef<TData, any>[];
  className?: string;
  onAddRow: (tableId: string) => void;
  onAddColumn: () => void;
  isAddingRow?: boolean;
  searchResults?: {
    rows?: any[];
    table?: any;
  };
  isSearching?: boolean;
  searchTerm?: string;
}

export function DataTable<TData>({
  viewId,
  columns,
  className = "",
  onAddRow,
  onAddColumn,
  isAddingRow = false,
  searchResults,
  searchTerm = "",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const ROWS_PER_PAGE = 50;
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // State for handling cell editing
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Utility function to access the APIs
  const utils = api.useUtils();

  // Use the infinite query hook to fetch data
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = api.table.getTableDataInfinite.useInfiniteQuery(
    {
      viewId,
      limit: ROWS_PER_PAGE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 15000, // 15 seconds
      refetchOnWindowFocus: false,
      enabled: !searchTerm,
    },
  );

  // Determine if we're in search mode
  const isSearchActive = !!searchTerm && searchTerm.trim().length > 0;

  // Extract all rows from all pages
  const flattenedRows = useMemo(() => {
    // If searching, use search results
    if (isSearchActive && searchResults?.rows) {
      return searchResults.rows;
    }

    // Otherwise use infinite query data
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.rows);
  }, [infiniteData, searchResults, isSearchActive]);

  // Get tableId from the appropriate source
  const tableId = useMemo(() => {
    if (isSearchActive && searchResults?.table?.id) {
      return searchResults.table.id;
    }
    return infiniteData?.pages[0]?.table?.id ?? "";
  }, [infiniteData, searchResults, isSearchActive]);

  // Get total count appropriately
  const totalCount = useMemo(() => {
    if (isSearchActive && searchResults?.rows) {
      return searchResults.rows.length;
    }
    return infiniteData?.pages[0]?.totalCount;
  }, [infiniteData, searchResults, isSearchActive]);

  // Set up virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage
      ? flattenedRows.length + 1 // +1 for loading more row
      : flattenedRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Default row height
    overscan: 10, // Number of items to render above/below the visible area
  });

  // Observer for the last row to fetch more data when it comes into view
  const lastRowRef = useRef<HTMLTableRowElement>(null);

  // Observer to detect when we're near the bottom of the list
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Only fetch more when not in search mode
        const entry = entries[0];
        if (
          !isSearchActive &&
          entry?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentLastRow = lastRowRef.current;
    if (currentLastRow) {
      observer.observe(currentLastRow);
    }

    return () => {
      if (currentLastRow) {
        observer.unobserve(currentLastRow);
      }
    };
  }, [
    lastRowRef,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSearchActive,
  ]);

  // Handle scroll events to detect when user has scrolled to bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!tableContainerRef.current || isSearchActive) return;

      const { scrollTop, scrollHeight, clientHeight } =
        tableContainerRef.current;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      if (
        distanceFromBottom < 300 &&
        hasNextPage &&
        !isFetchingNextPage &&
        !hasScrolledToBottom
      ) {
        setHasScrolledToBottom(true);
        void fetchNextPage();
      }

      if (distanceFromBottom > 500 && hasScrolledToBottom) {
        setHasScrolledToBottom(false);
      }
    };

    const scrollElement = tableContainerRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    hasScrolledToBottom,
    isSearchActive,
  ]);

  // Cell update mutation
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => {
      // Invalidate the query to refresh the table data
      void utils.table.getTableDataInfinite.invalidate({ viewId });
    },
  });

  // Create column definitions with cell editing capabilities
  const enhancedColumns = useMemo(() => {
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
              className="rounded border-none bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          );
        }

        return (
          <div
            className="h-[31px] cursor-pointer rounded px-2 py-1.5 text-[13px] font-normal leading-[1.5] hover:bg-blue-100"
            onClick={() => handleCellClick(rowId, columnId, value)}
            style={{
              width: "179px",
              maxWidth: "179px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
            title={value || ""}
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
    data: flattenedRows as any[],
    columns: allColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Specify that rows have stable IDs for virtualization
    getRowId: (row: any) => row.id,
  });

  // Get the virtualized rows and calculate padding
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading data...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col rounded-md border border-gray-300 shadow-sm ${className}`}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-gray-50">
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
                    className={`h-[31px] px-2 py-1.5 text-left text-sm font-medium text-gray-600 ${
                      index < headerGroup.headers.length - 1
                        ? "border-r border-gray-300"
                        : ""
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                    style={
                      header.id === "add-column"
                        ? { width: "50px", minWidth: "50px" }
                        : {
                            width: "179px",
                            minWidth: "179px",
                            maxWidth: "179px",
                          }
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
        </table>
      </div>

      {/* Scrollable Table Body */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td
                  style={{ height: `${paddingTop}px` }}
                  colSpan={table.getAllColumns().length}
                />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              // Handle the loading more row
              const isLoaderRow = virtualRow.index >= flattenedRows.length;

              if (isLoaderRow) {
                return hasNextPage ? (
                  <tr
                    key="loader"
                    ref={lastRowRef}
                    className="border-b border-gray-200 text-center"
                  >
                    <td colSpan={table.getAllColumns().length} className="py-4">
                      <div className="flex items-center justify-center text-gray-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading more rows...
                      </div>
                    </td>
                  </tr>
                ) : null;
              }

              // Get the actual row data
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) return null;

              // Check if it's the last row before the loader row
              const isLastDataRow =
                virtualRow.index === flattenedRows.length - 1;

              return (
                <tr
                  key={row.id}
                  ref={isLastDataRow ? lastRowRef : null}
                  className="border-b border-gray-300 hover:bg-blue-50"
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      key={cell.id}
                      className={`text-sm text-gray-700 ${
                        index < row.getVisibleCells().length - 1
                          ? "border-r border-gray-300"
                          : ""
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
                />
              </tr>
            )}

            {/* Add Row Button as the last row of the table */}
            <tr className="border-t border-gray-300">
              <td colSpan={table.getAllColumns().length} className="p-0">
                <AddRowButton
                  isLoading={isAddingRow}
                  onClick={() => onAddRow(tableId)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer with row count (sticky at bottom) */}
      <div className="sticky bottom-0 z-10 w-full bg-white">
        <RecordCountFooter
          count={flattenedRows.length}
          totalCount={totalCount}
          isLoading={isFetchingNextPage}
          position="relative"
          className="border-t border-gray-200"
        />
      </div>
    </div>
  );
}
