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
    onError: async (error) => {
      console.error("Create base error:", error);

      // Increase timeout before checking
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Common network/timeout errors that might occur despite successful creation
      const possibleNetworkErrors = [
        "Stream closed",
        "network",
        "timeout",
        "NetworkError",
        "Failed to fetch",
        "Socket",
        "ECONNRESET",
        "AbortError",
      ];

      const isLikelyNetworkError = possibleNetworkErrors.some((errText) =>
        error.message.toLowerCase().includes(errText.toLowerCase()),
      );

      if (isLikelyNetworkError) {
        setError("Checking if your workspace was created despite the error...");

        // Try to get all bases to see if our new one was created
        try {
          // Force refresh the bases list
          await utils.base.getAll.invalidate();
          const bases = await utils.base.getAll.fetch();

          // Look for a recently created base (within the last minute)
          const recentlyCreated = bases?.find((base) => {
            const createdAt = new Date(base.createdAt);
            const timeDiff = Date.now() - createdAt.getTime();
            // If created in the last minute
            return timeDiff < 60000;
          });

          if (recentlyCreated) {
            // Found a recently created base, redirect to it
            setError("");
            router.push(`/base/${recentlyCreated.id}`);
            onClose();
            return;
          }
        } catch (fetchError) {
          console.error("Error checking for created base:", fetchError);
        }

        setError(
          "Connection issue. Your workspace might have been created. Please check your workspace list or try again.",
        );
      } else {
        setError(error.message);
      }
      setIsLoading(false);
    },
    retry: 2, // Add retry attempts for network issues
    retryDelay: 1000, // Wait 1 second between retries
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleCreateFromScratch = () => {
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);
    setError("");

    // Add a timeout to handle very slow connections
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setError("Operation taking longer than expected. Please wait...");
      }
    }, 5000);

    createBase.mutate(
      {
        name: "Untitled Base",
      },
      {
        onSettled: () => {
          clearTimeout(timeoutId);
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Create workspace
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="flex flex-col">
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-medium text-gray-700">
              Start from scratch
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Left card - clickable but non-functional */}
              <div className="cursor-pointer rounded-md border border-gray-300 bg-white p-4 transition hover:border-gray-400 hover:shadow-md">
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
                className="cursor-pointer rounded-md border border-gray-300 bg-white p-4 transition hover:border-green-500 hover:shadow-md"
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
