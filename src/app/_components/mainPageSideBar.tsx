import Link from "next/link";

export function Sidebar() {
  return (
    <div className="flex h-full flex-col items-start justify-between border-r bg-white p-4 text-black">
      <div className="flex flex-col gap-2">
        <nav>
          <Link
            href="/dashboard"
            className="block rounded-lg p-2 font-bold hover:bg-white/10"
          >
            Home
          </Link>
        </nav>
        <nav>
          <Link
            href="/projects"
            className="block rounded-lg p-2 font-bold hover:bg-white/10"
          >
            Workspace
          </Link>
        </nav>
      </div>
      <div className="items-right flex justify-end gap-4">
        <Link href={"/base"}>
          <button className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white">
            Create Workspace
          </button>
        </Link>
      </div>
    </div>
  );
}
