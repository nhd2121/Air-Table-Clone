import React from "react";

const LoadingTableData = () => {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading table data...</p>
      </div>
    </div>
  );
};

export default LoadingTableData;
