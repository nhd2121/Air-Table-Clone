"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { CreateBaseModal } from "./createBaseModal";

export function Sidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: bases, isLoading } = api.base.getAll.useQuery();

  return (
    <div className="flex h-full flex-col items-start justify-between border-r bg-white p-4 text-black">
      <div className="w-full flex-col gap-2">
        <nav className="mb-6">
          <Link
            href="/"
            className="block rounded-lg p-2 font-bold hover:bg-gray-100"
          >
            Home
          </Link>
        </nav>

        <div className="mb-2">
          <h3 className="px-2 text-sm font-semibold text-gray-500">MY BASES</h3>
        </div>

        {isLoading ? (
          <div className="px-2 py-1 text-sm">Loading...</div>
        ) : (
          <div className="mb-6 space-y-1">
            {bases && bases.length > 0 ? (
              bases.map((base) => (
                <Link
                  key={base.id}
                  href={`/base/${base.id}`}
                  className="block rounded-lg p-2 text-sm hover:bg-gray-100"
                >
                  {base.name}
                </Link>
              ))
            ) : (
              <div className="px-2 py-1 text-sm text-gray-500">
                No bases yet. Create your first base!
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-lg bg-blue-500 px-4 py-2 text-center font-semibold text-white hover:bg-blue-600"
        >
          Create Workspace
        </button>
      </div>

      <CreateBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
