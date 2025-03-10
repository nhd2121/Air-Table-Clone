"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "./mainPageSideBar";
import type { Session } from "next-auth";
import { api } from "@/trpc/react";
import NavBar from "./navBar";
import Link from "next/link";
import { ChevronDown, LayoutGrid, Menu } from "lucide-react";

interface HomeContentProps {
  initialSession: Session | null;
}

export default function HomeContent({ initialSession }: HomeContentProps) {
  const { status } = useSession();
  const router = useRouter();
  const { data: bases, isLoading } = api.base.getAll.useQuery();

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
      <div className="flex h-full w-full">
        <div className="w-1/5">
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
                        className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="mr-3 flex-shrink-0">
                          <div
                            className={`h-14 w-14 ${bgColor} flex items-center justify-center rounded-lg text-2xl font-medium text-white`}
                          >
                            {/* Get first 2 letters of the base name */}
                            {base.name.substring(0, 2)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {base.name}
                          </h3>
                          <p className="text-sm text-gray-500">Base</p>
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
    </div>
  );
}
