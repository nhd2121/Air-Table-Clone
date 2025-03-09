"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

interface BaseNavbarProps {
  baseName: string;
  baseId: string;
  tables: any[];
  onTableSelect?: (tableId: string) => void;
  activeTableId?: string;
}

export function BaseNavbar({
  baseName,
  baseId,
  tables = [],
  onTableSelect,
  activeTableId,
}: BaseNavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(baseName);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const utils = api.useUtils();

  const updateBase = api.base.update.useMutation({
    onSuccess: () => {
      // Invalidate the query cache to refresh the data
      utils.base.getById.invalidate({ id: baseId });
      utils.base.getAll.invalidate();
    },
  });

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      // Reset the form
      setNewTableName("");
      setShowAddTableModal(false);

      // Invalidate the query cache to refresh the data
      utils.table.getTablesForBase.invalidate({ baseId });
      utils.base.getById.invalidate({ id: baseId });

      // Select the newly created table
      if (onTableSelect) {
        onTableSelect(newTable.id);
      }
    },
  });

  useEffect(() => {
    // Update the name state when props change
    setName(baseName);
  }, [baseName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showAddTableModal &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowAddTableModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddTableModal]);

  const handleNameClick = () => {
    setIsEditing(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNameBlur = () => {
    saveBaseName();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveBaseName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setName(baseName); // Reset to original
    }
  };

  const saveBaseName = () => {
    if (name.trim() === "") {
      setName(baseName); // Reset to original if empty
      setIsEditing(false);
      return;
    }

    if (name !== baseName) {
      updateBase.mutate({
        id: baseId,
        name: name.trim(),
      });
    }

    setIsEditing(false);
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTableName.trim()) {
      return;
    }

    createTable.mutate({
      baseId,
      name: newTableName.trim(),
    });
  };

  return (
    <>
      {/* Top Navbar */}
      <nav className="w-full bg-green-600 text-white">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="mr-4 flex items-center">
            <div className="mr-4 flex items-center text-base font-medium">
              <Link href="/" className="mr-2 text-white hover:text-white/90">
                Home /
              </Link>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleKeyDown}
                  className="bg-green-700 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                />
              ) : (
                <span
                  onClick={handleNameClick}
                  className="cursor-pointer hover:text-white/90"
                >
                  {name || "Untitled Base"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <Link
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
              className="rounded-full bg-white/10 px-4 py-2 font-semibold no-underline transition hover:bg-white/20"
            >
              {session ? "Sign out" : "Sign in"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Secondary Navbar */}
      <div className="relative flex items-end border-b border-gray-200 bg-green-700 px-4">
        {/* Table Tabs */}
        <div className="flex overflow-x-auto">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`mb-[-1px] cursor-pointer items-center border-l border-r border-t border-gray-300 px-3 py-2 font-medium ${
                activeTableId === table.id
                  ? "bg-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => onTableSelect && onTableSelect(table.id)}
            >
              {table.name}
            </div>
          ))}
        </div>

        {/* Add Table Button */}
        <div
          className="ml-3 flex cursor-pointer items-center rounded px-3 py-1.5 text-white hover:bg-green-600"
          onClick={() => setShowAddTableModal(true)}
        >
          + Add Table
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h3 className="mb-4 text-xl font-medium">Add New Table</h3>
            <form onSubmit={handleAddTable}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  Table Name
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter table name"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="mr-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  disabled={createTable.isPending}
                >
                  {createTable.isPending ? "Creating..." : "Create Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
