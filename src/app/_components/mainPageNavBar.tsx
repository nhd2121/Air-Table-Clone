"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import type { Table } from "@/type/db";
import {
  ChevronDown,
  Plus,
  Share,
  History,
  ArrowLeftCircle,
  Loader2,
} from "lucide-react";
import React from "react";

interface BaseNavbarProps {
  baseName: string;
  baseId: string;
  tables: Table[];
  onTableSelect?: (tableId: string) => void;
  onTableCreated?: (newTable: Table) => void;
  activeTableId?: string;
}

export function BaseNavbar({
  baseName,
  baseId,
  tables = [],
  onTableSelect,
  onTableCreated,
  activeTableId,
}: BaseNavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(baseName);
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const utils = api.useUtils();
  // Filter out view-linked tables for the tab bar
  const visibleTables = tables.filter((table) => !table.isViewLinked);

  // Get initials from user name for avatar
  const getUserInitials = () => {
    if (!session?.user?.name) return "?";

    return session.user.name
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const updateBase = api.base.update.useMutation({
    onSuccess: () => {
      // Invalidate the query cache to refresh the data
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getAll.invalidate();
    },
  });

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      // Set creating state to false
      setIsCreatingTable(false);

      // Call the callback to update parent component's state
      if (onTableCreated) {
        onTableCreated(newTable);
      }

      // Invalidate the query cache to refresh the data
      void utils.table.getTablesForBase.invalidate({ baseId });
      void utils.base.getById.invalidate({ id: baseId });
    },
    onError: (error) => {
      console.error("Error creating table:", error);
      setIsCreatingTable(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-dropdown") && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  const handleAddTable = () => {
    if (isCreatingTable) return; // Prevent multiple clicks

    setIsCreatingTable(true);

    // Generate the next table number
    let nextTableNumber = 1;

    // Find the highest number in existing table names
    const tableNumberRegex = /Table (\d+)/;
    tables.forEach((table) => {
      const match = tableNumberRegex.exec(table.name);
      if (match) {
        const num = parseInt(match[1] ?? "0", 10);
        if (num >= nextTableNumber) {
          nextTableNumber = num + 1;
        }
      }
    });

    // Create the new table with the next number
    const newTableName = `Table ${nextTableNumber}`;

    createTable.mutate({
      baseId,
      name: newTableName,
    });
  };

  // Calculate remaining trial days (for demo purposes)
  const trialDaysLeft = 12;

  return (
    <div className="flex flex-col">
      {/* Top Navbar */}
      <div className="flex h-16 items-center justify-between bg-teal-600 px-4 text-white">
        <div className="flex items-center">
          {/* Logo and Base Name */}
          <div className="mr-6 flex items-center">
            <Link href="/" className="pr-4">
              <ArrowLeftCircle />
            </Link>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleKeyDown}
                className="rounded border-none bg-teal-700 px-2 py-1 text-lg font-medium text-white focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            ) : (
              <div className="flex items-center">
                <span
                  onClick={handleNameClick}
                  className="cursor-pointer text-lg font-medium hover:text-white/90"
                >
                  {name || "Untitled Base"}
                </span>
              </div>
            )}
          </div>

          {/* Main navigation */}
          <nav className="hidden md:flex">
            <button className="rounded-3xl px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Data
            </button>
            <button className="rounded-3xl px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Automations
            </button>
            <button className="rounded-3xl px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Interfaces
            </button>
            <button className="rounded-3xl px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Forms
            </button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 hover:bg-teal-800">
            <History size={18} />
          </button>

          <div className="rounded bg-teal-700 px-3 py-1 text-sm">
            Trial: {trialDaysLeft} days left
          </div>

          <button className="flex items-center rounded-full bg-white px-3 py-1 text-sm font-medium text-teal-700 hover:bg-white/90">
            <Share size={16} className="mr-1" />
            Share
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="user-dropdown relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center rounded-full p-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-medium text-white">
                  {getUserInitials()}
                </div>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {session?.user?.name}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex h-10 items-center bg-teal-700 text-white">
        <div className="flex overflow-x-auto pl-4">
          {visibleTables.map((table, index) => (
            <React.Fragment key={table.id}>
              {index > 0 && (
                <div className="h-5 w-px self-center bg-teal-600/50"></div>
              )}
              <div
                key={table.id}
                className={`flex min-w-[100px] cursor-pointer items-center ${
                  activeTableId === table.id
                    ? "bg-white text-teal-800"
                    : "bg-teal-700 text-white hover:bg-teal-600"
                } px-3 py-2`}
                onClick={() => onTableSelect && onTableSelect(table.id)}
              >
                <span className="mr-1 truncate">{table.name}</span>
                {activeTableId === table.id && <ChevronDown size={14} />}
              </div>
            </React.Fragment>
          ))}

          <div className="h-5 w-px self-center bg-teal-600/50"></div>
          <button
            className="flex items-center border-teal-600 px-3 py-2 text-white hover:bg-teal-600"
            onClick={handleAddTable}
          >
            {isCreatingTable ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <Plus size={16} />
                Add or import
              </div>
            )}
          </button>
        </div>

        <div className="ml-auto flex">
          <button className="px-4 py-2 text-sm text-white hover:bg-teal-600">
            Extensions
          </button>
          <button className="flex items-center px-4 py-2 text-sm text-white hover:bg-teal-600">
            Tools
            <ChevronDown size={14} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
