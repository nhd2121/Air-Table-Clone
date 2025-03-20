/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { ViewPanel } from "@/app/_components/viewPanel";
import { TopNavbar } from "@/app/_components/tableComponents/topNavBar";
import { TabBar } from "@/app/_components/tableComponents/tabBar";

interface BasePageProps {
  baseId: string;
}

export function BasePage({ baseId }: BasePageProps) {
  console.log("access to base page");
  const router = useRouter();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isCreatingTab, setIsCreatingTab] = useState(false);

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

  useEffect(() => {
    if (base?.tabs && base.tabs.length > 0 && !activeTabId) {
      // Select the first tab
      const firstTab = base.tabs[0];
      setActiveTabId(firstTab.id);

      // Select the default or first view in that tab when navigating to base page
      if (firstTab.views && firstTab.views.length > 0) {
        const defaultView = firstTab.views.find((view) => view.isDefault);
        setActiveViewId(defaultView?.id ?? firstTab.views[0].id);
      }
    }
  }, [base, activeTabId]);

  const utils = api.useUtils();

  // Create a new tab
  const createTab = api.tab.create.useMutation({
    onSuccess: (newTab) => {
      // Set creating state to false
      setIsCreatingTab(false);

      // Invalidate queries to refresh the data
      void utils.base.getById.invalidate({ id: baseId });

      // Select the newly created tab
      setActiveTabId(newTab.id);

      // Select the first view of the new tab
      if (newTab.views && newTab.views.length > 0) {
        setActiveViewId(newTab.views[0].id);
      }
    },
    onError: (error) => {
      console.error("Error creating tab:", error);
      setIsCreatingTab(false);
    },
  });

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);

    // When changing tabs, find the default view or first view of that tab
    const tab = base?.tabs.find((t) => t.id === tabId);
    if (tab?.views && tab.views.length > 0) {
      const defaultView = tab.views.find((view) => view.isDefault);
      setActiveViewId(defaultView?.id ?? tab.views[0].id);
    } else {
      setActiveViewId(null);
    }
  };

  // Handle creating a new tab
  const handleCreateTab = () => {
    if (!baseId || isCreatingTab) return;

    setIsCreatingTab(true);

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
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!base) {
    return (
      <div className="flex h-screen flex-col">
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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Navbar Component */}
      <TopNavbar baseName={base.name || "Untitled Base"} baseId={baseId} />

      {/* Tab Bar Component */}
      <TabBar
        tabs={base.tabs || []}
        activeTabId={activeTabId}
        onTabSelect={handleTabChange}
        onTabCreate={handleCreateTab}
        isCreatingTab={isCreatingTab}
      />

      {/* Main Content Area with View Panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
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
