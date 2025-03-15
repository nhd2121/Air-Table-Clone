import React from "react";
import { Plus } from "lucide-react";

interface AddRowsButtonProps {
  handleAdd100Rows: () => void;
  isAddingRows: boolean;
  isSearching?: boolean;
  position?: string;
  title?: string;
  count?: number;
}

const AddRowsButton: React.FC<AddRowsButtonProps> = ({
  handleAdd100Rows,
  isAddingRows,
  isSearching = false,
  position = "absolute bottom-24 right-8",
  title = "Add 100 Rows",
  count = 100,
}) => {
  return (
    <button
      onClick={handleAdd100Rows}
      className={`${position} flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700`}
      disabled={isAddingRows || isSearching}
      title={title || `Add ${count} Rows`}
    >
      {isAddingRows ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
      ) : (
        <Plus size={20} />
      )}
    </button>
  );
};

export default AddRowsButton;
