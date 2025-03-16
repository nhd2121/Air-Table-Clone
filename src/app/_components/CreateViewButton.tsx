import React from "react";
import { Plus, TableCellsSplit } from "lucide-react";

interface CreateViewButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  iconSize?: number;
}

const CreateViewButton: React.FC<CreateViewButtonProps> = ({
  onClick,
  label = "Views",
  className = "flex w-full items-center justify-between bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-100",
  iconSize = 16,
}) => {
  return (
    <button onClick={onClick} className={className}>
      <div className="flex items-center">
        <TableCellsSplit size={16} className="mr-2 text-blue-600" />
        {label}
      </div>
      <Plus size={iconSize} className="mr-1" />
    </button>
  );
};

export default CreateViewButton;
