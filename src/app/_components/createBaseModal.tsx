"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

interface CreateBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBaseModal({ isOpen, onClose }: CreateBaseModalProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  const createBase = api.base.create.useMutation({
    onSuccess: async (createdBase) => {
      await utils.base.invalidate();
      router.push(`/base/${createdBase.id}`);
      onClose();
    },
    onError: (error) => {
      setError(error.message);
      setIsLoading(false);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleCreateFromScratch = () => {
    setIsLoading(true);
    createBase.mutate({
      name: "Untitled Base",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        {error && (
          <p className="mb-4 text-center text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleCreateFromScratch}
            className="rounded-md bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create from scratch"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
