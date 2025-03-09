"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If user is already logged in, redirect to the main page
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Don't render anything while checking session status
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-100 to-white">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-6 text-4xl font-bold text-green-700">
          Welcome to AirTable Clone
        </h1>

        <p className="mb-8 text-xl text-gray-600">
          The simplest way to manage and organize your data
        </p>

        <Link
          href="/api/auth/signin"
          className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white shadow-lg transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <svg
            className="mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
          </svg>
          Sign in with Google
        </Link>

        <p className="mt-6 text-sm text-gray-500">
          Create and manage your databases with our simple, intuitive interface
        </p>
      </div>
    </div>
  );
}
