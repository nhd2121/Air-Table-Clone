import React from "react";
import { Check, TableCellsSplit } from "lucide-react";

interface ViewSelectButtonProps {
  id: string;
  name: string;
  isActive: boolean;
  onSelect: (id: string) => void;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

const ViewSelectButton: React.FC<ViewSelectButtonProps> = ({
  id,
  name,
  isActive,
  onSelect,
  className = "flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-normal leading-[1.5]",
  activeClassName = "bg-blue-100 text-black",
  inactiveClassName = "text-black hover:bg-gray-100",
}) => {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`${className} ${isActive ? activeClassName : inactiveClassName}`}
    >
      <TableCellsSplit size={16} className="mr-2 text-blue-600" />
      {name}
      {isActive ? <Check size={14} className="ml-auto" /> : <></>}
    </button>
  );
};

export default ViewSelectButton;
