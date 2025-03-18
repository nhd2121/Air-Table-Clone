/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import type { Column } from "@/type/db";

export function generateTableColumns(tableColumns: Column[]) {
  const columnHelper = createColumnHelper<any>();

  return tableColumns.map((column) =>
    columnHelper.accessor((row) => row.cells[column.id], {
      id: column.id,
      header: () => (
        <div className="flex items-center">
          <span>{column.name}</span>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </div>
      ),
      cell: (info) => info.getValue() || "",
    }),
  );
}
