/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { CreateViewModal } from "@/app/_components/tableComponents/CreateViewModal";
import { generateTableColumns } from "./tableComponents/tableUltis";
import { ViewsSidebar } from "./tableComponents/viewSideBar";
import { TableLoadingState } from "./tableComponents/tableLoadingState";
import { DataTable } from "./tableComponents/dataTable";
import {
  AddColumnViewModal,
  type ColumnType,
} from "../_components/tableComponents/addColumnModal";
import Add100RowsButton from "./tableComponents/add100RowsButton";
import { Toolbar } from "./tableComponents/toolBar";
import { SearchResults } from "./tableComponents/searchResults";

interface ViewPanelProps {
  tabId: string;
  views: Array<{
    id: string;
    name: string;
    position: number;
    isDefault: boolean;
    tableId: string;
  }>;
  activeViewId: string;
  onViewChange: (viewId: string) => void;
}

export function ViewPanel({
  tabId,
  views,
  activeViewId,
  onViewChange,
}: ViewPanelProps) {
  const [showCreateViewModal, setShowCreateViewModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [isAddingRows, setIsAddingRows] = useState(false);

  // Toolbar state
  const [viewsSidebarOpen, setViewsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchMessage, setShowSearchMessage] = useState(false);

  const utils = api.useUtils();

  // Create view mutation
  const createView = api.view.create.useMutation({
    onSuccess: async (data) => {
      // Invalidate queries to refresh the data
      await utils.view.getViewsForTab.invalidate({ tabId });

      // Fetch the view data right away
      void utils.view.getView.fetch({ id: data.id });

      // Immediately select the new view
      onViewChange(data.id);

      // Close the modal
      setShowCreateViewModal(false);
    },
  });

  // Query to fetch the latest views for the current tab
  const { data: tabViews } = api.view.getViewsForTab.useQuery(
    { tabId },
    { enabled: !!tabId, staleTime: 0 },
  );

  // Use the most up-to-date views data
  const displayViews = tabViews ?? views;

  // Get data for the active view
  const { data: viewData, isLoading: viewLoading } = api.view.getView.useQuery(
    { id: activeViewId },
    { enabled: !!activeViewId },
  );

  const { data: tableMetadata, isLoading: metadataLoading } =
    api.table.getTableMetadata.useQuery(
      { viewId: activeViewId },
      { enabled: !!activeViewId },
    );

  const isLoading = viewLoading || metadataLoading;

  // Determine which query to use based on search term
  const shouldUseSearch = searchTerm.trim().length > 0;

  // Search query
  const searchQuery = api.table.searchTableData.useQuery(
    { tableId: tableMetadata?.id ?? "", searchTerm: searchTerm.trim() },
    {
      refetchOnWindowFocus: false,
      enabled: shouldUseSearch && !!tableMetadata?.id,
    },
  );

  // Handle creating a new view
  const handleCreateView = (viewName: string) => {
    if (!viewName.trim()) return;

    createView.mutate({
      tabId,
      name: viewName,
      position: views.length,
    });
  };

  // Toggle views sidebar
  const toggleViewsSidebar = () => {
    setViewsSidebarOpen(!viewsSidebarOpen);
  };

  const columns = useMemo(() => {
    if (!tableMetadata || !tableMetadata.columns) return [];
    return generateTableColumns(tableMetadata.columns);
  }, [tableMetadata]);

  // Add row mutation
  const addRow = api.table.addRow.useMutation({
    onSuccess: async () => {
      // Invalidate the table data queries to refresh with the new row
      await utils.table.getTableDataInfinite.invalidate({
        viewId: activeViewId,
      });
    },
  });

  // Add multiple rows mutation
  const addMultipleRows = api.table.addMultipleRows.useMutation({
    onSuccess: async () => {
      // Invalidate the table data queries to refresh with the new rows
      await utils.table.getTableDataInfinite.invalidate({
        viewId: activeViewId,
      });
      setIsAddingRows(false);
    },
    onError: (error) => {
      console.error("Error adding 100 rows:", error);
      setIsAddingRows(false);
      // Show error to user
      alert("Failed to add rows. Please try again.");
    },
  });

  // Add column mutation
  const addColumn = api.table.addColumn.useMutation({
    onSuccess: async () => {
      // Close the modal
      setShowAddColumnModal(false);

      // Invalidate the table data queries
      await utils.table.getTableMetadata.invalidate({ viewId: activeViewId });
      await utils.table.getTableDataInfinite.invalidate({
        viewId: activeViewId,
      });
    },
  });

  // Handle adding a new row
  const handleAddRow = (tableId: string) => {
    addRow.mutate({ tableId });
  };

  // Handle adding 100 rows
  const handleAdd100Rows = () => {
    if (isAddingRows || !tableMetadata) return;

    setIsAddingRows(true);

    addMultipleRows.mutate({
      tableId: tableMetadata.id,
      count: 100,
    });
  };

  // Handle adding a new column
  const handleAddColumn = (name: string, type: ColumnType) => {
    if (!tableMetadata) return;

    addColumn.mutate({
      tableId: tableMetadata.id,
      name,
      type,
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar
        viewId={activeViewId}
        isViewsSidebarOpen={viewsSidebarOpen}
        toggleViewsSidebar={toggleViewsSidebar}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setIsSearching={setIsSearching}
        setShowSearchMessage={setShowSearchMessage}
      />

      <div className="flex">
        {/* Sidebar with views - fixed height, non-scrollable */}
        <div
          className={`h-full ${viewsSidebarOpen ? "w-80" : "w-0 overflow-hidden"} transition-all duration-300 ease-in-out`}
        >
          <ViewsSidebar
            views={displayViews}
            activeViewId={activeViewId}
            onViewChange={onViewChange}
            onCreateView={() => setShowCreateViewModal(true)}
          />
        </div>

        {/* Main content area - Table display with scrollable content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <TableLoadingState />
          ) : tableMetadata ? (
            <div className="flex h-full flex-col">
              {/* Header area */}
              <div className="border-b border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{viewData?.name}</h2>
                  <Add100RowsButton
                    onClick={handleAdd100Rows}
                    isLoading={isAddingRows}
                  />
                </div>
              </div>

              {/* SearchResults component */}
              <SearchResults
                searchTerm={searchTerm}
                isSearching={isSearching}
                showSearchMessage={showSearchMessage}
                resultCount={searchQuery.data?.rows?.length}
              />

              {/* Table container - scrollable */}
              <div className="flex-1 overflow-hidden p-4">
                <DataTable
                  viewId={activeViewId}
                  columns={columns}
                  onAddRow={handleAddRow}
                  onAddColumn={() => setShowAddColumnModal(true)}
                  isAddingRow={addRow.isPending}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Select a view to see data</p>
            </div>
          )}
        </div>

        {/* Add Column Modal */}
        <AddColumnViewModal
          isOpen={showAddColumnModal}
          onClose={() => setShowAddColumnModal(false)}
          onAddColumn={handleAddColumn}
          isPending={addColumn.isPending}
        />

        {/* Create View Modal */}
        <CreateViewModal
          isOpen={showCreateViewModal}
          onClose={() => setShowCreateViewModal(false)}
          onCreateView={handleCreateView}
          isPending={createView.isPending}
        />
      </div>
    </div>
  );
}
