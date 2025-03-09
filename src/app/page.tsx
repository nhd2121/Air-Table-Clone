import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import HomeContent from "./_components/homeContent";

export default async function Home() {
  const session = await auth();

  // Prefetch data regardless of session status
  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <HomeContent initialSession={session} />
    </HydrateClient>
  );
}
