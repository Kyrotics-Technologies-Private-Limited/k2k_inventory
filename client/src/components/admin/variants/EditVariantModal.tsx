import React, { useState, useEffect } from "react";
import type { Variant } from "../../../types/variant";
import variantApi from "../../../services/api/variantApi";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  calculatePriceIncludingGST,
  calculateGSTAmount,
  formatPrice,
  GST_RATE_OPTIONS,
} from "../../../utils/gstCalculations";

const WEIGHT_UNITS = ["g", "kg", "ml", "l"];

interface EditVariantModalProps {
  variant: Variant;
  productId: string;
  onClose: () => void;
  onSuccess: (updatedVariant: Variant) => void;
  isWeightDuplicate: (weight: string, excludeId?: string) => boolean;
}

const EditVariantModal: React.FC<EditVariantModalProps> = ({
  variant,
  productId,
  onClose,
  onSuccess,
  isWeightDuplicate,
}) => {
  const [formData, setFormData] = useState({
    weight: "",
    weightNumber: "",
    weightUnit: "g",
    price: 0,
    originalPrice: 0,
    discount: 0,
    gstPercentage: 18,
    customGstPercentage: "",
    useCustomGst: false,
    inStock: true,
    units_in_stock: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const [weightNumber, weightUnit] = variant.weight.split(/\s+/);
    setFormData({
      weight: variant.weight,
      weightNumber: weightNumber || "",
      weightUnit: weightUnit || "g",
      price: variant.price,
      originalPrice: variant.originalPrice || 0,
      discount: variant.discount || 0,
      gstPercentage: variant.gstPercentage || 18,
      customGstPercentage: "",
      useCustomGst: false,
      inStock: variant.inStock,
      units_in_stock: typeof variant.units_in_stock === "number" ? variant.units_in_stock : 0,
    });
    setError("");
  }, [variant]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (error) {
      setError("");
    }

    if (name === "weightNumber" || name === "weightUnit") {
      const number = name === "weightNumber" ? value : formData.weightNumber;
      const unit = name === "weightUnit" ? value : formData.weightUnit;
      const updatedValue = `${number || ""} ${unit || ""}`.trim();

      setFormData((prev) => ({
        ...prev,
        weight: updatedValue,
        [name]: value,
      }));
    } else {
      setFormData((prev) => {
        const updatedData = {
          ...prev,
          [name]:
            type === "checkbox"
              ? checked
              : ["price", "originalPrice", "units_in_stock"].includes(name)
              ? value === ""
                ? 0
                : Number(value)
              : value,
        };

        if (name === "price" || name === "originalPrice") {
          const price = name === "price" ? Number(value) : prev.price;
          const originalPrice = name === "originalPrice" ? Number(value) : prev.originalPrice;

          if (originalPrice > 0 && price > 0) {
            const discountPercent = ((originalPrice - price) / originalPrice) * 100;
            updatedData.discount = Math.round(discountPercent * 100) / 100;
          } else {
            updatedData.discount = 0;
          }
        }

        return updatedData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isWeightDuplicate(formData.weight, variant.id)) {
      const [number] = formData.weight.trim().split(/\s+/);
      setError(
        `A variant with ${number} already exists (regardless of unit). Please choose a different quantity.`
      );
      setLoading(false);
      return;
    }

    try {
      const updatedVariant = await variantApi.updateVariant(productId, variant.id, {
        id: variant.id,
        ...formData,
        gstPercentage: Number(
          formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage
        ),
        productId,
      });

      onSuccess(updatedVariant);
    } catch (err) {
      setError("Failed to update variant. Please check the data and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Variant</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    name="weightNumber"
                    value={formData.weightNumber || ""}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formData.weight && isWeightDuplicate(formData.weight, variant.id)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    name="weightUnit"
                    value={formData.weightUnit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {WEIGHT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.weight && isWeightDuplicate(formData.weight, variant.id) && (
                <div className="text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                  A variant with {formData.weightNumber} already exists (regardless of unit)
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strike-Through Price (₹)
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Automatically calculated"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="editGstInputType"
                      checked={!formData.useCustomGst}
                      onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: false }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label className="text-sm text-gray-700">Select from options</label>
                  </div>
                  <select
                    name="gstPercentage"
                    value={formData.gstPercentage}
                    onChange={handleInputChange}
                    disabled={formData.useCustomGst}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formData.useCustomGst ? "bg-gray-100 text-gray-500" : ""
                    }`}
                    required={!formData.useCustomGst}
                  >
                    {GST_RATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="editGstInputType"
                      checked={formData.useCustomGst}
                      onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: true }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label className="text-sm text-gray-700">Enter custom GST</label>
                  </div>
                  <input
                    name="customGstPercentage"
                    type="number"
                    value={formData.customGstPercentage}
                    onChange={handleInputChange}
                    disabled={!formData.useCustomGst}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Enter GST percentage"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      !formData.useCustomGst ? "bg-gray-100 text-gray-500" : ""
                    }`}
                    required={formData.useCustomGst}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Including GST (₹)
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 text-blue-800 font-semibold">
                  {formData.price && (formData.gstPercentage || formData.customGstPercentage)
                    ? formatPrice(
                        calculatePriceIncludingGST(
                          formData.price,
                          Number(formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage)
                        )
                      )
                    : "₹0.00"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Base Price: {formatPrice(formData.price)} + GST:{" "}
                  {formData.price && (formData.gstPercentage || formData.customGstPercentage)
                    ? formatPrice(
                        calculateGSTAmount(
                          formData.price,
                          Number(formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage)
                        )
                      )
                    : "₹0.00"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units in Stock</label>
                <input
                  type="number"
                  name="units_in_stock"
                  value={formData.units_in_stock}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="inStock"
                  checked={formData.inStock}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">In Stock</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="button px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="button px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditVariantModal;
