import React from "react";
import type { Product } from "../../../types";
import type { Category } from "../../../services/api/categoryApi";
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";

interface ProductListProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewVariants: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  categories,
  onEdit,
  onDelete,
  onViewVariants,
  onViewDetails,
}) => {
  const getProductCategoryInfo = (product: Product): { name: string; isActive: boolean }[] => {
    const ids = product.categoryIds || (product.categoryId ? [product.categoryId] : []);
    if (ids.length > 0) {
      return ids
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is Category => Boolean(c))
        .map((c) => ({ name: c.name, isActive: c.isActive !== false }));
    }
    if (product.categories?.length) {
      return product.categories.map((name) => ({ name, isActive: true }));
    }
    if (product.category) {
      return [{ name: product.category, isActive: true }];
    }
    return [];
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No products found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List Presentation (Table) */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 w-full">
        <div className="w-full">
          <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
            <colgroup>
              <col className="w-[45%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const catInfos = getProductCategoryInfo(product);
                const isProductDisabled = (product.status && product.status !== "active") || catInfos.some(cat => !cat.isActive);
                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      isProductDisabled
                        ? "bg-gray-50/50 hover:bg-gray-100/50 text-gray-500 opacity-70 border-l-4 border-l-gray-300"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          {product.images?.main ? (
                            <img
                              src={product.images.main}
                              alt={product.name}
                              className={`h-full w-full object-cover ${
                                isProductDisabled ? "grayscale" : ""
                              }`}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {catInfos.map((cat) => (
                          <span
                            key={cat.name}
                            className={`px-2 py-0.5 text-[10px] rounded uppercase font-medium border ${
                              cat.isActive
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-red-50 text-red-700 border-red-100"
                            }`}
                            title={cat.isActive ? undefined : "Category is disabled"}
                          >
                             {cat.name} {!cat.isActive && "(Disabled)"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.status === "active"
                            ? "bg-green-100 text-green-800"
                            : product.status === "hidden"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                      {product.rank ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onViewDetails(product.id)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-all duration-200 cursor-pointer"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(product)}
                          className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 hover:text-yellow-700 rounded-full transition-all duration-200 cursor-pointer"
                          title="Edit Product"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewVariants(product.id)}
                          className="p-2 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 rounded-full transition-all duration-200 cursor-pointer"
                          title="Manage Variants"
                        >
                          <QueueListIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(product.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-full transition-all duration-200 cursor-pointer"
                          title="Delete Product"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
