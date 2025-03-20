/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "./mainPageSideBar";
import type { Session } from "next-auth";
import { api } from "@/trpc/react";
import NavBar from "./mainPageNavBar";
import Link from "next/link";
import { ChevronDown, LayoutGrid, Menu, X } from "lucide-react";

interface HomeContentProps {
  initialSession: Session | null;
}

export default function HomeContent({ initialSession }: HomeContentProps) {
  const { status } = useSession();
  const router = useRouter();
  const { data: bases, isLoading } = api.base.getAll.useQuery();

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const utils = api.useUtils();

  // Mutation for deleting a base
  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => {
      // Invalidate the query to refresh the data
      void utils.base.getAll.invalidate();
      setDeleteModalOpen(false);
      setBaseToDelete(null);
    },
  });

  // Function to handle delete button click
  const handleDeleteClick = (
    e: React.MouseEvent,
    baseId: string,
    baseName: string,
  ) => {
    e.preventDefault(); // Prevent navigation to the base
    e.stopPropagation(); // Prevent event bubbling
    setBaseToDelete({ id: baseId, name: baseName });
    setDeleteModalOpen(true);
  };

  // Function to confirm deletion
  const confirmDelete = () => {
    if (baseToDelete) {
      deleteBase.mutate({ id: baseToDelete.id });
    }
  };

  // Redirect to welcome page if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/welcome");
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading" && !initialSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (status === "unauthenticated" && !initialSession) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <NavBar />
      <div className="my-2 flex h-full w-full">
        <div className="w-1/4">
          <Sidebar />
        </div>
        <div className="w-full bg-white">
          <div className="flex flex-col">
            <div className="container mx-auto px-4 py-6">
              <h1 className="mb-6 text-3xl font-bold text-gray-900">Home</h1>

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 text-gray-700">
                    Opened by you
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-1"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  <button className="ml-4 flex items-center gap-1 text-gray-700">
                    Show all types
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button className="rounded p-1 text-gray-500 hover:bg-gray-100">
                    <Menu size={20} />
                  </button>
                  <button className="rounded p-1 text-gray-500 hover:bg-gray-100">
                    <LayoutGrid size={20} />
                  </button>
                </div>
              </div>

              <h2 className="mb-4 text-sm font-medium text-gray-700">
                Past 7 days
              </h2>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-3 py-4 text-center text-gray-500">
                    Loading...
                  </div>
                ) : bases && bases.length > 0 ? (
                  bases.map((base, index) => {
                    const bgColors = [
                      "bg-teal-600",
                      "bg-purple-500",
                      "bg-gray-500",
                    ];
                    const bgColor = bgColors[index % bgColors.length];

                    return (
                      <Link
                        key={base.id}
                        href={`/base/${base.id}`}
                        className="relative flex cursor-pointer items-start rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                      >
                        <button
                          className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          onClick={(e) =>
                            handleDeleteClick(e, base.id, base.name)
                          }
                        >
                          <X size={16} />
                        </button>
                        <div className="mr-3 flex-shrink-0">
                          <div
                            className={`h-14 w-14 ${bgColor} flex items-center justify-center rounded-lg text-2xl font-medium text-white`}
                          >
                            {base.name.substring(0, 2)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {base.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {base._count?.tabs
                              ? `${base._count.tabs} ${base._count.tabs === 1 ? "Tab" : "Tabs"}`
                              : "Base"}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-3 py-4 text-center text-gray-500">
                    No bases yet. Create your first base!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && baseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-medium text-gray-800">
              Delete Workspace
            </h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete the workspace &quot;
              {baseToDelete.name}
              &quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                disabled={deleteBase.isPending}
              >
                {deleteBase.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
