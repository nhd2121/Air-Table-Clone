import { notFound } from "next/navigation";
import { HydrateClient } from "@/trpc/server";
import { api } from "@/trpc/server";
import BasePage from "./BasePage";
import type { Table } from "@/type/db";

// Define a proper type for props
interface Props {
  params: {
    id: string;
  };
}

export default async function BasePageWrapper(props: Props) {
  const id = props.params.id;

  // Fetch the base data
  let base;
  try {
    base = await api.base.getById({ id });
  } catch (error) {
    notFound();
  }

  // Fetch the tables for this base
  let tables: Table[] = [];
  try {
    tables = await api.table.getTablesForBase({ baseId: id });
  } catch (error) {
    // If we can't fetch tables, continue with empty array
  }

  // Ensure there's at least one table
  const firstTable = tables[0];
  if (!firstTable) {
    notFound();
  }

  return (
    <HydrateClient>
      <BasePage base={base} tables={tables} firstTableId={firstTable.id} />
    </HydrateClient>
  );
}
