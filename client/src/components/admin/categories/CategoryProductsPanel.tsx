import { useEffect, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { categoryApi } from "../../../services/api/categoryApi";
import type { Category, CategoryProduct } from "../../../types/category";

interface CategoryProductsPanelProps {
  category: Category;
  onClose: () => void;
}

const CategoryProductsPanel = ({ category, onClose }: CategoryProductsPanelProps) => {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getProducts(category.id);
      setProducts(data);
    } catch (err) {
      console.error("Failed to load category products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category.id]);




  const isCategoryDisabled = category.isActive === false;

  const activeProducts = isCategoryDisabled
    ? []
    : products.filter((p) => !p.status || p.status === "active");

  const disabledProducts = isCategoryDisabled
    ? products
    : products.filter((p) => p.status && p.status !== "active");

  const handleDrop = async (targetActiveIndex: number) => {
    if (dragIndex === null || dragIndex === targetActiveIndex) return;

    const reorderedActive = [...activeProducts];
    const [moved] = reorderedActive.splice(dragIndex, 1);
    reorderedActive.splice(targetActiveIndex, 0, moved);

    const combined = [...reorderedActive, ...disabledProducts];

    const items = combined.map((p, i) => ({
      productId: p.id,
      sortOrder: (i + 1) * 100,
    }));

    setProducts(
      combined.map((p, i) => ({
        ...p,
        membership: { ...p.membership, sortOrder: (i + 1) * 100 },
      }))
    );
    setDragIndex(null);

    try {
      await categoryApi.reorderProducts(category.id, items);
      await categoryApi.rebuildManifest();
    } catch (err) {
      console.error("Failed to reorder products:", err);
      loadProducts();
    }
  };

  const productImage = (p: CategoryProduct) => p.images?.main || p.image;

  return (
    <div className="rounded-lg border bg-white shadow-md overflow-hidden">
      <div className="border-b px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            Products in {category.name}
            {category.isActive === false && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                Disabled
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500">Drag items in the active products table to reorder</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors p-1.5 rounded-full hover:bg-gray-200/60 cursor-pointer"
          aria-label="Close panel"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-sm text-gray-500">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 text-center">No products in this category.</p>
      ) : (
        <div className="divide-y divide-gray-200">
          {/* Active Products Section */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Products</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {activeProducts.length} items
              </span>
            </div>
            
            {activeProducts.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded border border-dashed">
                No active products in this category.
              </p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 w-full">
                <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[48%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Order
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Bestseller
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeProducts.map((product, index) => (
                      <tr
                        key={product.id}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        className="hover:bg-gray-50 transition-colors cursor-move"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Bars3Icon className="h-5 w-5 text-gray-400" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                              {productImage(product) ? (
                                <img
                                  src={productImage(product)}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                  No Img
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]" title={product.name}>
                                {product.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200 uppercase">
                            {product.status || "active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.isBestseller && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded shadow-sm shrink-0">
                              🏆 Bestseller
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Disabled Products Section */}
          {disabledProducts.length > 0 && (
            <div className="p-4 space-y-3 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disabled Products</h4>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {disabledProducts.length} items
                </span>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 w-full">
                <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
                  <colgroup>
                    <col className="w-[60%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Bestseller
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {disabledProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="bg-gray-50/50 hover:bg-gray-100/50 text-gray-500 opacity-70 border-l-4 border-l-gray-300 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                              {productImage(product) ? (
                                <img
                                  src={productImage(product)}
                                  alt={product.name}
                                  className="h-full w-full object-cover grayscale"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                  No Img
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-400 line-through truncate max-w-[200px]" title={product.name}>
                                {product.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.isBestseller && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-300 text-gray-600 text-[10px] font-bold rounded shadow-sm shrink-0">
                              🏆 Bestseller
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryProductsPanel;
