import React from "react";
import { notFound } from "next/navigation";
import { HydrateClient } from "@/trpc/server";
import { api } from "@/trpc/server";
import BasePage from "./BasePage";

interface BasePageParams {
  params: {
    id: string;
  };
}

export default async function BasePageWrapper({ params }: BasePageParams) {
  // Fetch the base data
  let base;
  try {
    base = await api.base.getById({ id: params.id });
  } catch (error) {
    notFound();
  }

  // Fetch the tables for this base
  let tables = [];
  try {
    tables = await api.table.getTablesForBase({ baseId: params.id });
  } catch (error) {}

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
