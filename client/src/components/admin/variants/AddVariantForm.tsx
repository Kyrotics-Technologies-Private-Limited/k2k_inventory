import React, { useState } from "react";
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

interface AddVariantFormProps {
  productId: string;
  onSuccess: (newVariant: Variant) => void;
  isWeightDuplicate: (weight: string) => boolean;
}

const AddVariantForm: React.FC<AddVariantFormProps> = ({
  productId,
  onSuccess,
  isWeightDuplicate,
}) => {
  const [formData, setFormData] = useState({
    weight: "",
    weightNumber: "",
    weightUnit: "g",
    price: "",
    originalPrice: "",
    discount: "",
    gstPercentage: "18",
    customGstPercentage: "",
    useCustomGst: false,
    inStock: true,
    units_in_stock: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (error) {
      setError("");
    }

    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : ["price", "originalPrice", "units_in_stock", "gstPercentage"].includes(name)
            ? value === ""
              ? 0
              : Number(value)
            : value,
      };

      if (name === "weightNumber" || name === "weightUnit") {
        const number = name === "weightNumber" ? value : prev.weightNumber;
        const unit = name === "weightUnit" ? value : prev.weightUnit;
        updatedData.weight = `${number || ""} ${unit || ""}`.trim();
      }

      if (name === "price" || name === "originalPrice") {
        const price = name === "price" ? Number(value) : Number(prev.price);
        const originalPrice =
          name === "originalPrice" ? Number(value) : Number(prev.originalPrice);

        if (originalPrice > 0 && price > 0) {
          const discountPercent = ((originalPrice - price) / originalPrice) * 100;
          updatedData.discount = (Math.round(discountPercent * 100) / 100).toString();
        } else {
          updatedData.discount = "0";
        }
      }

      return updatedData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const finalWeight = `${formData.weightNumber || ""} ${formData.weightUnit || ""}`.trim();

    if (isWeightDuplicate(finalWeight)) {
      const [number] = finalWeight.trim().split(/\s+/);
      setError(`A variant with ${number} already exists . Please choose a different quantity.`);
      setLoading(false);
      return;
    }

    try {
      const newVariant = await variantApi.createVariant(productId, {
        weight: finalWeight,
        productId,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        discount: Number(formData.discount),
        gstPercentage: Number(
          formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage
        ),
        inStock: formData.inStock,
        units_in_stock: Number(formData.units_in_stock),
      });

      onSuccess(newVariant);
      setFormData({
        weight: "",
        weightNumber: "",
        weightUnit: "g",
        price: "",
        originalPrice: "",
        discount: "",
        gstPercentage: "18",
        customGstPercentage: "",
        useCustomGst: false,
        inStock: true,
        units_in_stock: "",
      });
    } catch (err) {
      setError("Failed to add variant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white p-6 rounded shadow border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Variant</h3>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
            <input
              type="number"
              name="weightNumber"
              value={formData.weightNumber}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              placeholder="Enter weight"
              className={`w-full px-3 py-2 border rounded-md ${
                formData.weightNumber &&
                formData.weightUnit &&
                isWeightDuplicate(`${formData.weightNumber} ${formData.weightUnit}`.trim())
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
        {formData.weightNumber &&
          formData.weightUnit &&
          isWeightDuplicate(`${formData.weightNumber} ${formData.weightUnit}`.trim()) && (
            <div className="text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              A variant with {formData.weightNumber} already exists
            </div>
          )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Striked-Through Price (₹)
          </label>
          <input
            name="originalPrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.originalPrice}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
          <input
            name="discount"
            type="number"
            value={formData.discount}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            placeholder="Automatically calculated"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="gstInputType"
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
                name="gstInputType"
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
                    Number(formData.price),
                    Number(formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage)
                  )
                )
              : "₹0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Base Price: {formData.price ? formatPrice(Number(formData.price)) : "₹0.00"} + GST:{" "}
            {formData.price && (formData.gstPercentage || formData.customGstPercentage)
              ? formatPrice(
                  calculateGSTAmount(
                    Number(formData.price),
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
        <div className="flex items-center mt-2">
          <input
            name="inStock"
            type="checkbox"
            checked={formData.inStock}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">In Stock</label>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="button px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          {loading ? "Adding..." : "Add Variant"}
        </button>
      </div>
    </form>
  );
};

export default AddVariantForm;
