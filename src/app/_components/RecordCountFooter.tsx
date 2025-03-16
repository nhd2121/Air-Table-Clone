import React from "react";

interface RecordCountFooterProps {
  count: number;
  searchTerm?: string;
  className?: string;
  label?: string;
  position?: "sticky" | "fixed" | "relative" | "absolute";
}

const RecordCountFooter: React.FC<RecordCountFooterProps> = ({
  count,
  searchTerm = "",
  className = "",
  label = "record",
  position = "sticky",
}) => {
  const isPlural = count !== 1;
  const isSearching = searchTerm && searchTerm.length > 0;

  return (
    <div
      className={`${position} bottom-0 z-10 mt-auto border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 shadow-sm ${className}`}
    >
      {count} {isSearching ? "matching " : ""}
      {label}
      {isPlural ? "s" : ""}
    </div>
  );
};

export default RecordCountFooter;
