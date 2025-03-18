/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Plus, Loader2 } from "lucide-react";
import type { View } from "@/type/db";
import { CreateViewModal } from "@/app/_components/CreateViewModal";

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

  const utils = api.useUtils();

  // Create view mutation
  const createView = api.view.create.useMutation({
    onSuccess: async (data) => {
      await utils.view.getViewsForTab.invalidate({ tabId });
      onViewChange(data.id);
      setShowCreateViewModal(false);
    },
  });

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

  return (
    <div className="flex h-full w-full">
      {/* Sidebar with views */}
      <div className="w-48 border-r bg-gray-50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Views</h3>
          <button
            onClick={() => setShowCreateViewModal(true)}
            className="rounded p-1 text-gray-500 hover:bg-gray-200"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-1">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm ${
                view.id === activeViewId
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {view.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area - Table display */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : tableData ? (
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">{viewData?.name}</h2>

            {/* Simple table display - in a real app, you'd have a more complex table component */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tableData.columns?.map((column) => (
                      <th
                        key={column.id}
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tableData.formattedRows?.map((row) => (
                    <tr key={row.id}>
                      {tableData.columns?.map((column) => (
                        <td
                          key={`${row.id}-${column.id}`}
                          className="whitespace-nowrap px-6 py-4 text-sm text-gray-500"
                        >
                          {row.cells[column.id] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">Select a view to see data</p>
          </div>
        )}
      </div>

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
