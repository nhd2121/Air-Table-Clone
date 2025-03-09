"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "./mainPageSideBar";

interface HomeContentProps {
  initialSession: any;
}

export default function HomeContent({ initialSession }: HomeContentProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    <div className="flex h-screen">
      <div className="w-1/6">
        <Sidebar />
      </div>
      <div className="w-5/6">
        <div className="flex h-full flex-col">
          <main className="w-full">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-8">
              <div className="mb-6 flex items-center justify-start">
                <h1 className="text-3xl font-bold">
                  Welcome to AirTable Clone
                </h1>
              </div>
              <div className="text-center text-gray-600">
                <p>
                  Get started by creating a new base using the button in the
                  sidebar.
                </p>
                <p>Each base can have multiple tables to organize your data.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
