// src/types/db.ts

// Define type for Column
export interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
  createdAt: Date;
  updatedAt: Date;
  tableId: string;
}

// Define type for Table
export interface Table {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  baseId: string;
  columns?: Column[];
}

// Define type for Row
export interface Row {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  tableId: string;
}

// Define type for Cell
export interface Cell {
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
  columnId: string;
  rowId: string;
}

// Define type for Base
export interface Base {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  tables?: Table[];
}

// Define a type for the table row that appears in the UI
export interface TableRow {
  id: string;
  [key: string]: string | null;
}
