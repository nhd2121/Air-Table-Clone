"use client";

import { useState, useRef, useEffect } from "react";

interface CreateViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateView: (name: string) => void;
  isPending: boolean;
  error?: string;
}

export function CreateViewModal({
  isOpen,
  onClose,
  onCreateView,
  isPending,
  error,
}: CreateViewModalProps) {
  const [newViewName, setNewViewName] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setNewViewName("");
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

  // Handle creating a new view
  const handleCreateView = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newViewName.trim()) {
      return;
    }

    onCreateView(newViewName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateView}>
          <div className="mb-4">
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Enter view name ..."
              required
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create new View"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
