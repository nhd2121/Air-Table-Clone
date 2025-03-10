import { notFound } from "next/navigation";
import { HydrateClient } from "@/trpc/server";
import { api } from "@/trpc/server";
import BasePage from "./BasePage";
import type { Table } from "@/type/db";

// Define proper types for the page props
interface PageProps {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function BasePageWrapper({ params }: PageProps) {
  const id = params.id;

  // Fetch the base data
  let base;
  try {
    base = await api.base.getById({ id });
  } catch (error) {
    console.error("Error fetching base:", error);
    notFound();
  }

  // Fetch the tables for this base
  let tables: Table[] = [];
  try {
    tables = await api.table.getTablesForBase({ baseId: id });
  } catch (error) {
    console.error("Error fetching tables:", error);
    // If we can't fetch tables, continue with empty array
  }

  // Ensure there's at least one table
  const firstTable = tables[0];
  if (!firstTable) {
    notFound();
  }

  // Extract only the properties needed by BasePage component
  const baseProps = {
    id: base.id,
    name: base.name,
    // Convert null to undefined for description if needed
    description: base.description ?? undefined,
  };

  const formattedTables = tables.map((table) => ({
    id: table.id,
    name: table.name,
    description: table.description,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    baseId: table.baseId,
  }));

  return (
    <HydrateClient>
      <BasePage
        base={baseProps}
        tables={formattedTables}
        firstTableId={firstTable.id}
      />
    </HydrateClient>
  );
}
