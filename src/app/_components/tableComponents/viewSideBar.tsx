import { Plus } from "lucide-react";
import type { View } from "@/type/db";

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
    <div className="w-48 border-r bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-700">Views</h3>
        <button
          onClick={onCreateView}
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
  );
}
