import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {Variant} from "../../types/variant";
import variantApi from "../../services/api/variantApi";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
// interface Variant {
//   id: string;
//   productId: string;
//   weight: string;
//   price: number;
//   originalPrice?: number;
//   discount?: number;
//   inStock: boolean;
//   createdAt?: Date;
//   updatedAt?: Date;
// }
const VariantEditPage: React.FC = () => {
  const { productId, variantId } = useParams<{
    productId: string;
    variantId: string;
  }>();
  const navigate = useNavigate();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    weight: "",
    price: "",
    originalPrice: "",
    discount: "",
    inStock: true,
    units_in_stock: "",
  });
  const [originalFormData, setOriginalFormData] = useState({
    weight: "",
    price: "",
    originalPrice: "",
    discount: "",
    inStock: true,
    units_in_stock: "",
  });

  useEffect(() => {
    const fetchVariant = async () => {
      try {
        setLoading(true);
        const data = await variantApi.getVariantById(variantId!);
        setVariant(data);
        const loadedForm = {
          weight: data.weight,
          price: data.price ? String(data.price) : "",
          originalPrice: data.originalPrice ? String(data.originalPrice) : "",
          discount: data.discount ? String(data.discount) : "",
          inStock: data.inStock,
          units_in_stock: data.units_in_stock ? String(data.units_in_stock) : "",
        };
        setFormData(loadedForm);
        setOriginalFormData(loadedForm);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch variant:", err);
        setError("Failed to load variant data");
        setLoading(false);
      }
    };
    fetchVariant();
  }, [variantId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const variantData = {
        id: variantId!,
        productId: productId!,
        weight: formData.weight,
        price: Number(formData.price) || 0,
        originalPrice: Number(formData.originalPrice) || 0,
        discount: Number(formData.discount) || 0,
        inStock: formData.inStock,
        units_in_stock: Number(formData.units_in_stock) || 0,
      };
      await variantApi.updateVariant(productId!, variantId!, variantData);
      navigate(`/admin/products/${productId}/variants`);
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update variant");
    }
  };

  const handleReset = () => {
    setFormData(originalFormData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
          {error || "Variant not found"}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Variants
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Variants
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Edit Variant</h3>
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight
              </label>
              <input
                type="text"
                name="weight"
                value={formData.weight || ""}
                onChange={handleInputChange}
                placeholder="e.g., 500g, 1kg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹)
              </label>
              <input
                name="price"
                type="text"
                min="0"
                step="0.01"
                value={formData.price || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter price or let it auto-calculate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (₹)
              </label>
              <input
                name="originalPrice"
                type="text"
                min="0"
                step="0.01"
                value={formData.originalPrice || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <input
                name="discount"
                type="text"
                min="0"
                max="100"
                value={formData.discount || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units in Stock
              </label>
              <input
                type="text"
                name="units_in_stock"
                value={formData.units_in_stock || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                name="inStock"
                type="checkbox"
                checked={formData.inStock}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                In Stock
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="button px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Update Variant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VariantEditPage;
