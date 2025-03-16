import React from "react";
import { AlignJustify } from "lucide-react";

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
  className = "flex h-8 items-center bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50",
}) => {
  return (
    <button
      onClick={onClick}
      className={`${className} ${isOpen ? "bg-gray-100" : ""}`}
    >
      <AlignJustify size={16} className="mr-1 text-gray-500" />
      {label}
    </button>
  );
};

export default ToggleViewSidebarButton;
