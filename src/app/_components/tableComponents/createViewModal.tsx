"use client";

import { useState, useRef, useEffect } from "react";
import { Users, User, Lock } from "lucide-react";

// Define view permission types
type PermissionType = "collaborative" | "personal" | "locked";

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
  const [newViewName, setNewViewName] = useState("Grid 2");
  const [permissionType, setPermissionType] =
    useState<PermissionType>("collaborative");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setNewViewName("");
      setPermissionType("collaborative");

      // Focus the input after a small delay
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
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

    // Only pass the name, not the permission type
    onCreateView(newViewName.trim());
  };

  if (!isOpen) return null;

  // Get description text based on selected permission type
  const getPermissionDescription = () => {
    switch (permissionType) {
      case "collaborative":
        return "All collaborators can edit the configuration";
      case "personal":
        return "Only you can edit the configuration";
      case "locked":
        return "Configuration is locked and cannot be edited";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
      >
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateView}>
          <div className="mb-5">
            <input
              ref={inputRef}
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 px-3 text-[13px] font-normal leading-[1.5] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter view name"
              required
              disabled={isPending}
            />
          </div>

          <div className="mb-2">
            <h3 className="mb-2 text-[15px] font-bold leading-[1.5] text-gray-700">
              Who can edit
            </h3>

            <div className="flex space-x-4">
              {/* Collaborative option */}
              <label className="flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    className="h-5 w-5 accent-blue-500"
                    name="permission"
                    checked={permissionType === "collaborative"}
                    onChange={() => setPermissionType("collaborative")}
                  />
                  <span className="ml-2 flex items-center">
                    <Users size={18} className="mr-2" />
                    <span className="text-[13px] font-normal leading-[1.5]">
                      Collaborative
                    </span>
                  </span>
                </div>
              </label>

              {/* Personal option */}
              <label className="flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    className="h-5 w-5 accent-blue-500"
                    name="permission"
                    checked={permissionType === "personal"}
                    onChange={() => setPermissionType("personal")}
                  />
                  <span className="ml-2 flex items-center">
                    <User size={18} className="mr-2" />
                    <span className="text-[13px] font-normal leading-[1.5]">
                      Personal
                    </span>
                  </span>
                </div>
              </label>

              {/* Locked option */}
              <label className="flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    className="h-5 w-5 accent-blue-500"
                    name="permission"
                    checked={permissionType === "locked"}
                    onChange={() => setPermissionType("locked")}
                  />
                  <span className="ml-2 flex items-center">
                    <Lock size={16} className="mr-2" />
                    <span className="text-[13px] font-normal leading-[1.5]">
                      Locked
                    </span>
                  </span>
                </div>
              </label>
            </div>

            <p className="mt-2 text-[13px] font-normal leading-[1.5] text-gray-600">
              {getPermissionDescription()}
            </p>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-[13px] font-normal leading-[1.5] text-black hover:bg-gray-100"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-bold leading-[1.5] text-white shadow-sm hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create new view"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
