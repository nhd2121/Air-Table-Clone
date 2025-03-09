import { BaseNavbar } from "@/app/_components/baseNavBar";
import TableComponent from "@/app/_components/TableComponent";

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
  return (
    <div className="w-full">
      <BaseNavbar baseName={base.name} baseId={base.id} tables={tables} />
      <div className="container px-4 py-4">
        <TableComponent tableId={firstTableId} />
      </div>
    </div>
  );
}
