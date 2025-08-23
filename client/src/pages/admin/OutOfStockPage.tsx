import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import { useNavigate } from "react-router-dom";

interface Variant {
  id?: string;
  name?: string;
  units_in_stock: number;
  image?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  images: { main: string };
}

const OutOfStockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, Variant[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductsAndVariants = async () => {
      setLoading(true);
      try {
        const allProducts: Product[] = await productApi.getAllProducts();
        setProducts(allProducts);
        const variantsPromises = allProducts.map((product) =>
          variantApi.getVariantsByProductId(product.id)
        );
        const allVariants = await Promise.all(variantsPromises);
        const map: Record<string, Variant[]> = {};
        allProducts.forEach((product, idx) => {
          // Accept any shape for variants, as long as units_in_stock exists
          map[product.id] = (allVariants[idx] as Variant[]);
        });
        setVariantsMap(map);
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchProductsAndVariants();
  }, []);

  // Filter products with out of stock or low stock variants
  const filtered = products
    .map((product) => {
      const variants = variantsMap[product.id] || [];
      const outOfStock = variants.filter((v) => v.units_in_stock <= 0);
      const lowStock = variants.filter(
        (v) => v.units_in_stock > 0 && v.units_in_stock < 5
      );
      return {
        ...product,
        outOfStock,
        lowStock,
      };
    })
    .filter((p) => (p.outOfStock?.length ?? 0) > 0 || (p.lowStock?.length ?? 0) > 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Out of Stock & Low Stock Products</h1>
      {loading ? (
        <div className="flex justify-center items-center h-40">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500">All products are sufficiently stocked.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <img
                  src={product.images.main}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded mr-4 border"
                />
                <div>
                  <h2 className="text-lg font-semibold">{product.name}</h2>
                  <div className="text-sm text-gray-500 capitalize">{product.category}</div>
                </div>
              </div>
              {product.outOfStock.length > 0 && (
                <div className="mb-2">
                  <div className="font-bold text-red-600">Out of Stock Variants:</div>
                  <ul className="list-disc ml-6">
                    {product.outOfStock.map((variant) => (
                      <li key={variant.id} className="flex items-center">
                        {variant.image && (
                          <img src={variant.image} alt={variant.name} className="w-8 h-8 object-cover rounded mr-2 border" />
                        )}
                        <span>{variant.name}</span>
                        <span className="ml-2 text-xs text-gray-400">(0 in stock)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {product.lowStock.length > 0 && (
                <div>
                  <div className="font-bold text-yellow-600">Low Stock Variants:</div>
                  <ul className="list-disc ml-6">
                    {product.lowStock.map((variant) => (
                      <li key={variant.id} className="flex items-center">
                        {variant.image && (
                          <img src={variant.image} alt={variant.name} className="w-8 h-8 object-cover rounded mr-2 border" />
                        )}
                        <span>{variant.name}</span>
                        <span className="ml-2 text-xs text-gray-400">({variant.units_in_stock} left)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutOfStockPage;
