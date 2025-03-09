"use client";

import { BaseNavbar } from "@/app/_components/mainPageNavBar";
import TableComponent from "@/app/_components/TableComponent";
import { useEffect, useState } from "react";
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
  // State to track the currently selected table
  const [activeTableId, setActiveTableId] = useState(firstTableId);

  // Get utility functions to invalidate queries
  const utils = api.useUtils();

  // When the component mounts or activeTableId changes, invalidate all cached table data
  // This ensures we always get fresh data and generate new fake data
  useEffect(() => {
    // Force invalidation to ensure fresh data and trigger new fake data generation
    utils.table.getTableData.invalidate({ tableId: activeTableId });
    utils.table.getTablesForBase.invalidate({ baseId: base.id });
    utils.base.getById.invalidate({ id: base.id });

    // Always refetch data when changing tables to ensure new fake data is generated
    utils.table.getTableData.refetch({ tableId: activeTableId });
  }, [base.id, activeTableId, utils.base, utils.table]);

  // Handle table change
  const handleTableChange = (tableId: string) => {
    setActiveTableId(tableId);
  };

  return (
    <div className="w-full">
      <BaseNavbar
        baseName={base.name}
        baseId={base.id}
        tables={tables}
        onTableSelect={handleTableChange}
        activeTableId={activeTableId}
      />
      <div className="container px-4 py-4">
        <TableComponent tableId={activeTableId} key={activeTableId} />
      </div>
    </div>
  );
}
