import ViewSelectButton from "./viewSelectButton";
import CreateViewButton from "./createViewButton";
import {
  Search,
  Calendar,
  Image as GalleryIcon,
  Kanban,
  BarChart3 as TimelineIcon,
  List,
  GanttChart,
  FormInput,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

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
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const toggleCreateMenu = () => {
    setIsCreateMenuOpen(!isCreateMenuOpen);
  };
  return (
    <div className="h-full w-80 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          {/* Search bar */}
          <div className="flex items-center px-3 py-2">
            <div className="group relative flex-1">
              <div className="leading-[1.5 pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 transform text-[13px] font-normal">
                <Search size={20} className="text-black" />
              </div>
              <input
                type="text"
                placeholder="Find a view"
                className="w-full border-0 border-b border-gray-200 bg-transparent py-2 pl-8 pr-2 text-[13px] text-sm font-normal leading-[1.5] outline-none transition-colors duration-200 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Views list */}
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

        {/* Create dropdown section */}
        <div className="border-b border-t border-gray-200 p-2">
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left"
            onClick={toggleCreateMenu}
          >
            <span className="text-[13px] font-bold leading-[1.5]">
              Create...
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isCreateMenuOpen ? "rotate-180 transform" : ""}`}
            />
          </button>

          <div
            className={`mt-2 space-y-2 ${!isCreateMenuOpen ? "hidden" : ""}`}
          >
            {/* View button */}
            <CreateViewButton
              onClick={onCreateView}
              label="View"
              className="flex w-full items-center justify-between rounded bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-100"
            />

            {/* Calendar */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <span className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-600" />
                Calendar
              </span>
              <Plus size={16} />
            </button>

            {/* Gallery */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <span className="flex items-center">
                <GalleryIcon size={16} className="mr-2 text-purple-600" />
                Gallery
              </span>
              <Plus size={16} />
            </button>

            {/* Kanban */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <span className="flex items-center">
                <Kanban size={16} className="mr-2 text-green-600" />
                Kanban
              </span>
              <Plus size={16} />
            </button>

            {/* Timeline */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <div className="flex items-center justify-start gap-2">
                <span className="flex items-center">
                  <TimelineIcon size={16} className="mr-2 text-pink-600" />
                  Timeline
                </span>
                <span className="rounded-2xl bg-blue-100 px-1 py-1 text-xs text-blue-800">
                  Team
                </span>
              </div>
              <Plus size={16} />
            </button>

            {/* List */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <span className="flex items-center">
                <List size={16} className="mr-2 text-blue-600" />
                List
              </span>
              <Plus size={16} />
            </button>

            {/* Gantt */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <div className="flex items-center justify-start gap-2">
                <span className="flex items-center">
                  <GanttChart size={16} className="mr-2 text-teal-600" />
                  Gantt
                </span>
                <span className="rounded-2xl bg-blue-100 px-1 py-1 text-xs text-blue-800">
                  Team
                </span>
              </div>
              <Plus size={16} />
            </button>

            {/* New section */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <div className="flex items-center justify-start gap-2">
                <span className="flex items-center text-gray-800">
                  New section
                </span>
                <span className="rounded-2xl bg-blue-100 px-1 py-1 text-xs text-blue-800">
                  Team
                </span>
              </div>
              <Plus size={16} />
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-200"></div>

            {/* Form */}
            <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium leading-[1.5] text-black hover:bg-gray-100">
              <span className="flex items-center">
                <FormInput size={16} className="mr-2 text-pink-600" />
                Form
              </span>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
