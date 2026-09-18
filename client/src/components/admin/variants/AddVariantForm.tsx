import React, { useState } from "react";
import type { Variant } from "../../../types/variant";
import variantApi from "../../../services/api/variantApi";
import { ExclamationTriangleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { GST_RATE_OPTIONS } from "../../../utils/gstCalculations";

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
    memberPrice: "",
    memberDiscount: "",
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
      const updatedData: Record<string, any> = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : ["price", "originalPrice", "discount", "memberPrice", "memberDiscount", "units_in_stock", "gstPercentage"].includes(name)
              ? value === ""
                ? ""
                : value
              : value,
      };

      if (name === "weightNumber" || name === "weightUnit") {
        const number = name === "weightNumber" ? value : prev.weightNumber;
        const unit = name === "weightUnit" ? value : prev.weightUnit;
        updatedData.weight = `${number || ""} ${unit || ""}`.trim();
      }

      // Dynamic Price & Discount Auto-Calculations
      if (["price", "originalPrice", "memberPrice", "memberDiscount"].includes(name)) {
        const origPrice = name === "originalPrice" ? Number(value) : Number(prev.originalPrice);
        const nonMemberPrice = name === "price" ? Number(value) : Number(prev.price);
        const memPrice = name === "memberPrice" ? Number(value) : Number(prev.memberPrice);
        const memDisc = name === "memberDiscount" ? Number(value) : Number(prev.memberDiscount);

        // 1. Calculate Non-Member Discount % off MRP
        if (origPrice > 0 && nonMemberPrice > 0) {
          const discountPercent = ((origPrice - nonMemberPrice) / origPrice) * 100;
          updatedData.discount = (Math.round(discountPercent * 100) / 100).toString();
        } else {
          updatedData.discount = "0";
        }

        // 2. Calculate KP Member Price & Discount %
        if (name === "memberDiscount" || (name === "originalPrice" && memDisc > 0)) {
          if (origPrice > 0 && memDisc >= 0) {
            const calculatedMemPrice = origPrice - (origPrice * memDisc) / 100;
            updatedData.memberPrice = (Math.round(calculatedMemPrice * 100) / 100).toString();
          }
        } else if (name === "memberPrice") {
          if (origPrice > 0 && memPrice > 0) {
            const calculatedMemDisc = ((origPrice - memPrice) / origPrice) * 100;
            updatedData.memberDiscount = (Math.round(calculatedMemDisc * 100) / 100).toString();
          }
        } else if (name === "originalPrice" && memPrice > 0 && !memDisc) {
          const calculatedMemDisc = ((origPrice - memPrice) / origPrice) * 100;
          updatedData.memberDiscount = (Math.round(calculatedMemDisc * 100) / 100).toString();
        }
      }

      return updatedData as typeof formData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const finalWeight = `${formData.weightNumber || ""} ${formData.weightUnit || ""}`.trim();

    if (isWeightDuplicate(finalWeight)) {
      const [number] = finalWeight.trim().split(/\s+/);
      setError(`A variant with ${number} already exists. Please choose a different quantity.`);
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
        memberPrice: Number(formData.memberPrice) || 0,
        memberDiscount: Number(formData.memberDiscount) || 0,
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
        memberPrice: "",
        memberDiscount: "",
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
    <form onSubmit={handleSubmit} className="mb-6 bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Variant</h3>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Weight, Stock, Non-Member & Member Pricing */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Variant Quantity & Pricing
          </h4>

          {/* Weight */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight / Quantity</label>
              <input
                type="number"
                name="weightNumber"
                value={formData.weightNumber}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="Enter weight"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formData.weightNumber &&
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
          {formData.weightNumber &&
            formData.weightUnit &&
            isWeightDuplicate(`${formData.weightNumber} ${formData.weightUnit}`.trim()) && (
              <div className="text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1 shrink-0" />
                A variant with {formData.weightNumber} already exists
              </div>
            )}

          {/* Original MRP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Price / MRP (₹)
            </label>
            <input
              name="originalPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 100"
              value={formData.originalPrice}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Non-Member Price & Discount */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Non-Member Price (₹)
              </label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 96"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Non-Member Discount (%)
              </label>
              <input
                name="discount"
                type="number"
                value={formData.discount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 text-sm font-medium"
                placeholder="4%"
              />
            </div>
          </div>

          {/* KP Member Price & Discount */}
          <div className="grid grid-cols-2 gap-3 bg-green-50/70 p-3 rounded-lg border border-green-200">
            <div className="col-span-2 flex items-center text-xs font-bold text-green-800">
              <UserGroupIcon className="w-4 h-4 mr-1 text-green-600" />
              Kishan Parivar (KP) Member Pricing
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                KP Member Discount (%)
              </label>
              <input
                name="memberDiscount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 10 or 20"
                value={formData.memberDiscount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                KP Member Price (₹)
              </label>
              <input
                name="memberPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 90 or 80"
                value={formData.memberPrice}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm bg-white font-semibold text-green-900"
              />
            </div>
          </div>
        </div>

        {/* Right Column: GST & Inventory Stock */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            GST & Inventory Stock
          </h4>

          {/* GST Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate</label>
            <div className="space-y-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="addGstStandard"
                  name="gstInputType"
                  checked={!formData.useCustomGst}
                  onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: false }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="addGstStandard" className="text-sm text-gray-700 cursor-pointer font-medium">
                  Select standard rate
                </label>
              </div>
              <select
                name="gstPercentage"
                value={formData.gstPercentage}
                onChange={handleInputChange}
                disabled={formData.useCustomGst}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${formData.useCustomGst ? "bg-gray-100 text-gray-400" : "bg-white"
                  }`}
                required={!formData.useCustomGst}
              >
                {GST_RATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="radio"
                  id="addGstCustom"
                  name="gstInputType"
                  checked={formData.useCustomGst}
                  onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: true }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="addGstCustom" className="text-sm text-gray-700 cursor-pointer font-medium">
                  Enter custom GST %
                </label>
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
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${!formData.useCustomGst ? "bg-gray-100 text-gray-400" : "bg-white"
                  }`}
                required={formData.useCustomGst}
              />
            </div>
          </div>


          {/* Units in stock */}
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

          <div className="flex items-center pt-1">
            <input
              name="inStock"
              id="inStockAdd"
              type="checkbox"
              checked={formData.inStock}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="inStockAdd" className="ml-2 block text-sm text-gray-700 cursor-pointer font-medium">
              In Stock
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="button px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium cursor-pointer shadow-sm"
        >
          {loading ? "Adding..." : "Add Variant"}
        </button>
      </div>
    </form>
  );
};

export default AddVariantForm;

