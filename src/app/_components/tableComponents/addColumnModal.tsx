"use client";

import { useState, useRef, useEffect } from "react";

// Define column type options
export type ColumnType = "TEXT" | "NUMBER";

interface AddColumnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (name: string, type: ColumnType) => void;
  isPending: boolean;
}

export function AddColumnViewModal({
  isOpen,
  onClose,
  onAddColumn,
  isPending,
}: AddColumnViewModalProps) {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("TEXT");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setNewColumnName("");
      setNewColumnType("TEXT");
    }
  }, [isOpen]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle adding a new column
  const handleAddColumn = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!newColumnName.trim()) {
      return;
    }

    onAddColumn(newColumnName.trim(), newColumnType);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h3 className="mb-4 text-xl font-medium">Add New Column</h3>
        <form onSubmit={handleAddColumn}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Column Name
            </label>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter column name"
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Column Type
            </label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="type-text"
                  name="fieldType"
                  value="TEXT"
                  checked={newColumnType === "TEXT"}
                  onChange={() => setNewColumnType("TEXT")}
                  className="h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="type-text"
                  className="ml-2 text-sm text-gray-700"
                >
                  Text
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="type-number"
                  name="fieldType"
                  value="NUMBER"
                  checked={newColumnType === "NUMBER"}
                  onChange={() => setNewColumnType("NUMBER")}
                  className="h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="type-number"
                  className="ml-2 text-sm text-gray-700"
                >
                  Number
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending ? "Adding..." : "Add Column"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
