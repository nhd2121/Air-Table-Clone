"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

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
      console.error("Create base error:", error);
      // Check if this is just a network error but the operation succeeded
      if (
        error.message.includes("Stream closed") ||
        error.message.includes("network")
      ) {
        // Try to check if the base was actually created despite the error
        void utils.base.getAll.invalidate().then(() => {
          setError(
            "Connection issue. Please refresh to see if your workspace was created.",
          );
        });
      } else {
        setError(error.message);
      }
      setIsLoading(false);
    },
    retry: 0,
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
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            How do you want to start?
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        {/* create line */}
        <hr className="mb-4" />

        <div className="flex flex-col">
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Left card - clickable but non-functional */}
              <div className="cursor-pointer rounded-md border border-gray-300 bg-white p-4 transition hover:shadow-md">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-base font-medium text-gray-900">
                      Import data
                    </h4>
                    <p className="text-sm text-gray-500">
                      Import your existing data
                    </p>
                  </div>
                </div>
              </div>

              {/* Right card - creates workspace */}
              <div
                className="cursor-pointer rounded-md border border-gray-300 bg-white p-4 transition hover:shadow-md"
                onClick={handleCreateFromScratch}
              >
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-100 text-green-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-base font-medium text-gray-900">
                      Start with an empty base
                    </h4>
                    <p className="text-sm text-gray-500">
                      Create a blank workspace that you can customize
                    </p>
                  </div>
                </div>
                {/* <div
                  className={`mt-4 text-center text-sm font-medium ${isLoading ? "text-gray-500" : "text-green-600"}`}
                >
                  {isLoading ? "Creating..." : "Create a base"}
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
