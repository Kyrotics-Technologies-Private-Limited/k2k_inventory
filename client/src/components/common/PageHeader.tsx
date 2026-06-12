import React from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  backText?: string;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  onBack,
  backText = "Back",
  actions,
  className = "",
}) => {
  return (
    <div className={`mb-6 flex flex-col space-y-2 ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 cursor-pointer transition-colors text-sm font-medium w-fit mb-1"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
          {backText}
        </button>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 w-full md:w-auto">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
