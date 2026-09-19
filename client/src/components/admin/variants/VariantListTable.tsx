import React from "react";
import type { Variant } from "../../../types/variant";
import { ArrowPathIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { formatPrice } from "../../../utils/gstCalculations";

interface VariantListTableProps {
  variants: Variant[];
  loadingVariants: boolean;
  onEdit: (variant: Variant) => void;
  onDelete: (id: string) => void;
}

const VariantListTable: React.FC<VariantListTableProps> = ({
  variants,
  loadingVariants,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Product Variants</h2>
          <p className="text-gray-500 text-sm">Manage all variants for this product</p>
        </div>
        {loadingVariants && (
          <div className="flex items-center text-gray-500 text-sm">
            <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {!loadingVariants && variants.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No variants found for this product.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Original Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Member Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Membership Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  GST
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Units in Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {variant.weight}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {variant.originalPrice ? formatPrice(variant.originalPrice) : "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 font-bold">
                    {formatPrice(variant.price)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                    {variant.discount ? `${variant.discount}%` : "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-green-700 font-bold">
                    {variant.memberPrice ? formatPrice(variant.memberPrice) : "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                    {variant.memberDiscount ? `${variant.memberDiscount}%` : "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                    {variant.gstPercentage ? `${variant.gstPercentage}%` : "0%"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium">
                    <span className={variant.inStock ? "text-green-600" : "text-red-600"}>
                      {variant.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {variant.units_in_stock}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(variant)}
                        title="Edit Variant"
                        className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(variant.id)}
                        title="Delete Variant"
                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VariantListTable;
