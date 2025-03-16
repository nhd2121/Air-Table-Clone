"use client";

import { BaseNavbar } from "@/app/_components/mainPageNavBar";
import TableComponent from "@/app/_components/TableComponent";
import { useState, useCallback } from "react";
import type { Table } from "@/type/db";
import { api } from "@/trpc/react";

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

  // Maintain tables list in state so we can update it when new tables or views are added
  const [tables, setTables] = useState(initialTables);

  const [displayedTableId, setDisplayedTableId] = useState(firstTableId);

  // Handle table change - this will be passed to both the navbar and the table component
  const handleTableChange = useCallback((tableId: string) => {
    setActiveTableId(tableId);
  }, []);

  // Handle table creation from the navbar
  const handleTableCreated = useCallback((newTable: Table) => {
    // Add the new table to our state
    setTables((currentTables) => [...currentTables, newTable]);
    // Select the newly created table
    setActiveTableId(newTable.id);
  }, []);

  // Query to get all tables for the base to ensure our list stays up to date
  api.table.getTablesForBase.useQuery(
    { baseId: base.id },
    {
      enabled: !!base.id,
      refetchOnWindowFocus: true,
      onSuccess: (fetchedTables) => {
        // Update tables list if it doesn't match what's in the database
        if (fetchedTables.length !== tables.length) {
          setTables(fetchedTables);
        }
      },
    },
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BaseNavbar
        baseName={base.name}
        baseId={base.id}
        tables={tables}
        onTableSelect={handleTableChange}
        onTableCreated={handleTableCreated}
        activeTableId={activeTableId}
      />
      {/* Make the table component take up full width and pass the onTableSelect callback */}
      <div className="h-[calc(100vh-104px)] w-full flex-1 overflow-hidden">
        <TableComponent
          tableId={activeTableId}
          key={activeTableId}
          onTableSelect={handleTableChange}
          setActiveTableId={setActiveTableId}
          displayedTableId={displayedTableId}
          setDisplayedTableId={setDisplayedTableId}
        />
      </div>
    </div>
  );
}
