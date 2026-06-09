import { useEffect, useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { categoryApi } from "../../../services/api/categoryApi";
import type { Category, CategoryProduct } from "../../../types/category";

interface CategoryProductsPanelProps {
  category: Category;
}

const CategoryProductsPanel = ({ category }: CategoryProductsPanelProps) => {
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




  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;

    const reordered = [...products];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const items = reordered.map((p, i) => ({
      productId: p.id,
      sortOrder: (i + 1) * 100,
    }));

    setProducts(
      reordered.map((p, i) => ({
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
    <div className="rounded-lg border bg-white shadow-md">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900">Products in {category.name}</h3>
        <p className="text-xs text-gray-500">Drag to reorder</p>
      </div>



      {loading ? (
        <p className="p-4 text-sm text-gray-500">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No products in this category.</p>
      ) : (
        <ul className="divide-y">
          {products.map((product, index) => (
            <li
              key={product.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Bars3Icon className="h-5 w-5 shrink-0 text-gray-400" />
              {productImage(product) ? (
                <img
                  src={productImage(product)}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-gray-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
              </div>
              {product.isBestseller && (
                <span className="inline-flex items-center px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded shadow-sm shrink-0">
                  🏆 Bestseller
                </span>
              )}

            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CategoryProductsPanel;
