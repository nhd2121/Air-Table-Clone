/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { CreateViewModal } from "@/app/_components/CreateViewModal";
import type { View } from "@/type/db";
import { generateTableColumns } from "./tableComponents/tableUltis";
import { ViewsSidebar } from "./tableComponents/viewSideBar";
import { TableLoadingState } from "./tableComponents/tableLoadingState";
import { DataTable } from "./tableComponents/dataTable";
import {
  AddColumnViewModal,
  type ColumnType,
} from "../_components/tableComponents/addColumnModal";

interface ViewPanelProps {
  tabId: string;
  views: View[];
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

  // Get the table data for the active view
  const { data: tableData, isLoading: tableLoading } =
    api.table.getTableForView.useQuery(
      { viewId: activeViewId },
      { enabled: !!activeViewId },
    );

  const isLoading = viewLoading || tableLoading;

  // Handle creating a new view
  const handleCreateView = (viewName: string) => {
    if (!viewName.trim()) return;

    createView.mutate({
      tabId,
      name: viewName,
      position: views.length,
    });
  };

  const columns = useMemo(() => {
    if (!tableData || !tableData.columns) return [];
    return generateTableColumns(tableData.columns);
  }, [tableData]);

  // Add row mutation
  const addRow = api.table.addRow.useMutation({
    onSuccess: async (newRow) => {
      // Invalidate the table data query to refresh with the new row
      await utils.table.getTableForView.invalidate({ viewId: activeViewId });

      // Optionally fetch immediately for faster updates
      void utils.table.getTableForView.fetch({ viewId: activeViewId });
    },
  });

  // Add column mutation
  const addColumn = api.table.addColumn.useMutation({
    onSuccess: async (newColumn) => {
      // Close the modal
      setShowAddColumnModal(false);

      // Invalidate the table data query to refresh with the new column
      await utils.table.getTableForView.invalidate({ viewId: activeViewId });

      // Optionally fetch immediately for faster updates
      void utils.table.getTableForView.fetch({ viewId: activeViewId });
    },
  });

  // Handle adding a new row
  const handleAddRow = (tableId: string) => {
    addRow.mutate({ tableId });
  };

  // Handle adding a new column
  const handleAddColumn = (name: string, type: ColumnType) => {
    if (!tableData) return;

    addColumn.mutate({
      tableId: tableData.id,
      name,
      type,
    });
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar with views */}
      <ViewsSidebar
        views={displayViews}
        activeViewId={activeViewId}
        onViewChange={onViewChange}
        onCreateView={() => setShowCreateViewModal(true)}
      />

      {/* Main content area - Table display */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <TableLoadingState />
        ) : tableData ? (
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">{viewData?.name}</h2>

            <DataTable
              data={tableData.formattedRows || []}
              columns={columns}
              tableId={tableData.id}
              onAddRow={handleAddRow}
              onAddColumn={() => setShowAddColumnModal(true)}
              isAddingRow={addRow.isPending}
            />
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
  );
}
