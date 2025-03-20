"use client";

import React from "react";

interface SearchResultsProps {
  searchTerm: string;
  isSearching: boolean;
  showSearchMessage: boolean;
  resultCount?: number;
  className?: string;
}

export function SearchResults({
  searchTerm,
  isSearching,
  showSearchMessage,
  resultCount,
  className = "",
}: SearchResultsProps) {
  if (!searchTerm) {
    return null;
  }

  return (
    <div className={className}>
      {/* Search in progress message */}
      {(isSearching || showSearchMessage) && (
        <div className="bg-blue-50 px-4 py-2 text-sm text-blue-600">
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            Searching for &quot;{searchTerm}&quot;...
          </div>
        </div>
      )}

      {/* Search results count - Only show after search is complete */}
      {searchTerm &&
        !isSearching &&
        !showSearchMessage &&
        resultCount !== undefined && (
          <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
            Found {resultCount} {resultCount === 1 ? "result" : "results"} for
            &quot;{searchTerm}&quot;
          </div>
        )}

      {/* No results message */}
      {searchTerm &&
        !isSearching &&
        !showSearchMessage &&
        resultCount !== undefined &&
        resultCount === 0 && (
          <div className="flex h-32 items-center justify-center bg-gray-50 text-gray-500">
            No results found for &quot;{searchTerm}&quot;
          </div>
        )}
    </div>
  );
}
