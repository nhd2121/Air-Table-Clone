"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Image from "next/image";

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
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl text-gray-800">How do you want to start?</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Build an app card */}
          <div className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-purple-50 shadow-sm transition-shadow hover:shadow-md">
            <div className="relative h-64 w-full">
              <Image
                src="/images/svg/Image_Right.png"
                alt="Build an app"
                fill={true}
                className="object-cover"
              />
            </div>
            <div className="border-t bg-white p-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-800">
                Build an app
              </h3>
              <p className="text-gray-600">
                Quickly create a custom app with data and interfaces tailored to
                your team.
              </p>
            </div>
          </div>

          {/* Start from scratch card */}
          <div
            className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-blue-50 shadow-sm transition-shadow hover:shadow-md"
            onClick={handleCreateFromScratch}
          >
            <div className="relative h-64 w-full">
              <Image
                src="/images/svg/Image_Left.png"
                alt="Start from scratch"
                fill={true}
                className="object-cover"
              />
            </div>
            <div className="border-t bg-white p-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-800">
                Start from scratch
              </h3>
              <p className="text-gray-600">
                Build your ideal workflow starting with a blank table.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
