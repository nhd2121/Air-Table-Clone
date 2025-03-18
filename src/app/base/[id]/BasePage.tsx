/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// "use client";

// import { BaseNavbar } from "@/app/_components/mainPageNavBar";
// import TableComponent from "@/app/_components/TableComponent";
// import { useState, useCallback } from "react";
// import type { Table } from "@/type/db";
// import { api } from "@/trpc/react";

// interface BasePageProps {
//   base: {
//     id: string;
//     name: string;
//     description?: string | null;
//   };
//   tables: Table[];
//   firstTableId: string;
// }

// export default function BasePage({
//   base,
//   tables: initialTables,
//   firstTableId,
// }: BasePageProps) {
//   // State to track the currently selected table
//   const [activeTableId, setActiveTableId] = useState(firstTableId);

//   // Maintain tables list in state so we can update it when new tables or views are added
//   const [tables, setTables] = useState(initialTables);

//   const [displayedTableId, setDisplayedTableId] = useState(firstTableId);

//   // Handle table change - this will be passed to both the navbar and the table component
//   const handleTableChange = useCallback((tableId: string) => {
//     setActiveTableId(tableId);
//   }, []);

//   // Handle table creation from the navbar
//   const handleTableCreated = useCallback((newTable: Table) => {
//     // Add the new table to our state
//     setTables((currentTables) => [...currentTables, newTable]);
//     // Select the newly created table
//     setActiveTableId(newTable.id);
//   }, []);

//   // Query to get all tables for the base to ensure our list stays up to date
//   api.table.getTablesForBase.useQuery(
//     { baseId: base.id },
//     {
//       enabled: !!base.id,
//       refetchOnWindowFocus: true,
//       onSuccess: (fetchedTables) => {
//         // Update tables list if it doesn't match what's in the database
//         if (fetchedTables.length !== tables.length) {
//           setTables(fetchedTables);
//         }
//       },
//     },
//   );

//   return (
//     <div className="flex h-screen flex-col overflow-hidden">
//       <BaseNavbar
//         baseName={base.name}
//         baseId={base.id}
//         tables={tables}
//         onTableSelect={handleTableChange}
//         onTableCreated={handleTableCreated}
//         activeTableId={activeTableId}
//       />
//       {/* Make the table component take up full width and pass the onTableSelect callback */}
//       <div className="h-[calc(100vh-104px)] w-full flex-1 overflow-hidden">
//         <TableComponent
//           tableId={activeTableId}
//           key={activeTableId}
//           onTableSelect={handleTableChange}
//           setActiveTableId={setActiveTableId}
//           displayedTableId={displayedTableId}
//           setDisplayedTableId={setDisplayedTableId}
//         />
//       </div>
//     </div>
//   );
// }

"use client";

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import NavBar from "@/app/_components/navBar";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Settings } from "lucide-react";
import { ViewPanel } from "@/app/_components/ViewPanel";

interface BasePageProps {
  baseId: string;
}

export function BasePage({ baseId }: BasePageProps) {
  console.log("access to base page");
  const router = useRouter();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showCreateTabModal, setShowCreateTabModal] = useState(false);

  // Fetch base data with tabs and views
  const { data: base, isLoading } = api.base.getById.useQuery(
    { id: baseId },
    {
      enabled: !!baseId,
      onSuccess: (data) => {
        // Set active tab to first tab if not already set
        if (!activeTabId && data?.tabs && data.tabs.length > 0) {
          setActiveTabId(data.tabs[0].id);

          // Set active view to default view or first view
          const firstTab = data.tabs[0];
          if (firstTab.views && firstTab.views.length > 0) {
            const defaultView = firstTab.views.find((view) => view.isDefault);
            setActiveViewId(defaultView?.id || firstTab.views[0].id);
          }
        }
      },
    },
  );

  const utils = api.useUtils();

  // Create a new tab
  const createTab = api.tab.create.useMutation({
    onSuccess: (newTab) => {
      // Invalidate queries to refresh the data
      void utils.base.getById.invalidate({ id: baseId });

      // Select the newly created tab
      setActiveTabId(newTab.id);

      // Select the first view of the new tab
      if (newTab.views && newTab.views.length > 0) {
        setActiveViewId(newTab.views[0].id);
      }

      setShowCreateTabModal(false);
    },
  });

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);

    // When changing tabs, find the default view or first view of that tab
    const tab = base?.tabs.find((t) => t.id === tabId);
    if (tab?.views && tab.views.length > 0) {
      const defaultView = tab.views.find((view) => view.isDefault);
      setActiveViewId(defaultView?.id || tab.views[0].id);
    } else {
      setActiveViewId(null);
    }
  };

  // Handle creating a new tab
  const handleCreateTab = () => {
    if (!baseId) return;

    // Find the highest tab position
    const highestPosition =
      base?.tabs?.reduce(
        (max, tab) => (tab.position > max ? tab.position : max),
        -1,
      ) ?? -1;

    createTab.mutate({
      name: `Table ${(base?.tabs?.length || 0) + 1}`,
      baseId,
      position: highestPosition + 1,
    });
  };

  // Find the current active tab
  const activeTab = activeTabId
    ? base?.tabs.find((tab) => tab.id === activeTabId)
    : null;

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <NavBar />
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!base) {
    return (
      <div className="flex h-screen flex-col">
        <NavBar />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600">Base not found</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <NavBar />

      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="flex items-center">
          <h1 className="mr-4 text-xl font-bold">{base.name}</h1>
          <button className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b bg-white">
        <div className="w-full border-b">
          <div className="flex h-10 w-full items-center justify-start px-4">
            {base.tabs?.map((tab) => (
              <div
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`cursor-pointer px-4 py-2 ${
                  activeTabId === tab.id
                    ? "border-b-2 border-blue-600 font-medium text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                {tab.name}
              </div>
            ))}
            <button
              className="ml-2 rounded-md p-1 text-gray-500 hover:bg-gray-100"
              onClick={handleCreateTab}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area with View Panel */}
      <div className="flex h-full">
        {activeTab && activeViewId && (
          <ViewPanel
            tabId={activeTabId as string}
            views={activeTab.views || []}
            activeViewId={activeViewId}
            onViewChange={(viewId) => setActiveViewId(viewId)}
          />
        )}
      </div>
    </div>
  );
}
