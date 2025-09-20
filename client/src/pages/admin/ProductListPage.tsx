// src/pages/ProductListPage.tsx
import React, { useEffect, useState } from "react";
import type { Product } from "../../types";
import type { Variant } from "../../types/variant";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import { calculatePriceIncludingGST, formatPrice } from "../../utils/gstCalculations";
import { Link } from "react-router-dom";

interface ProductWithVariants extends Product {
  variants: Variant[];
  priceRange: {
    min: number;
    max: number;
    minWithGST: number;
    maxWithGST: number;
  };
}

const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calculate price range for a product based on its variants
  const calculatePriceRange = (variants: Variant[]) => {
    if (variants.length === 0) {
      return { min: 0, max: 0, minWithGST: 0, maxWithGST: 0 };
    }

    const prices = variants.map(v => v.price);
    const pricesWithGST = variants.map(v => 
      calculatePriceIncludingGST(v.price, v.gstPercentage || 0)
    );

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      minWithGST: Math.min(...pricesWithGST),
      maxWithGST: Math.max(...pricesWithGST)
    };
  };

  // Fetch products with their variants
  useEffect(() => {
    const fetchProductsWithVariants = async () => {
      setLoading(true);
      try {
        const fetchedProducts = await productApi.getAllProducts();
        
        // Fetch variants for each product
        const productsWithVariants = await Promise.all(
          fetchedProducts.map(async (product) => {
            try {
              const variants = await variantApi.getVariantsByProductId(product.id);
              const priceRange = calculatePriceRange(variants);
              
              return {
                ...product,
                variants,
                priceRange
              };
            } catch (error) {
              console.error(`Failed to fetch variants for product ${product.id}:`, error);
              return {
                ...product,
                variants: [],
                priceRange: { min: 0, max: 0, minWithGST: 0, maxWithGST: 0 }
              };
            }
          })
        );
        
        setProducts(productsWithVariants);
      } catch (e) {
        setError("Failed to fetch products");
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductsWithVariants();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Product List</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Product List */}
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="border p-4 rounded shadow bg-white"
            >
              {product.images.main ? (
                <img
                  src={product.images.main}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded mb-2 text-gray-500">
                  No Image
                </div>
              )}
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{product.description}</p>
              
              {/* Price Display */}
              <div className="mb-3">
                {product.variants.length > 0 ? (
                  <div>
                    <div className="text-green-600 font-semibold text-lg">
                      {product.priceRange.minWithGST === product.priceRange.maxWithGST
                        ? formatPrice(product.priceRange.minWithGST)
                        : `${formatPrice(product.priceRange.minWithGST)} - ${formatPrice(product.priceRange.maxWithGST)}`
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.priceRange.min === product.priceRange.max
                        ? `Base: ${formatPrice(product.priceRange.min)}`
                        : `Base: ${formatPrice(product.priceRange.min)} - ${formatPrice(product.priceRange.max)}`
                      }
                    </div>
                    <div className="text-xs text-blue-600">
                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''} available
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-500 font-semibold">
                      No variants available
                    </div>
                    <div className="text-xs text-gray-400">
                      Base price: {formatPrice(product.price.amount)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-2 mt-3">
                <Link
                  to={`/admin/products/${product.id}/variants`}
                  className="inline-block bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  Manage Variants
                </Link>
                <Link
                  to={`/admin/products/${product.id}`}
                  className="inline-block bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
