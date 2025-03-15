import React from "react";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";

interface ToggleViewSidebarButtonProps {
  isOpen: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
  iconClassName?: string;
  chevronClassName?: string;
}

const ToggleViewSidebarButton: React.FC<ToggleViewSidebarButtonProps> = ({
  isOpen,
  onClick,
  label = "Views",
  className = "flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50",
  chevronClassName = "ml-1",
}) => {
  return (
    <button onClick={onClick} className={className}>
      <Layers size={16} className="mr-1 text-gray-500" />
      {label}
      {isOpen ? (
        <ChevronLeft size={14} className={chevronClassName} />
      ) : (
        <ChevronRight size={14} className={chevronClassName} />
      )}
    </button>
  );
};

export default ToggleViewSidebarButton;
