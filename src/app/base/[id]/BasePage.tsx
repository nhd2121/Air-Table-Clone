"use client";

import { BaseNavbar } from "@/app/_components/mainPageNavBar";
import TableComponent from "@/app/_components/TableComponent";
import { useEffect } from "react";
import { api } from "@/trpc/react";

interface BasePageProps {
  base: {
    id: string;
    name: string;
    description?: string;
  };
  tables: any[];
  firstTableId: string;
}

export default function BasePage({
  base,
  tables,
  firstTableId,
}: BasePageProps) {
  // Get utility functions to invalidate queries
  const utils = api.useUtils();

  // When the component mounts, invalidate all cached table data
  // This ensures we always get fresh data from the server
  useEffect(() => {
    utils.table.getTableData.invalidate({ tableId: firstTableId });
    utils.table.getTablesForBase.invalidate({ baseId: base.id });
    utils.base.getById.invalidate({ id: base.id });
  }, [base.id, firstTableId, utils.base, utils.table]);

  return (
    <div className="w-full">
      <BaseNavbar baseName={base.name} baseId={base.id} tables={tables} />
      <div className="container px-4 py-4">
        <TableComponent tableId={firstTableId} />
      </div>
    </div>
  );
}
