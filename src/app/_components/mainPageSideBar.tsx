"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBaseModal } from "./createBaseModal";
import {
  BookOpen,
  ChevronRight,
  Download,
  Plus,
  ShoppingCart,
} from "lucide-react";

export function Sidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-full flex-col items-start justify-between border-r bg-white p-2 text-black">
      <div className="w-full flex-col gap-2">
        <div className="my-2 flex items-center justify-between hover:cursor-pointer hover:bg-gray-100">
          <Link href="/" className="block p-2 font-bold">
            Home
          </Link>
          <ChevronRight size={14} />
        </div>
      </div>

      <div className="mt-auto w-full">
        <div className="my-4 border-t border-gray-200"></div>
        <div className="flex flex-col space-y-2">
          <button className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-100">
            <BookOpen size={18} className="mr-2" />
            Templates and apps
          </button>

          <button className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-100">
            <ShoppingCart size={18} className="mr-2" />
            Marketplace
          </button>

          <button className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-100">
            <Download size={18} className="mr-2" />
            Import
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="font-small mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-2 py-1 text-center text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Create
          </button>
        </div>
      </div>

      <CreateBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
