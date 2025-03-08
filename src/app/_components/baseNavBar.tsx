import Link from "next/link";
import { auth } from "@/server/auth";

export async function BaseNavbar() {
  const session = await auth();

  return (
    <>
      {/* Top Navbar */}
      <nav className="w-full bg-green-600 text-white">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="mr-4 flex items-center">
            <div className="mr-4 flex items-center text-base font-medium">
              <Link href="/" className="text-white hover:text-white/90">
                Untitled Base
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            <Link
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
              className="rounded-full bg-white/10 px-4 py-2 font-semibold no-underline transition hover:bg-white/20"
            >
              {session ? "Sign out" : "Sign in"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Secondary Navbar */}
      <div className="relative flex items-end border-b border-gray-200 bg-green-700 px-4">
        {/* Table Selector */}
        <div className="mb-[-1px] cursor-pointer items-center border-black bg-white px-3 py-2 font-medium">
          Table 1
        </div>

        {/* Add Table Button */}
        <div className="ml-3 flex cursor-pointer items-center rounded px-3 py-1.5 hover:bg-gray-100">
          + Add Table
        </div>
      </div>
    </>
  );
}
