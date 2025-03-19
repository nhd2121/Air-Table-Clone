import React from "react";
import { Loader2, Plus } from "lucide-react";

interface Add100RowsButtonProps {
  onClick: () => void;
  isLoading: boolean;
  className?: string;
  buttonText?: string;
}

const Add100RowsButton: React.FC<Add100RowsButtonProps> = ({
  onClick,
  isLoading,
  className = "flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700",
  buttonText = "Add 100 Rows",
}) => {
  return (
    <button onClick={onClick} disabled={isLoading} className={className}>
      {isLoading ? (
        <>
          <Loader2 size={16} className="mr-1 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus size={16} className="mr-1" />
          {buttonText}
        </>
      )}
    </button>
  );
};

export default Add100RowsButton;
