import React from "react";
import { Plus } from "lucide-react";

interface AddColumnButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export function AddColumnButton({
  onClick,
  className = "flex h-full w-full items-center justify-center text-gray-400 hover:text-gray-600",
  title = "Add column",
}: AddColumnButtonProps) {
  return (
    <button onClick={onClick} className={className} title={title}>
      <Plus size={18} />
    </button>
  );
}
