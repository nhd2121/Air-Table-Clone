import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import HomeContent from "./_components/homeContent";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <HomeContent initialSession={session} />
    </HydrateClient>
  );
}
