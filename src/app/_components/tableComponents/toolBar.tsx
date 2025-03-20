"use client";

import React from "react";
import ToggleViewSidebarButton from "./toggleViewSidebarButton";
import { SearchBarTable } from "./searchBarTable";
import { ChevronDown, TableCellsSplit, UsersRound } from "lucide-react";

interface ToolbarProps {
  viewId: string;
  viewName: string;
  isViewsSidebarOpen: boolean;
  toggleViewsSidebar: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  setShowSearchMessage: (show: boolean) => void;
  className?: string;
}

export function Toolbar({
  viewId,
  viewName,
  isViewsSidebarOpen,
  toggleViewsSidebar,
  searchTerm,
  setSearchTerm,
  setIsSearching,
  setShowSearchMessage,
  className = "",
}: ToolbarProps) {
  return (
    <div className={`border-b border-gray-200 bg-white p-1 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left side with toggle sidebar button */}
        <div className="flex items-center gap-2">
          <ToggleViewSidebarButton
            isOpen={isViewsSidebarOpen}
            onClick={toggleViewsSidebar}
            label="Views"
          />
          <div className="h-4 w-px self-center bg-black"></div>

          <button className="flex items-center justify-center gap-2 px-2 py-1 hover:bg-gray-100">
            <TableCellsSplit size={16} className="text-blue-600" />
            <p className="text-[13px] font-normal leading-[1.5]">{viewName}</p>
            <UsersRound size={14} className="text-black" />
            <ChevronDown size={14} className="text-black" />
          </button>

          {/* Future view-specific controls can be added here */}
        </div>

        {/* Right side with search */}
        <SearchBarTable
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setIsSearching={setIsSearching}
          setShowSearchMessage={setShowSearchMessage}
        />
      </div>
    </div>
  );
}
