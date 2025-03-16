"use client";

import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  setShowSearchMessage: (show: boolean) => void;
}

export function SearchView({
  searchTerm,
  setSearchTerm,
  setIsSearching,
  setShowSearchMessage,
}: SearchBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Debounce timeout reference
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Set searching state
    if (value.trim()) {
      setIsSearching(true);
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search is empty, immediately clear search results
    if (value.trim() === "") {
      setIsSearching(false);
      return;
    }

    // Show the search message
    setShowSearchMessage(true);

    // Debounce the search to avoid too many requests
    searchTimeoutRef.current = setTimeout(() => {
      // This will trigger the search query due to the dependency on searchTerm
      setShowSearchMessage(false);
    }, 500);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setShowSearchMessage(false);
    // Clear the timeout if it exists
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex w-full items-center">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search size={16} className="text-gray-400" />
      </div>
      <input
        ref={searchInputRef}
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Search views..."
        className="block w-full rounded-md border border-gray-300 py-1.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {searchTerm && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
