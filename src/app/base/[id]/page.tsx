import { notFound } from "next/navigation";
import { HydrateClient } from "@/trpc/server";
import { api } from "@/trpc/server";
import { BasePage } from "./BasePage";

// Define proper types for the page props
interface PageProps {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function BasePageWrapper({ params }: PageProps) {
  console.log("access to base wrapper");
  const id = params.id;

  // Fetch the base data with the new schema structure
  try {
    // Pre-fetch the base data
    await api.base.getById.prefetch({ id });

    return (
      <HydrateClient>
        <BasePage baseId={id} />
      </HydrateClient>
    );
  } catch (error) {
    console.error("Error fetching base:", error);
    notFound();
  }
}
