import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import { Navbar } from "./_components/mainPageNavBar";
import { Sidebar } from "./_components/mainPageSideBar";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <div className="flex-row-2 flex h-screen">
        <div className="w-1/6">
          <Sidebar />
        </div>
        <div className="w-5/6">
          <div className="flex h-full flex-col">
            <Navbar />
            <main className="w-full">
              <div className="container flex flex-col items-center justify-center gap-12 px-4 py-8">
                <div className="mb-6 flex items-center justify-start">
                  <h1 className="text-3xl font-bold">My First Workspace</h1>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
