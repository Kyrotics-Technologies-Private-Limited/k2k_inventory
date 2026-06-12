import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  fullscreen?: boolean;
  inline?: boolean;
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = "md",
  color = "border-blue-500",
  fullscreen = false,
  inline = false,
  text,
}) => {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-t-2 border-b-2",
    lg: "h-16 w-16 border-t-2 border-b-2",
    xl: "h-24 w-24 border-t-4 border-b-4",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${color}`}
      ></div>
      {text && <p className="text-gray-500 text-sm font-medium">{text}</p>}
    </div>
  );

  if (inline) {
    return spinner;
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[200px]">
      {spinner}
    </div>
  );
};

export default Loader;
