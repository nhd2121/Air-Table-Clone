"use client";

import React from "react";
import ToggleViewSidebarButton from "./toggleViewSidebarButton";
import { SearchBarTable } from "./searchBarTable";

interface ToolbarProps {
  viewId: string;
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
        <div className="flex items-center gap-2 space-x-2">
          <ToggleViewSidebarButton
            isOpen={isViewsSidebarOpen}
            onClick={toggleViewsSidebar}
            label="Views"
          />
          <div className="h-5 w-px self-center bg-black"></div>
          <p className="text-bold">{viewId}</p>

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
