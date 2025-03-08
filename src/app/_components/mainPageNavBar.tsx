import Link from "next/link";
import { auth } from "@/server/auth";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="w-full border-b bg-white">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl text-black">
            Airtable
          </Link>
        </div>

        <search className="flex items-center">
          <input
            type="text"
            placeholder="Search"
            className="border-silver rounded-full border px-6 py-1 text-black"
          />
        </search>

        <div className="flex items-center gap-4">
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-4 py-2 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
