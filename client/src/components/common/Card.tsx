import React from "react";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = "",
  onClick,
  hoverable = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-lg shadow flex flex-col justify-between transition-all duration-200 ${
        hoverable ? "hover:shadow-lg hover:bg-gray-50" : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {title && <p className="text-gray-500 text-sm font-medium mb-2">{title}</p>}
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </div>
  );
};

export default Card;
