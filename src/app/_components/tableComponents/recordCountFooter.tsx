import React from "react";
import { Loader2 } from "lucide-react";

interface RecordCountFooterProps {
  count: number;
  totalCount?: number;
  searchTerm?: string;
  className?: string;
  label?: string;
  position?: "sticky" | "fixed" | "relative" | "absolute";
  isLoading?: boolean;
}

const RecordCountFooter: React.FC<RecordCountFooterProps> = ({
  count,
  totalCount,
  searchTerm = "",
  className = "",
  label = "record",
  position = "sticky",
  isLoading = false,
}) => {
  const isPlural = count !== 1;
  const isSearching = searchTerm && searchTerm.length > 0;

  const displayCount = () => {
    if (totalCount !== undefined) {
      return (
        <>
          {count} {isSearching ? "matching " : ""}of {totalCount} {label}
          {totalCount !== 1 ? "s" : ""}
          {isLoading && (
            <span className="ml-2 inline-flex items-center text-gray-400">
              <Loader2 size={12} className="mr-1 animate-spin" />
              Loading more...
            </span>
          )}
        </>
      );
    }

    return (
      <>
        {count} {isSearching ? "matching " : ""}
        {label}
        {isPlural ? "s" : ""}
        {isLoading && (
          <span className="ml-2 inline-flex items-center text-gray-400">
            <Loader2 size={12} className="mr-1 animate-spin" />
            Loading more...
          </span>
        )}
      </>
    );
  };

  return (
    <div
      className={`${position} bottom-0 z-10 w-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm ${className}`}
    >
      {displayCount()}
    </div>
  );
};

export default RecordCountFooter;
