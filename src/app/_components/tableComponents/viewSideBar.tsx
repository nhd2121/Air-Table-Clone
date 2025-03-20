import ViewSelectButton from "./viewSelectButton";
import CreateViewButton from "./createViewButton";

interface ViewsSidebarProps {
  views: Array<{
    id: string;
    name: string;
    position: number;
    isDefault: boolean;
    tableId: string;
  }>;
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  onCreateView: () => void;
}

export function ViewsSidebar({
  views,
  activeViewId,
  onViewChange,
  onCreateView,
}: ViewsSidebarProps) {
  return (
    <div className="h-full w-80 border-r border-gray-200 bg-gray-50">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {views.map((view) => (
              <ViewSelectButton
                key={view.id}
                id={view.id}
                name={view.name}
                isActive={view.id === activeViewId}
                onSelect={onViewChange}
              />
            ))}
          </div>
        </div>

        {/* Create View Button at the bottom */}
        <div className="border-t border-gray-200 p-3">
          <CreateViewButton
            onClick={onCreateView}
            label="Create View"
            className="flex w-full items-center justify-between rounded bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
}
