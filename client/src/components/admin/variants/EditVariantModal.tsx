import React, { useState, useEffect } from "react";
import type { Variant } from "../../../types/variant";
import variantApi from "../../../services/api/variantApi";
import { ExclamationTriangleIcon, XMarkIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { GST_RATE_OPTIONS } from "../../../utils/gstCalculations";

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
    memberPrice: 0,
    memberDiscount: 0,
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
      memberPrice: variant.memberPrice || 0,
      memberDiscount: variant.memberDiscount || 0,
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
              : ["price", "originalPrice", "discount", "memberPrice", "memberDiscount", "units_in_stock"].includes(name)
                ? value === ""
                  ? 0
                  : Number(value)
                : value,
        };

        if (["price", "originalPrice", "memberPrice", "memberDiscount"].includes(name)) {
          const origPrice = name === "originalPrice" ? Number(value) : prev.originalPrice;
          const nonMemberPrice = name === "price" ? Number(value) : prev.price;
          const memPrice = name === "memberPrice" ? Number(value) : prev.memberPrice;
          const memDisc = name === "memberDiscount" ? Number(value) : prev.memberDiscount;

          // 1. Calculate Non-Member Discount % off MRP
          if (origPrice > 0 && nonMemberPrice > 0) {
            const discountPercent = ((origPrice - nonMemberPrice) / origPrice) * 100;
            updatedData.discount = Math.round(discountPercent * 100) / 100;
          } else {
            updatedData.discount = 0;
          }

          // 2. Calculate KP Member Price & Discount %
          if (name === "memberDiscount" || (name === "originalPrice" && memDisc > 0)) {
            if (origPrice > 0 && memDisc >= 0) {
              const calculatedMemPrice = origPrice - (origPrice * memDisc) / 100;
              updatedData.memberPrice = Math.round(calculatedMemPrice * 100) / 100;
            }
          } else if (name === "memberPrice") {
            if (origPrice > 0 && memPrice > 0) {
              const calculatedMemDisc = ((origPrice - memPrice) / origPrice) * 100;
              updatedData.memberDiscount = Math.round(calculatedMemDisc * 100) / 100;
            }
          } else if (name === "originalPrice" && memPrice > 0 && !memDisc) {
            const calculatedMemDisc = ((origPrice - memPrice) / origPrice) * 100;
            updatedData.memberDiscount = Math.round(calculatedMemDisc * 100) / 100;
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
        memberPrice: Number(formData.memberPrice) || 0,
        memberDiscount: Number(formData.memberDiscount) || 0,
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Edit Variant</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Weight & Pricing */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Variant & Pricing
              </h3>

              {/* Weight */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight / Quantity</label>
                  <input
                    type="number"
                    name="weightNumber"
                    value={formData.weightNumber || ""}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formData.weight && isWeightDuplicate(formData.weight, variant.id)
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
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1 shrink-0" />
                  A variant with {formData.weightNumber} already exists (regardless of unit)
                </div>
              )}

              {/* Original MRP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Price / MRP (₹)
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  placeholder="e.g. 100"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
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
                    type="number"
                    name="price"
                    placeholder="e.g. 96"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Non-Member Discount (%)
                  </label>
                  <input
                    type="number"
                    name="discount"
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
                    type="number"
                    name="memberDiscount"
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
                    type="number"
                    name="memberPrice"
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

            {/* Right Column: Tax / GST Calculation & Stock */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                GST & Inventory Stock
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate</label>
                <div className="space-y-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="editGstStandard"
                      name="editGstInputType"
                      checked={!formData.useCustomGst}
                      onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: false }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="editGstStandard" className="text-sm text-gray-700 cursor-pointer font-medium">
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
                      id="editGstCustom"
                      name="editGstInputType"
                      checked={formData.useCustomGst}
                      onChange={() => setFormData((prev) => ({ ...prev, useCustomGst: true }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="editGstCustom" className="text-sm text-gray-700 cursor-pointer font-medium">
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
                  type="checkbox"
                  name="inStock"
                  id="inStockEdit"
                  checked={formData.inStock}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="inStockEdit" className="ml-2 block text-sm text-gray-700 cursor-pointer font-medium">
                  In Stock
                </label>
              </div>
            </div>
          </div>

          {/* Footer inside form */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVariantModal;


