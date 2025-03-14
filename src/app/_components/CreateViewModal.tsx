"use client";

import { useState, useRef, useEffect } from "react";

interface CreateViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateView: (name: string) => void;
  isPending: boolean;
}

export function CreateViewModal({
  isOpen,
  onClose,
  onCreateView,
  isPending,
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
        <h3 className="mb-4 text-xl font-medium">Create New View</h3>
        <form onSubmit={handleCreateView}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              View Name
            </label>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter view name"
              required
              autoFocus
            />
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
              {isPending ? "Creating..." : "Create View"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
