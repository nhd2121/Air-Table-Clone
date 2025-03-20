/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ChevronDown, Loader2, Plus } from "lucide-react";
import React from "react";

interface TabItem {
  id: string;
  name: string;
  [key: string]: any;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabCreate: () => void;
  isCreatingTab?: boolean;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabCreate,
  isCreatingTab = false,
}: TabBarProps) {
  return (
    <div className="flex h-9 items-center bg-teal-700 text-white">
      <div className="flex overflow-x-auto pl-4">
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            {index > 0 && (
              <div className="h-4 w-px self-center bg-teal-600/50"></div>
            )}
            <div
              key={tab.id}
              className={`flex cursor-pointer items-center ${
                activeTabId === tab.id
                  ? "bg-white text-black"
                  : "bg-teal-700 text-white hover:bg-teal-600"
              } rounded-t-sm px-3 py-2`}
              onClick={() => onTabSelect(tab.id)}
            >
              <span className="mr-1 truncate text-[13px] font-normal leading-[1.5]">
                {tab.name}
              </span>
              {activeTabId === tab.id && <ChevronDown size={14} />}
            </div>
          </React.Fragment>
        ))}

        <div className="h-5 w-px self-center bg-teal-600/50"></div>
        <button
          className="flex items-center px-3 py-2 text-[13px] font-normal leading-[1.5] text-white hover:text-gray-300"
          onClick={onTabCreate}
          disabled={isCreatingTab}
        >
          {isCreatingTab ? (
            <Loader2 size={16} className="mr-1 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span className="text-[13px] font-normal leading-[1.5]">
                Add or import
              </span>
            </div>
          )}
        </button>
      </div>

      <div className="ml-auto flex">
        <button className="px-4 py-2 text-[13px] font-normal leading-[1.5] text-white hover:bg-teal-600">
          Extensions
        </button>
        <button className="flex items-center px-4 py-2 text-[13px] font-normal leading-[1.5] text-white hover:bg-teal-600">
          Tools
          <ChevronDown size={14} className="ml-1" />
        </button>
      </div>
    </div>
  );
}
