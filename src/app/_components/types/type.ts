import type { ColumnType } from "../AddColumnModal";
import type { View } from "@/type/db";

export type ColumnTypesState = Record<string, ColumnType>;

export interface TableComponentProps {
  tableId: string;
  onTableSelect?: (tableId: string) => void;
}

export interface ViewWithTable extends View {
  table?: {
    id: string;
    name: string;
  };
}
