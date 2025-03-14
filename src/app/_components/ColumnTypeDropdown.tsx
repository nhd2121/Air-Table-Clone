"use client";

import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { type ColumnType } from "./AddColumnModal";

interface ColumnTypeDropdownProps {
  columnId: string;
  label: string;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  columnTypes: Record<string, ColumnType>;
  onTypeChange: (columnId: string, type: ColumnType) => void;
}

export function ColumnTypeDropdown({
  columnId,
  label,
  activeDropdown,
  setActiveDropdown,
  columnTypes,
  onTypeChange,
}: ColumnTypeDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setActiveDropdown]);

  return (
    <div className="relative">
      <div
        className="flex cursor-pointer items-center"
        onClick={() => setActiveDropdown(columnId)}
      >
        <span className="mr-1 font-medium">{label}</span>
        <ChevronDown size={14} className="ml-1 text-gray-500" />
      </div>

      {activeDropdown === columnId && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="p-2 text-sm font-semibold text-gray-700">
            Column Type
          </div>
          <div
            className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "TEXT" ? "bg-blue-50 text-blue-700" : ""}`}
            onClick={() => onTypeChange(columnId, "TEXT")}
          >
            Text
          </div>
          <div
            className={`cursor-pointer p-2 text-sm hover:bg-gray-100 ${columnTypes[columnId] === "NUMBER" ? "bg-blue-50 text-blue-700" : ""}`}
            onClick={() => onTypeChange(columnId, "NUMBER")}
          >
            Number
          </div>
        </div>
      )}
    </div>
  );
}
