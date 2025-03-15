import React from "react";
import { Layers, Settings } from "lucide-react";

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
  className = "flex w-full items-center rounded-md px-3 py-2 text-left text-sm",
  activeClassName = "bg-blue-50 text-blue-700",
  inactiveClassName = "text-gray-700 hover:bg-gray-100",
}) => {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`${className} ${isActive ? activeClassName : inactiveClassName}`}
    >
      <Layers size={16} className="mr-2" />
      {name}
      <Settings
        size={14}
        className="ml-auto text-gray-400 hover:text-gray-600"
      />
    </button>
  );
};

export default ViewSelectButton;
