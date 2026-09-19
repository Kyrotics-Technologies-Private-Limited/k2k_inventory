import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  DocumentTextIcon,
  BanknotesIcon,
  RectangleGroupIcon,
  PhotoIcon,
  TagIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ComboDocument, ComboItemInput, ProductSnapshot } from "../../../services/adminComboService";
import type { Category } from "../../../services/api/categoryApi";
import { productApi } from "../../../services/api/productApi";

export interface ComboFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  selectedCombo: ComboDocument | null;
  productsList: ProductSnapshot[];
  categories: Category[];
  onSubmit: (formData: Omit<ComboDocument, "id">) => Promise<void>;
  formLoading: boolean;
}

type ComboFormTab = "basics" | "pricing" | "items" | "media" | "badges";

const TABS: { id: ComboFormTab; label: string; icon: React.ElementType }[] = [
  { id: "basics", label: "Basics", icon: DocumentTextIcon },
  { id: "pricing", label: "Pricing & Stock", icon: BanknotesIcon },
  { id: "items", label: "Included Items", icon: RectangleGroupIcon },
  { id: "media", label: "Media & Banners", icon: PhotoIcon },
  { id: "badges", label: "Badges & Benefits", icon: TagIcon },
];

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-xs font-semibold text-gray-700 mb-1";
const uploadBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium cursor-pointer transition-colors";

export const ComboFormModal: React.FC<ComboFormModalProps> = ({
  isOpen,
  onClose,
  editMode,
  selectedCombo,
  productsList,
  categories,
  onSubmit,
  formLoading,
}) => {
  const [activeTab, setActiveTab] = useState<ComboFormTab>("basics");

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [sku, setSku] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [rank, setRank] = useState<number | "">("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "draft" | "hidden">("active");
  const [isBestseller, setIsBestseller] = useState(false);
  const [isSample, setIsSample] = useState(false);

  // Pricing & Stock
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [kpMemberPrice, setKpMemberPrice] = useState<number | "">("");
  const [originalTotalPrice, setOriginalTotalPrice] = useState<number>(0);
  const [gstPercentage, setGstPercentage] = useState<number>(5);
  const [unitsInStock, setUnitsInStock] = useState<number>(10);

  // Constituent Items
  const [items, setItems] = useState<ComboItemInput[]>([]);

  // Media
  const [heroImage, setHeroImage] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Badges & Health Badges
  const [badges, setBadges] = useState<{ image: string; text: string }[]>([]);
  const [healthBadges, setHealthBadges] = useState<
    { image: string; title: string; description: string }[]
  >([]);

  // Upload States & Refs
  const [mainUploading, setMainUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [badgeUploading, setBadgeUploading] = useState(false);
  const [healthBadgeUploading, setHealthBadgeUploading] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const badgeInputRef = useRef<HTMLInputElement>(null);
  const healthBadgeInputRef = useRef<HTMLInputElement>(null);

  const createEmptyRow = (): ComboItemInput => ({
    productId: "",
    variantId: "",
    productName: "",
    variantName: "",
    quantity: 1,
    unitPriceSnapshot: 0,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (selectedCombo) {
      setName(selectedCombo.name || "");
      setSlug(selectedCombo.slug || "");
      setDescription(selectedCombo.description || "");
      setShortDescription(selectedCombo.shortDescription || "");
      setOrigin((selectedCombo as any).origin || "");
      setSku((selectedCombo as any).sku || "");
      setWarehouseName((selectedCombo as any).warehouseName || "");
      setRank((selectedCombo as any).rank ?? "");
      setCategoryIds(selectedCombo.categoryIds || ["combo-packs"]);
      setStatus(selectedCombo.status || "active");
      setIsBestseller(Boolean(selectedCombo.isBestseller));
      setIsSample(Boolean(selectedCombo.isSample));

      setComboPrice(selectedCombo.pricing?.comboPrice ?? 0);
      setKpMemberPrice(selectedCombo.pricing?.kpMemberPrice ?? "");
      setOriginalTotalPrice(selectedCombo.pricing?.originalTotalPrice ?? 0);
      setGstPercentage(selectedCombo.pricing?.gstPercentage ?? 5);
      setUnitsInStock(selectedCombo.units_in_stock ?? 0);

      setItems(
        selectedCombo.items && selectedCombo.items.length > 0
          ? selectedCombo.items
          : [createEmptyRow()]
      );

      setHeroImage(selectedCombo.images?.main || "");
      setBannerImage((selectedCombo.images as any)?.banner || "");
      setGalleryImages(selectedCombo.images?.gallery || []);

      setBadges((selectedCombo as any).badges || []);
      setHealthBadges((selectedCombo as any).healthBadges || []);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setShortDescription("");
      setOrigin("");
      setSku("");
      setWarehouseName("");
      setRank("");
      setCategoryIds(["combo-packs"]);
      setStatus("active");
      setIsBestseller(false);
      setIsSample(false);

      setComboPrice(0);
      setKpMemberPrice("");
      setOriginalTotalPrice(0);
      setGstPercentage(5);
      setUnitsInStock(10);

      setItems([createEmptyRow()]);

      setHeroImage("");
      setBannerImage("");
      setGalleryImages([]);
      setBadges([]);
      setHealthBadges([]);
    }
    setActiveTab("basics");
  }, [isOpen, selectedCombo]);

  // Derived Pricing Calculations
  const discountPercent =
    originalTotalPrice > 0 && comboPrice > 0
      ? Math.round(((originalTotalPrice - comboPrice) / originalTotalPrice) * 100)
      : 0;

  const basePriceForMember = originalTotalPrice > 0 ? originalTotalPrice : comboPrice;
  const kpDiscountPercent =
    basePriceForMember > 0 && typeof kpMemberPrice === "number" && kpMemberPrice > 0
      ? Math.round(((basePriceForMember - kpMemberPrice) / basePriceForMember) * 100)
      : 0;

  const calculateAutoMRP = (itemList: ComboItemInput[]) => {
    const totalMRP = itemList.reduce(
      (sum, item) => sum + (item.unitPriceSnapshot || 0) * (item.quantity || 1),
      0
    );
    setOriginalTotalPrice(totalMRP);
  };

  // Category Toggle
  const handleCategoryToggle = (catId: string) => {
    if (categoryIds.includes(catId)) {
      setCategoryIds(categoryIds.filter((id) => id !== catId));
    } else {
      setCategoryIds([...categoryIds, catId]);
    }
  };

  // Constituent Items Row Handlers
  const handleAddProductRow = () => {
    setItems([...items, createEmptyRow()]);
  };

  const handleRowProductChange = (index: number, productId: string) => {
    const prod = productsList.find((p) => p.id === productId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId,
      productName: prod ? prod.name : "",
      variantId: "",
      variantName: "",
      unitPriceSnapshot: 0,
    };
    setItems(updated);
    calculateAutoMRP(updated);
  };

  const handleRowVariantChange = (index: number, variantId: string) => {
    const currentItem = items[index];
    const prod = productsList.find((p) => p.id === currentItem.productId);
    const varItem = prod?.variants?.find((v: { id: string; weight: string; price: number }) => v.id === variantId);

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      variantId,
      variantName: varItem ? varItem.weight : "Standard",
      unitPriceSnapshot: varItem ? varItem.price : 0,
    };
    setItems(updated);
    calculateAutoMRP(updated);
  };

  const handleRowQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
    setItems(updated);
    calculateAutoMRP(updated);
  };

  const handleRowPriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unitPriceSnapshot: Math.max(0, price) };
    setItems(updated);
    calculateAutoMRP(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    const finalItems = updated.length === 0 ? [createEmptyRow()] : updated;
    setItems(finalItems);
    calculateAutoMRP(finalItems);
  };

  // Image Upload Handlers
  const handleMainImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setMainUploading(true);
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setHeroImage(url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload main image.");
    } finally {
      setMainUploading(false);
      if (mainInputRef.current) mainInputRef.current.value = "";
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBannerUploading(true);
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setBannerImage(url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload banner image.");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setGalleryUploading(true);
    try {
      const urls = await productApi.uploadGalleryImages(e.target.files);
      setGalleryImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      alert("Failed to upload gallery images.");
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleBadgeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBadgeUploading(true);
    try {
      const urls = await productApi.uploadMultipleBadgeImages(e.target.files);
      setBadges((prev) => [...prev, ...urls.map((url: string) => ({ image: url, text: "" }))]);
    } catch (err) {
      console.error(err);
      alert("Failed to upload badge images.");
    } finally {
      setBadgeUploading(false);
      if (badgeInputRef.current) badgeInputRef.current.value = "";
    }
  };

  const handleHealthBadgeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setHealthBadgeUploading(true);
    try {
      const urls = await productApi.uploadMultipleHealthBadgeImages(e.target.files);
      setHealthBadges((prev) => [
        ...prev,
        ...urls.map((url: string) => ({ image: url, title: "", description: "" })),
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to upload health badge images.");
    } finally {
      setHealthBadgeUploading(false);
      if (healthBadgeInputRef.current) healthBadgeInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((it) => it.productId);
    const finalName = name.trim() || "Untitled Combo";

    const payload: Omit<ComboDocument, "id"> = {
      name: finalName,
      slug: slug || `${finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`,
      description,
      shortDescription,
      images: {
        main: heroImage,
        gallery: galleryImages,
        ...(bannerImage ? { banner: bannerImage } : {}),
      } as any,
      pricing: {
        comboPrice: Number(comboPrice) || 0,
        kpMemberPrice: kpMemberPrice === "" ? null : Number(kpMemberPrice),
        originalTotalPrice: Number(originalTotalPrice) || 0,
        savingsAmount: Math.max((Number(originalTotalPrice) || 0) - (Number(comboPrice) || 0), 0),
        gstPercentage: Number(gstPercentage) || 5,
      },
      units_in_stock: Number(unitsInStock) || 0,
      inStock: (Number(unitsInStock) || 0) > 0,
      items: validItems,
      status,
      categoryIds,
      isBestseller,
      isSample,
      ...(origin ? { origin } : {}),
      ...(sku ? { sku } : {}),
      ...(warehouseName ? { warehouseName } : {}),
      ...(rank !== "" ? { rank: Number(rank) } : {}),
      ...(badges.length > 0 ? { badges } : {}),
      ...(healthBadges.length > 0 ? { healthBadges } : {}),
    } as any;

    await onSubmit(payload);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-800/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-3xl flex flex-col h-[min(90vh,820px)]">
                <form onSubmit={handleFormSubmit} className="flex flex-col h-full min-h-0">
                  {/* Modal Header */}
                  <div className="shrink-0 border-b border-gray-200 bg-white px-5 pt-4 pb-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <Dialog.Title className="text-lg font-bold text-gray-900">
                          {editMode ? "Edit Combo Bundle" : "Add New Combo Bundle"}
                        </Dialog.Title>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Configure bundle offerings, constituent items, pricing & media
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Tab Bar */}
                    <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Form tabs">
                      {TABS.map(({ id, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                              active
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {label}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-gray-50/50 space-y-4">
                    {/* TAB 1: BASICS */}
                    {activeTab === "basics" && (
                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Categories</label>
                          <div className="min-h-[42px] p-2 border border-gray-300 rounded-md bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500">
                            {categoryIds.map((catId) => {
                              const cat = categories.find((c) => c.id === catId);
                              return (
                                <span
                                  key={catId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                                >
                                  {cat ? cat.name : catId}
                                  <button
                                    type="button"
                                    onClick={() => handleCategoryToggle(catId)}
                                    className="text-blue-400 hover:text-blue-600"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              );
                            })}
                            <select
                              className="flex-grow border-none focus:ring-0 text-xs py-1 bg-transparent cursor-pointer min-w-[140px]"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleCategoryToggle(e.target.value);
                              }}
                            >
                              <option value="" disabled>
                                Select category...
                              </option>
                              {categories
                                .filter((cat) => !categoryIds.includes(cat.id))
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={labelClass}>Catalog Status</label>
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as any)}
                              className={inputClass}
                            >
                              <option value="active">Active</option>
                              <option value="hidden">Hidden</option>
                              <option value="draft">Draft</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Display Rank</label>
                            <input
                              type="number"
                              value={rank}
                              onChange={(e) =>
                                setRank(e.target.value !== "" ? Number(e.target.value) : "")
                              }
                              placeholder="e.g. 1"
                              className={inputClass}
                            />
                          </div>
                          <div className="flex items-end pb-0.5">
                            <button
                              type="button"
                              onClick={() => setIsBestseller(!isBestseller)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                                isBestseller
                                  ? "bg-amber-50 border-amber-300 text-amber-800"
                                  : "bg-white border-gray-300 text-gray-700"
                              }`}
                            >
                              <span>Bestseller</span>
                              <span
                                className={`relative inline-flex h-4 w-8 items-center rounded-full ${
                                  isBestseller ? "bg-amber-500" : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                                    isBestseller ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Try Our Sample Toggle */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setIsSample(!isSample)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                              isSample
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-white border-gray-300 text-gray-700"
                            }`}
                          >
                            <span>🎯 Show in Try Our Sample</span>
                            <span
                              className={`relative inline-flex h-4 w-8 items-center rounded-full ${
                                isSample ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                                  isSample ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Combo Title</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Enter combo name"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Slug</label>
                            <input
                              type="text"
                              value={slug}
                              onChange={(e) => setSlug(e.target.value)}
                              placeholder="auto-generated"
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Origin</label>
                            <input
                              value={origin}
                              onChange={(e) => setOrigin(e.target.value)}
                              placeholder="Product origin"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Short Description</label>
                            <input
                              value={shortDescription}
                              onChange={(e) => setShortDescription(e.target.value)}
                              placeholder="Short summary"
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Full Description</label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detailed description of combo"
                            rows={3}
                            className={inputClass}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>SKU</label>
                            <input
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                              placeholder="Combo SKU"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Warehouse</label>
                            <input
                              value={warehouseName}
                              onChange={(e) => setWarehouseName(e.target.value)}
                              placeholder="Warehouse location"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: PRICING & STOCK */}
                    {activeTab === "pricing" && (
                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Pricing Engine & Member Offers
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className={labelClass}>Original Total MRP (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={originalTotalPrice}
                                onChange={(e) => setOriginalTotalPrice(Number(e.target.value))}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Combo Selling Price (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={comboPrice}
                                onChange={(e) => setComboPrice(Number(e.target.value))}
                                className={`${inputClass} font-semibold text-blue-900`}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Customer Savings (%)</label>
                              <div className="h-[38px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold text-emerald-700 flex items-center">
                                {discountPercent > 0 ? `${discountPercent}% OFF` : "0% OFF"}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                            <div>
                              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                                K2K Membership Special Price (₹)
                              </label>
                              <input
                                type="number"
                                value={kpMemberPrice}
                                onChange={(e) =>
                                  setKpMemberPrice(
                                    e.target.value === "" ? "" : Number(e.target.value)
                                  )
                                }
                                placeholder="Optional K2K Member price"
                                className="w-full px-3 py-2 border border-emerald-300 rounded-md text-sm font-bold text-emerald-800 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                                K2K Membership Savings (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={kpDiscountPercent > 0 ? kpDiscountPercent : ""}
                                onChange={(e) => {
                                  const pctStr = e.target.value;
                                  if (pctStr === "") {
                                    setKpMemberPrice("");
                                  } else {
                                    const pct = Number(pctStr);
                                    const base = originalTotalPrice > 0 ? originalTotalPrice : comboPrice;
                                    if (base > 0) {
                                      const calcPrice = Math.round(base * (1 - pct / 100));
                                      setKpMemberPrice(calcPrice);
                                    }
                                  }
                                }}
                                placeholder="Enter member savings (%)"
                                className="w-full px-3 py-2 border border-emerald-300 rounded-md text-sm font-bold text-emerald-800 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Physical Inventory & Tax
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-800 mb-1">
                                Dedicated Stock Units (`units_in_stock`)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={unitsInStock}
                                onChange={(e) => setUnitsInStock(Number(e.target.value))}
                                className="w-full px-3 py-2 border-2 border-blue-500 rounded-md text-sm font-bold text-gray-900 bg-blue-50/20"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>GST Percentage (%)</label>
                              <select
                                value={gstPercentage}
                                onChange={(e) => setGstPercentage(Number(e.target.value))}
                                className={inputClass}
                              >
                                <option value={0}>0% (Tax Exempt)</option>
                                <option value={5}>5% GST</option>
                                <option value={12}>12% GST</option>
                                <option value={18}>18% GST</option>
                                <option value={28}>28% GST</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: CONSTITUENT ITEMS */}
                    {activeTab === "items" && (
                      <div className="border border-gray-200 p-4 rounded-lg bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800 text-xs uppercase tracking-wider">
                              Included Products & Variants ({items.length})
                            </h3>
                            <p className="text-xs text-gray-500">
                              Pick active products and variants to compose this combo
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddProductRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium cursor-pointer transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" /> Add Product Row
                          </button>
                        </div>

                        <div className="space-y-2.5 pt-2">
                          {items.map((row, idx) => {
                            const selectedProd = productsList.find((p) => p.id === row.productId);
                            const availableVariants = selectedProd?.variants || [];

                            return (
                              <div
                                key={idx}
                                className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                  {/* Product Select */}
                                  <div className="sm:col-span-4">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                                      Product #{idx + 1}
                                    </label>
                                    <select
                                      value={row.productId}
                                      onChange={(e) => handleRowProductChange(idx, e.target.value)}
                                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-900"
                                    >
                                      <option value="">Select Available Product...</option>
                                      <optgroup label="Standard Products">
                                        {productsList
                                          .filter((p) => !p.isSample)
                                          .map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                      </optgroup>
                                      <optgroup label="🎁 Sample Products">
                                        {productsList
                                          .filter((p) => Boolean(p.isSample))
                                          .map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name} (Sample)
                                            </option>
                                          ))}
                                      </optgroup>
                                    </select>
                                  </div>

                                  {/* Variant Select */}
                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                                      Variant
                                    </label>
                                    <select
                                      value={row.variantId}
                                      disabled={!row.productId}
                                      onChange={(e) => handleRowVariantChange(idx, e.target.value)}
                                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                      <option value="">
                                        {row.productId ? "Select Variant..." : "Select Product First"}
                                      </option>
                                       {availableVariants.map((v: { id: string; weight: string; price: number }) => (
                                        <option key={v.id} value={v.id}>
                                          {v.weight} (₹{v.price})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Quantity */}
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                                      Quantity
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={row.quantity}
                                      onChange={(e) =>
                                        handleRowQuantityChange(idx, Number(e.target.value))
                                      }
                                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-900"
                                    />
                                  </div>

                                  {/* Unit Price */}
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                                      Price (₹)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.unitPriceSnapshot}
                                      onChange={(e) =>
                                        handleRowPriceChange(idx, Number(e.target.value))
                                      }
                                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-900 font-semibold"
                                    />
                                  </div>

                                  {/* Remove Button */}
                                  <div className="sm:col-span-1 flex items-end justify-end pt-3 sm:pt-0">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRow(idx)}
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      title="Remove item"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {row.productName && row.variantName && (
                                  <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-200/60 pt-1.5 px-0.5">
                                    <span>
                                      Selected: <strong className="text-gray-800">{row.productName}</strong> ({row.variantName})
                                    </span>
                                    <span className="font-semibold text-gray-700">
                                      Subtotal: ₹{(row.quantity * row.unitPriceSnapshot).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2 flex justify-between items-center text-xs border-t border-gray-200">
                          <span className="text-gray-500">
                            Auto-calculated total MRP from items:
                          </span>
                          <strong className="text-gray-900 text-sm">
                            ₹{originalTotalPrice.toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: MEDIA & BANNERS */}
                    {activeTab === "media" && (
                      <div className="space-y-4">
                        {/* Main Image */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Main Feature Image
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                ref={mainInputRef}
                                 onChange={handleMainImageSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={mainUploading}
                                onClick={() => mainInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {mainUploading ? "Uploading..." : "Upload File"}
                              </button>
                            </div>
                          </div>
                          {heroImage ? (
                            <div className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                              <img src={heroImage} alt="Main" className="w-full h-36 object-contain" />
                              <button
                                type="button"
                                onClick={() => setHeroImage("")}
                                className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-1 shadow-sm"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="h-28 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No main image uploaded
                            </div>
                          )}
                          <input
                            type="text"
                            value={heroImage}
                            onChange={(e) => setHeroImage(e.target.value)}
                            placeholder="Or paste main image URL directly..."
                            className={inputClass}
                          />
                        </div>

                        {/* Banner Image */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Banner Image
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                ref={bannerInputRef}
                                onChange={handleBannerSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={bannerUploading}
                                onClick={() => bannerInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {bannerUploading ? "Uploading..." : "Upload Banner"}
                              </button>
                            </div>
                          </div>
                          {bannerImage ? (
                            <div className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                              <img src={bannerImage} alt="Banner" className="w-full h-36 object-contain" />
                              <button
                                type="button"
                                onClick={() => setBannerImage("")}
                                className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-1 shadow-sm"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="h-28 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No banner image uploaded
                            </div>
                          )}
                          <input
                            type="text"
                            value={bannerImage}
                            onChange={(e) => setBannerImage(e.target.value)}
                            placeholder="Or paste banner image URL directly..."
                            className={inputClass}
                          />
                        </div>

                        {/* Gallery Images */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Gallery Images
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={galleryInputRef}
                                onChange={handleGallerySelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={galleryUploading}
                                onClick={() => galleryInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {galleryUploading ? "Uploading..." : "Upload Gallery"}
                              </button>
                            </div>
                          </div>
                          {galleryImages.length === 0 ? (
                            <div className="h-20 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No gallery images added
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {galleryImages.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative group border border-gray-200 rounded-md overflow-hidden bg-gray-50 p-1"
                                >
                                  <img
                                    src={url}
                                    alt={`Gallery ${idx + 1}`}
                                    className="w-full h-16 object-contain rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-0.5 shadow-sm"
                                  >
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 5: BADGES & BENEFITS */}
                    {activeTab === "badges" && (
                      <div className="space-y-4">
                        {/* Standard Badges */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Badges
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={badgeInputRef}
                                onChange={handleBadgeSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={badgeUploading}
                                onClick={() => badgeInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {badgeUploading ? "Uploading..." : "Upload Badge Images"}
                              </button>
                            </div>
                          </div>
                          {badges.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                              <img src={b.image} alt="" className="w-8 h-8 object-contain bg-white rounded border" />
                              <input
                                type="text"
                                value={b.text}
                                onChange={(e) => {
                                  const updated = [...badges];
                                  updated[idx].text = e.target.value;
                                  setBadges(updated);
                                }}
                                placeholder="Badge title text"
                                className={inputClass}
                              />
                              <button
                                type="button"
                                onClick={() => setBadges(badges.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Health Badges */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Health & Quality Badges
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={healthBadgeInputRef}
                                onChange={handleHealthBadgeSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={healthBadgeUploading}
                                onClick={() => healthBadgeInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {healthBadgeUploading ? "Uploading..." : "Upload Health Badges"}
                              </button>
                            </div>
                          </div>
                          {healthBadges.map((hb, idx) => (
                            <div key={idx} className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                              <div className="flex items-center gap-3">
                                <img src={hb.image} alt="" className="w-8 h-8 object-contain bg-white rounded border shrink-0" />
                                <input
                                  type="text"
                                  value={hb.title}
                                  onChange={(e) => {
                                    const updated = [...healthBadges];
                                    updated[idx].title = e.target.value;
                                    setHealthBadges(updated);
                                  }}
                                  placeholder="Health badge title"
                                  className={inputClass}
                                />
                                <button
                                  type="button"
                                  onClick={() => setHealthBadges(healthBadges.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={hb.description}
                                onChange={(e) => {
                                  const updated = [...healthBadges];
                                  updated[idx].description = e.target.value;
                                  setHealthBadges(updated);
                                }}
                                placeholder="Health badge description"
                                className={inputClass}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between gap-3">
                    <p className="hidden sm:block text-xs text-gray-500">
                      {activeTab === "basics" && "Combo basics, ranking & categorization"}
                      {activeTab === "pricing" && "Combo MRP, K2K membership discounts & stock"}
                      {activeTab === "items" && "Select constituent product variants"}
                      {activeTab === "media" && "Feature images & gallery banners"}
                      {activeTab === "badges" && "Product badges & health certifications"}
                    </p>
                    <div className="flex justify-end gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className={`px-4 py-2 rounded-md text-white flex items-center text-xs font-medium transition-colors ${
                          formLoading
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {formLoading ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 mr-1.5 animate-spin" />
                            Processing...
                          </>
                        ) : editMode ? (
                          <>
                            <PencilIcon className="w-4 h-4 mr-1.5" />
                            Update Combo
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Create Combo
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ComboFormModal;
