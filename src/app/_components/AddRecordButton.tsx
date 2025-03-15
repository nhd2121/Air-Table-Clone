import React from "react";
import { Plus } from "lucide-react";

interface AddRecordButtonProps {
  handleAddRow: () => void;
  className?: string;
  title?: string;
  iconSize?: number;
}

const AddRecordButton: React.FC<AddRecordButtonProps> = ({
  handleAddRow,
  className = "flex h-full w-full items-center justify-center py-3 text-gray-400 hover:text-gray-600",
  title = "Add new record",
  iconSize = 18,
}) => {
  return (
    <button onClick={handleAddRow} className={className} title={title}>
      <Plus size={iconSize} />
    </button>
  );
};

export default AddRecordButton;
