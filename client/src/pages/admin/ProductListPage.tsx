// src/pages/ProductListPage.tsx
import React, { useEffect, useState } from "react";
import type { Product } from "../../types";
import { productApi } from "../../services/api/productApi";
import { Link } from "react-router-dom";

const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const fetched = await productApi.getAllProducts();
        setProducts(fetched);
      } catch (e) {
        setError("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
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
              <p>{product.description}</p>
              <p className="text-green-600 font-semibold">
                ₹{product.price.amount}
              </p>
              <Link
                to={`/product/${product.id}`}
                className="mt-3 inline-block bg-blue-500 text-white px-3 py-1 rounded"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
