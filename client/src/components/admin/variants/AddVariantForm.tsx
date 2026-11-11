import React, { useState } from "react";
import type { Variant } from "../../../types/variant";
import variantApi from "../../../services/api/variantApi";
import { ExclamationTriangleIcon, UserGroupIcon, ReceiptPercentIcon } from "@heroicons/react/24/outline";
import { GST_RATE_OPTIONS, extractGSTFromInclusivePrice, formatPrice } from "../../../utils/gstCalculations";

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
        gstPercentage: Number(formData.gstPercentage) ?? 0,
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
        inStock: true,
        units_in_stock: "",
      });
    } catch (err) {
      setError("Failed to add variant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Live GST & Taxable Calculations
  const gstRate = Number(formData.gstPercentage) || 0;
  const nonMemberPrice = Number(formData.price) || 0;
  const memberPrice = Number(formData.memberPrice) || 0;
  const mrp = Number(formData.originalPrice) || 0;

  const nonMemberTax = extractGSTFromInclusivePrice(nonMemberPrice, gstRate);
  const memberTax = extractGSTFromInclusivePrice(memberPrice, gstRate);
  const mrpTax = extractGSTFromInclusivePrice(mrp, gstRate);

  const standardRates = [0, 5, 12, 18, 28];
  const selectOptions = standardRates.includes(gstRate)
    ? GST_RATE_OPTIONS
    : [...GST_RATE_OPTIONS, { value: gstRate, label: `${gstRate}%` }].sort((a, b) => a.value - b.value);

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
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
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

          {/* KP Member Price & Discount (First Price, then Discount like Non-Member) */}
          <div className="grid grid-cols-2 gap-3 bg-green-50/70 p-3 rounded-lg border border-green-200">
            <div className="col-span-2 flex items-center text-xs font-bold text-green-800">
              <UserGroupIcon className="w-4 h-4 mr-1 text-green-600" />
              Kishan Parivar (KP) Member Pricing
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
          </div>

          {/* Units in Stock & Stock Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units in Stock</label>
              <input
                type="number"
                name="units_in_stock"
                value={formData.units_in_stock}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
            <div className="flex items-center pt-6">
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

        {/* Right Column: GST Selection & Live Tax Breakdown */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            GST & Tax Breakdown
          </h4>

          {/* GST Rate Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Rate
            </label>
            <select
              name="gstPercentage"
              value={formData.gstPercentage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              required
            >
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tax & Price Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ReceiptPercentIcon className="w-4 h-4 text-blue-600" />
                Tax & Price Breakdown
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {gstRate}% GST (Inclusive)
              </span>
            </div>

            {/* Non-Member Breakdown */}
            <div className="bg-white rounded-md p-2.5 border border-gray-200 shadow-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-800">Non-Member Selling Price</span>
                <span className="text-sm font-bold text-gray-900">{formatPrice(nonMemberPrice)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-dashed border-gray-200">
                <div>
                  <span className="text-gray-500">Taxable Price:</span>{" "}
                  <span className="font-semibold text-gray-800">{formatPrice(nonMemberTax.taxableValue)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">GST Amount:</span>{" "}
                  <span className="font-semibold text-blue-700">{formatPrice(nonMemberTax.gstAmount)}</span>
                </div>
              </div>
            </div>

            {/* KP Member Breakdown */}
            <div className="bg-emerald-50/50 rounded-md p-2.5 border border-emerald-200 shadow-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1">
                  <UserGroupIcon className="w-3.5 h-3.5 text-emerald-600" />
                  KP Member Price
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  {memberPrice > 0 ? formatPrice(memberPrice) : "—"}
                </span>
              </div>
              {memberPrice > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800 pt-1 border-t border-dashed border-emerald-200">
                  <div>
                    <span className="text-emerald-700">Taxable Price:</span>{" "}
                    <span className="font-semibold text-emerald-950">{formatPrice(memberTax.taxableValue)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700">GST Amount:</span>{" "}
                    <span className="font-semibold text-emerald-800">{formatPrice(memberTax.gstAmount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">No KP member price set</p>
              )}
            </div>

            {/* MRP Reference if MRP > 0 */}
            {mrp > 0 && (
              <div className="text-[11px] text-gray-500 flex justify-between px-1 pt-0.5 border-t border-slate-200">
                <span>MRP ({formatPrice(mrp)}) Taxable: {formatPrice(mrpTax.taxableValue)}</span>
                <span>GST ({gstRate}%): {formatPrice(mrpTax.gstAmount)}</span>
              </div>
            )}
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
