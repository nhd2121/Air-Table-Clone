import React from "react";
import { Plus } from "lucide-react";

interface AddRowButtonProps {
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
}

const AddRowButton: React.FC<AddRowButtonProps> = ({
  isLoading = false,
  onClick,
  className = "flex w-full items-center justify-start px-4 py-2 border-b text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50",
}) => {
  return (
    <button onClick={onClick} disabled={isLoading} className={className}>
      {isLoading ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></span>
          Adding...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
        </>
      )}
    </button>
  );
};

export default AddRowButton;
