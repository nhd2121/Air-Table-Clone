/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Define type for Column
export interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
  position: number;
  createdAt: Date;
  updatedAt: Date;
  tableId: string;
}

// Define type for Table
export interface Table {
  id: string;
  name: string;
  description?: string | null;
  isViewLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
  columns?: Column[];
  rows?: Row[];
}

// Define type for Row
export interface Row {
  id: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  tableId: string;
  cells?: Cell[];
}

// Define type for Cell
export interface Cell {
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
  columnId: string;
  rowId: string;
}

// Define type for Tab
export interface Tab {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  baseId: string;
  views?: View[];
}

// Define type for Base with tabs
export interface Base {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  tabs?: Tab[];
}

// Define a type for the table row that appears in the UI
export interface TableRow {
  id: string;
  position: number;
  cells: {
    [columnId: string]: string | null;
  };
}

// Define type for ViewConfig
export interface ViewConfig {
  filters?: Record<string, any>;
  sorts?: Array<{
    id: string;
    desc: boolean;
  }>;
  hiddenColumns?: string[];
}

// Define type for View (linked to Tab and Table)
export interface View {
  id: string;
  name: string;
  position: number;
  isDefault: boolean;
  config: ViewConfig;
  createdAt: Date;
  updatedAt: Date;
  tabId: string; // Linked to Tab
  tableId: string;
  // Relationships
  tab?: {
    id: string;
    name: string;
    baseId: string;
  };
  table?: {
    id: string;
    name: string;
    columns?: Column[];
    formattedRows?: TableRow[];
  };
}

// Helper type for formatted table data
export interface FormattedTableData {
  id: string;
  name: string;
  description?: string | null;
  columns: Column[];
  formattedRows: TableRow[];
}
