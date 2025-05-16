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
  const [formData, setFormData] = useState<Partial<Variant>>({
    weight: "",
    price: 0,
    originalPrice: 0,
    discount: 0,
    inStock: true,
  });

  useEffect(() => {
    const fetchVariant = async () => {
      try {
        setLoading(true);
        const data = await variantApi.getVariantById(variantId!);
        setVariant(data);
        setFormData({
          weight: data.weight,
          price: data.price,
          originalPrice: data.originalPrice || 0,
          discount: data.discount || 0,
          inStock: data.inStock,
        });
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
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? Number(value)
          : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await variantApi.updateVariant(productId!, variantId!, formData as Variant);
      navigate(`/admin/products/${productId}/variants`);
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update variant");
    }
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Variant</h1>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price || 0}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (₹)
              </label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice || 0}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                name="discount"
                value={formData.discount || 0}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="inStock"
              checked={formData.inStock || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">In Stock</label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VariantEditPage;
