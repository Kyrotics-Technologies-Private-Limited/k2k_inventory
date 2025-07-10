import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Product } from "../../types/index";
import type { Variant } from "../../types/variant";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface EditVariantForm {
  weight: string;
  price: number;
  originalPrice: number;
  discount: number;
  inStock: boolean;
  units_in_stock: number;
}

const VariantDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState({
    product: true,
    variants: true,
  });
  const [error, setError] = useState({
    product: "",
    variants: "",
  });
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [editFormData, setEditFormData] = useState<EditVariantForm>({
    weight: "",
    price: 0,
    originalPrice: 0,
    discount: 0,
    inStock: true,
    units_in_stock: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading({ product: true, variants: true });
        setError({ product: "", variants: "" });

        // Fetch product data
        const productData = await productApi.getProductById(productId!);
        setProduct(productData);
        setLoading((prev) => ({ ...prev, product: false }));

        // Fetch variants data
        const variantsData = await variantApi.getVariantsByProductId(
          productId!
        );
        setVariants(variantsData);
        setLoading((prev) => ({ ...prev, variants: false }));
      } catch (err) {
        console.error("Fetch error:", err);
        setError({
          product: "Failed to load product information",
          variants: "Failed to load variants",
        });
        setLoading({ product: false, variants: false });
      }
    };

    fetchData();
  }, [productId]);

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm("Are you sure you want to delete this variant?"))
      return;

    try {
      if (!productId) {
        console.error("Product ID is undefined");
        setError((prev) => ({
          ...prev,
          variants: "Failed to delete variant due to missing product ID",
        }));
        return;
      }

      await variantApi.deleteVariant(productId, variantId); // ✅ uses both IDs
      setVariants((prev) => prev.filter((v) => v.id !== variantId)); // remove from UI
    } catch (err) {
      console.error("Delete error:", err);
      setError((prev) => ({
        ...prev,
        variants: "Failed to delete variant. Please try again.",
      }));
    }
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setEditFormData({
      weight: variant.weight,
      price: variant.price,
      originalPrice: variant.originalPrice || 0,
      discount: variant.discount || 0,
      inStock: variant.inStock,
      units_in_stock:
        typeof variant.units_in_stock === "number" ? variant.units_in_stock : 0,
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setEditFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : ["price", "originalPrice", "discount", "units_in_stock"].includes(
              name
            )
          ? value === ""
            ? 0
            : Number(value)
          : value,
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant || !productId) return;

    try {
      const updatedVariant = await variantApi.updateVariant(
        productId, // productId as first param
        editingVariant.id, // variantId as second param
        {
          id: editingVariant.id,
          ...editFormData,
          productId
        } // payload: use the value from the form, not the old variant
      );

      setVariants((prev) =>
        prev.map((v) =>
          v.id === editingVariant.id ? { ...v, ...updatedVariant } : v
        )
      );
      setEditingVariant(null);
      setError((prev) => ({ ...prev, variants: "" }));
    } catch (err) {
      console.error("Update error:", err);
      setError((prev) => ({
        ...prev,
        variants:
          "Failed to update variant. Please check the data and try again.",
      }));
    }
  };

  const handleRetryVariants = async () => {
    try {
      setLoading((prev) => ({ ...prev, variants: true }));
      setError((prev) => ({ ...prev, variants: "" }));
      const variantsData = await variantApi.getVariantsByProductId(productId!);
      setVariants(variantsData);
      setLoading((prev) => ({ ...prev, variants: false }));
    } catch (err) {
      console.error("Retry error:", err);
      setError((prev) => ({ ...prev, variants: "Failed to load variants" }));
      setLoading((prev) => ({ ...prev, variants: false }));
    }
  };

  const cancelEdit = () => {
    setEditingVariant(null);
  };

  if (loading.product) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
          {error.product || "Product not found"}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Products
        </button>

        <Link
          to={`/admin/products/${productId}/variants/new`}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Variant
        </Link>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start">
            {product.images?.main && (
              <img
                src={product.images.main}
                alt={product.name}
                className="h-20 w-20 object-cover rounded-md mr-4"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {product.name}
              </h1>
              <p className="text-gray-600 capitalize">{product.category}</p>
              <p className="text-gray-900 font-medium mt-1">
                Base Price: ₹{product.price?.amount?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {error.variants && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            {error.variants}
          </div>
          <button
            onClick={handleRetryVariants}
            className="flex items-center text-yellow-700 hover:text-yellow-800"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingVariant && (
        <div className="fixed inset-0 bg-gray-900/60 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Edit Variant
              </h2>
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <input
                      type="text"
                      name="weight"
                      value={editFormData.weight}
                      onChange={handleEditInputChange}
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
                      value={editFormData.price}
                      onChange={handleEditInputChange}
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
                      value={editFormData.originalPrice}
                      onChange={handleEditInputChange}
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
                      value={editFormData.discount}
                      onChange={handleEditInputChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Units in Stock
                    </label>
                    <input
                      type="number"
                      name="units_in_stock"
                      value={editFormData.units_in_stock}
                      onChange={handleEditInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={editFormData.inStock}
                      onChange={handleEditInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      In Stock
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="button px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Variants Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Product Variants
            </h2>
            <p className="text-gray-600 text-sm">
              Manage all variants for this product
            </p>
          </div>
          {loading.variants && (
            <div className="flex items-center text-gray-500">
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        {!loading.variants && variants.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No variants found for this product.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Original Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Units in Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.weight}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{variant.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.originalPrice
                        ? `₹${variant.originalPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.discount ? `${variant.discount}%` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {variant.inStock ? (
                        <span className="text-green-600 font-medium">
                          In Stock
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {variant.units_in_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditVariant(variant)}
                        className="button inline-flex items-center px-2 py-1 text-xs text-white bg-green-500 hover:bg-green-600 rounded"
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        className="button inline-flex items-center px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantDetailsPage;
