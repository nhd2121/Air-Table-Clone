"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

interface BaseNavbarProps {
  baseName: string;
  baseId: string;
  tables: any[];
}

export function BaseNavbar({ baseName, baseId, tables = [] }: BaseNavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(baseName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const utils = api.useUtils();

  const updateBase = api.base.update.useMutation({
    onSuccess: () => {
      // Invalidate the query cache to refresh the data
      utils.base.getById.invalidate({ id: baseId });
      utils.base.getAll.invalidate();
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
              className="mb-[-1px] cursor-pointer items-center border-l border-r border-t border-gray-300 bg-white px-3 py-2 font-medium"
            >
              {table.name}
            </div>
          ))}
        </div>

        {/* Add Table Button */}
        <div className="ml-3 flex cursor-pointer items-center rounded px-3 py-1.5 text-white hover:bg-green-600">
          + Add Table
        </div>
      </div>
    </>
  );
}
