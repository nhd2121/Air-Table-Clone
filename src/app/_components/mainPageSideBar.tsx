"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBaseModal } from "./createBaseModal";
import { Plus } from "lucide-react";

export function Sidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-full flex-col items-start justify-between border-r bg-white p-2 text-black">
      <div className="w-full flex-col gap-2">
        <nav className="my-2">
          <Link href="/" className="block p-2 font-bold hover:bg-gray-100">
            Home
          </Link>
        </nav>
      </div>

      <div className="w-full">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 p-2 text-center font-semibold text-white hover:bg-blue-600"
        >
          <Plus size={18} />
          Create
        </button>
      </div>

      <CreateBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
