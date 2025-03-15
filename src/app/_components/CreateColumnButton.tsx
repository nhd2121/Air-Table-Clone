import React from "react";
import { Plus } from "lucide-react";

interface CreateColumnButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
  iconSize?: number;
}

const CreateColumnButton: React.FC<CreateColumnButtonProps> = ({
  onClick,
  className = "flex h-full w-10 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-600",
  title = "Add field",
  iconSize = 18,
}) => {
  return (
    <div className={className} onClick={onClick} title={title}>
      <Plus size={iconSize} />
    </div>
  );
};

export default CreateColumnButton;
