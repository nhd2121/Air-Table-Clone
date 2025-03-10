"use client";

import { BaseNavbar } from "@/app/_components/mainPageNavBar";
import TableComponent from "@/app/_components/TableComponent";
import { useState } from "react";
import type { Table } from "@/type/db";

interface BasePageProps {
  base: {
    id: string;
    name: string;
    description?: string | null;
  };
  tables: Table[];
  firstTableId: string;
}

export default function BasePage({
  base,
  tables: initialTables,
  firstTableId,
}: BasePageProps) {
  // State to track the currently selected table
  const [activeTableId, setActiveTableId] = useState(firstTableId);

  // Maintain tables list in state so we can update it when new tables are added
  const [tables, setTables] = useState(initialTables);

  // Handle table change
  const handleTableChange = (tableId: string) => {
    setActiveTableId(tableId);
  };

  // Handle table creation
  const handleTableCreated = (newTable: Table) => {
    // Add the new table to our state
    setTables((currentTables) => [...currentTables, newTable]);
    // Select the newly created table
    setActiveTableId(newTable.id);
  };

  return (
    <div className="w-full">
      <BaseNavbar
        baseName={base.name}
        baseId={base.id}
        tables={tables}
        onTableSelect={handleTableChange}
        onTableCreated={handleTableCreated}
        activeTableId={activeTableId}
      />
      <div className="container px-4 py-4">
        <TableComponent tableId={activeTableId} key={activeTableId} />
      </div>
    </div>
  );
}
