"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Menu, Search } from "lucide-react";
import Image from "next/image";

export default function NavBar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Handle search (UI only)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="mx-auto flex h-16 items-center justify-between px-2">
        {/* Left Section */}
        <div className="flex items-center">
          <button className="mr-3 flex h-10 w-10 items-center justify-center rounded-md p-2 pl-1 text-gray-600 transition-colors hover:text-gray-900">
            <Menu size={24} />
          </button>

          <Link href="/" className="flex items-center">
            <Image
              src="/images/svg/Airtable_Logo.png"
              alt="Airtable Logo"
              width={100}
              height={25}
              className="h-auto w-auto"
            />
          </Link>
        </div>

        {/* Center Section: Search Bar */}
        <div className="flex-1 px-4">
          <div className="relative mx-auto max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full cursor-pointer rounded-full border border-gray-300 py-1.5 pl-9 pr-4 text-sm text-gray-600 transition-shadow hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Right Section: User Profile */}
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
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email}
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
    </header>
  );
}
