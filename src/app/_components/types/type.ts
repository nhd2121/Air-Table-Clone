import type { ColumnType } from "../AddColumnModal";

export type ColumnTypesState = Record<string, ColumnType>;

export interface TableComponentProps {
  tableId: string;
}
