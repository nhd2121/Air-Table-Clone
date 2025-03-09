import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import { Sidebar } from "./_components/mainPageSideBar";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
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
                  <p>
                    Each base can have multiple tables to organize your data.
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
