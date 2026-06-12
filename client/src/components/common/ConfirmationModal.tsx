import { useEffect } from "react";
import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  type = "info",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getThemeClasses = () => {
    switch (type) {
      case "danger":
        return {
          iconBg: "bg-red-50 text-red-600",
          icon: ExclamationTriangleIcon,
          confirmBtn: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 text-amber-600",
          icon: ExclamationTriangleIcon,
          confirmBtn: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
        };
      case "info":
      default:
        return {
          iconBg: "bg-blue-50 text-blue-600",
          icon: InformationCircleIcon,
          confirmBtn: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        };
    }
  };

  const theme = getThemeClasses();
  const IconComponent = theme.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-2xl transition-all animate-fadeIn">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${theme.iconBg}`}>
            <IconComponent className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-0 text-left">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-row-reverse justify-start gap-3">
          <button
            type="button"
            className={`inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${theme.confirmBtn}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 cursor-pointer"
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
