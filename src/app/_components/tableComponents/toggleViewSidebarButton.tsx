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
  className = "flex gap-1 h-6 ml-2 items-center bg-white px-2 text-[13px] font-normal leading-[1.5] text-black hover:bg-gray-100",
}) => {
  return (
    <button
      onClick={onClick}
      className={`${className} ${isOpen ? "bg-gray-100" : ""}`}
    >
      <AlignJustify size={16} className="text-black" />
      {label}
    </button>
  );
};

export default ToggleViewSidebarButton;
