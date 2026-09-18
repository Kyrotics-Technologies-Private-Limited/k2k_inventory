import React, { Fragment, useEffect, useState, useRef } from "react";
import type { Product } from "../../../types";
import type { Category } from "../../../services/api/categoryApi";
import { productApi } from "../../../services/api/productApi";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  PencilIcon,
  PlusIcon,
  DocumentTextIcon,
  PhotoIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  editId: string | null;
  categories: Category[];
  initialData: Product | Omit<Product, "id">;
  onSubmit: (formData: Omit<Product, "id">) => Promise<void>;
  formLoading: boolean;
}

type ProductFormTab = "basics" | "media" | "badges";

const TABS: { id: ProductFormTab; label: string; icon: React.ElementType }[] = [
  { id: "basics", label: "Basics", icon: DocumentTextIcon },
  { id: "media", label: "Media & Banners", icon: PhotoIcon },
  { id: "badges", label: "Badges & Benefits", icon: TagIcon },
];

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
const labelClass = "block text-xs font-semibold text-gray-700 mb-1";
const uploadBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium cursor-pointer transition-colors";

const initialForm: Omit<Product, "id"> = {
  name: "",
  price: { amount: 0, currency: "INR" },
  description: "",
  shortDescription: "",
  origin: "",
  sku: "",
  warehouseName: "",
  rank: undefined,
  categoryIds: [],
  status: "active",
  images: { main: "", gallery: [], banner: "" },
  isBestseller: false,
  isSample: false,
  stockStatus: "in_stock",
  ratings: 0,
  reviews: 0,
  badges: [],
  healthBadges: [],
  benefits: [],
};

const categoryDefaults: Record<
  string,
  { banner: string; badges: { text: string; image?: string }[] }
> = {
  ghee: {
    banner:
      "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/product-main/1752089018798-1.png",
    badges: [
      {
        text: "Zero Adulteration",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752089074276-ZERO ADULTERATION.png",
      },
      {
        text: "Lab Tested",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752089074276-LAB TESTED.png",
      },
      {
        text: "Made at Home- Not in Factories",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752089074276-MADE AT HOME.png",
      },
      {
        text: "Zero Preservatives",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752089074276-ZERO PRESERVATIVES.png",
      },
      {
        text: "No Bad Cholesterol",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752089074276-NO BAD CHOLESTEROL.png",
      },
    ],
  },
  oils: {
    banner:
      "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/product-main/1752142641203-3.png",
    badges: [
      {
        text: "Cold Pressed",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752142641203-COLD PRESSED.png",
      },
      {
        text: "Zero Adulteration",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752142641203-ZERO ADULTERATION.png",
      },
      {
        text: "Zero Preservatives",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752142641203-ZERO PRESERVATIVES.png",
      },
      {
        text: "Non Refined",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752142641203-NON REFINED.png",
      },
      {
        text: "Sourced from Rural Farmers",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752142641203-SOURCED FROM RURAL FARMERS.png",
      },
    ],
  },
  honey: {
    banner:
      "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/product-main/1752143076344-2.png",
    badges: [
      {
        text: "Zero Adulteration",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752143076344-ZERO ADULTERATION.png",
      },
      {
        text: "No added sugar",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752143076344-NO ADDED SUGAR.png",
      },
      {
        text: "Unprocessed",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752143076344-UNPROCESSED.png",
      },
      {
        text: "Immunity Booster",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752143076344-IMMUNITY BOOSTER.png",
      },
      {
        text: "Sourced from Beekeepers",
        image:
          "https://storage.googleapis.com/testing-41ba7.firebasestorage.app/badge-images/1752143076344-SOURCED FROM BEEKEEPERS.png",
      },
    ],
  },
};

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  editMode,
  categories,
  initialData,
  onSubmit,
  formLoading,
}) => {
  const [activeTab, setActiveTab] = useState<ProductFormTab>("basics");
  const [formData, setFormData] = useState<Omit<Product, "id">>(initialForm);
  const [, setPriceInput] = useState("");

  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [mainImageUploadError, setMainImageUploadError] = useState("");
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryUploadError, setGalleryUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [badgeImageUploading, setBadgeImageUploading] = useState(false);
  const [badgeImageUploadError, setBadgeImageUploadError] = useState("");
  const badgeImageInputRef = useRef<HTMLInputElement>(null);

  const [healthBadgeUploading, setHealthBadgeUploading] = useState(false);
  const [healthBadgeUploadError, setHealthBadgeUploadError] = useState("");
  const healthBadgeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialForm,
        ...initialData,
        price: initialData.price ? { ...initialData.price } : { amount: 0, currency: "INR" },
        images: initialData.images ? { ...initialData.images } : { main: "", gallery: [], banner: "" },
        categoryIds: initialData.categoryIds ? [...initialData.categoryIds] : [],
        badges: initialData.badges ? [...initialData.badges] : [],
        healthBadges: initialData.healthBadges ? [...initialData.healthBadges] : [],
        benefits: initialData.benefits ? [...initialData.benefits] : [],
        isSample: Boolean(initialData.isSample),
      });
      setPriceInput(initialData.price?.amount ? String(initialData.price.amount) : "");
      setActiveTab("basics");
    }
  }, [isOpen, initialData]);

  // Handle Category defaults banner and badges auto-population
  useEffect(() => {
    if (!editMode && formData.categoryIds && formData.categoryIds.length > 0 && categories.length > 0) {
      const primaryCat = categories.find((c) => c.id === formData.categoryIds![0]);
      const key = primaryCat?.slug || primaryCat?.name?.toLowerCase();
      if (key && categoryDefaults[key]) {
        setFormData((prev) => ({
          ...prev,
          images: {
            ...prev.images,
            banner: categoryDefaults[key].banner,
          },
          badges: categoryDefaults[key].badges.map((b) => ({
            text: b.text,
            image: b.image || "",
          })),
        }));
      }
    }
  }, [formData.categoryIds, editMode, categories]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "amount") {
      if (/^\d*\.?\d*$/.test(value)) {
        setPriceInput(value);
        setFormData((prev) => ({
          ...prev,
          price: {
            ...prev.price,
            amount: value === "" ? 0 : parseFloat(value),
          },
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryToggle = (catId: string) => {
    setFormData((prev) => {
      const currentIds = prev.categoryIds || [];
      if (currentIds.includes(catId)) {
        return { ...prev, categoryIds: currentIds.filter((id) => id !== catId) };
      }
      return { ...prev, categoryIds: [...currentIds, catId] };
    });
  };

  const handleImageChange = (
    type: "main" | "gallery" | "banner",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [type]: type === "gallery" ? [...prev.images.gallery, value] : value,
      },
    }));
  };

  const removeGalleryImage = (idx: number) => {
    setFormData((prev) => {
      const newGallery = prev.images.gallery.filter((_, i) => i !== idx);
      return {
        ...prev,
        images: { ...prev.images, gallery: newGallery },
      };
    });
  };

  const handleRemoveBanner = () => {
    setFormData((prev) => ({
      ...prev,
      images: { ...prev.images, banner: "" },
    }));
  };

  // Upload Logic
  const handleMainImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setMainImageUploading(true);
    setMainImageUploadError("");
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setFormData((prev) => ({
        ...prev,
        images: { ...prev.images, main: url },
      }));
    } catch (err) {
      setMainImageUploadError("Failed to upload main image. Please try again.");
    } finally {
      setMainImageUploading(false);
      if (mainImageInputRef.current) mainImageInputRef.current.value = "";
    }
  };

  const handleBannerFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBannerUploading(true);
    setBannerUploadError("");
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setFormData((prev) => ({
        ...prev,
        images: { ...prev.images, banner: url },
      }));
    } catch (err) {
      setBannerUploadError("Failed to upload banner image. Please try again.");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleGalleryButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleGalleryFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setGalleryUploading(true);
    setGalleryUploadError("");
    try {
      const urls = await productApi.uploadGalleryImages(e.target.files);
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: [...prev.images.gallery, ...urls],
        },
      }));
    } catch (err) {
      setGalleryUploadError("Failed to upload gallery images. Please try again.");
    } finally {
      setGalleryUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMultipleBadgeFilesSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBadgeImageUploading(true);
    setBadgeImageUploadError("");
    try {
      const urls = await productApi.uploadMultipleBadgeImages(e.target.files);
      const newBadges = urls.map((url: string) => ({
        text: "",
        image: url,
      }));
      setFormData((prev) => ({
        ...prev,
        badges: [...(prev.badges || []), ...newBadges],
      }));
    } catch (err) {
      setBadgeImageUploadError("Failed to upload badge images. Please try again.");
    } finally {
      setBadgeImageUploading(false);
      if (badgeImageInputRef.current) badgeImageInputRef.current.value = "";
    }
  };

  const handleMultipleHealthBadgeFilesSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setHealthBadgeUploading(true);
    setHealthBadgeUploadError("");
    try {
      const urls = await productApi.uploadMultipleHealthBadgeImages(
        e.target.files
      );
      const newHealthBadges = urls.map((url: string) => ({
        title: "",
        description: "",
        image: url,
      }));
      setFormData((prev) => ({
        ...prev,
        healthBadges: [...(prev.healthBadges || []), ...newHealthBadges],
      }));
    } catch (err) {
      setHealthBadgeUploadError("Failed to upload health badge images. Please try again.");
    } finally {
      setHealthBadgeUploading(false);
      if (healthBadgeInputRef.current) healthBadgeInputRef.current.value = "";
    }
  };

  const handleBadgeNameChange = (idx: number, name: string) => {
    setFormData((prev) => {
      const newBadges = [...(prev.badges || [])];
      newBadges[idx] = { ...newBadges[idx], text: name };
      return { ...prev, badges: newBadges };
    });
  };

  const handleRemoveBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      badges: (prev.badges || []).filter((_, i) => i !== idx),
    }));
  };

  const handleHealthBadgeTitleChange = (idx: number, title: string) => {
    setFormData((prev) => {
      const newBadges = [...(prev.healthBadges || [])];
      newBadges[idx] = { ...newBadges[idx], title };
      return { ...prev, healthBadges: newBadges };
    });
  };

  const handleHealthBadgeDescriptionChange = (
    idx: number,
    description: string
  ) => {
    setFormData((prev) => {
      const newBadges = [...(prev.healthBadges || [])];
      newBadges[idx] = { ...newBadges[idx], description };
      return { ...prev, healthBadges: newBadges };
    });
  };

  const handleRemoveHealthBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      name: (formData.name || "").trim() || "Untitled Product",
    };
    onSubmit(finalData);
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
                <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                  {/* Modal Header */}
                  <div className="shrink-0 border-b border-gray-200 bg-white px-5 pt-4 pb-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <Dialog.Title className="text-lg font-bold text-gray-900">
                          {editMode ? "Edit Product" : "Create New Product"}
                        </Dialog.Title>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Configure product details, categories, media assets & badges
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

                    {/* Tab Navigation Bar */}
                    <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Form tabs">
                      {TABS.map(({ id, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${active
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
                        {/* Categories Selection */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                          <label className={labelClass}>Product Categories</label>
                          <div className="min-h-[42px] p-2 border border-gray-300 rounded-md bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500">
                            {(formData.categoryIds || []).map((catId) => {
                              const cat = categories.find((c) => c.id === catId);
                              if (!cat) return null;
                              return (
                                <span
                                  key={catId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                                >
                                  {cat.name}
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
                                const selectedId = e.target.value;
                                if (selectedId) handleCategoryToggle(selectedId);
                              }}
                            >
                              <option value="" disabled>Select category...</option>
                              {categories
                                .filter((cat) => !(formData.categoryIds || []).includes(cat.id))
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <CheckIcon className="w-3 h-3 text-emerald-500" />
                            Select one or multiple categories to associate this product.
                          </p>
                        </div>

                        {/* Status, Display Rank, Bestseller Toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={labelClass}>Catalog Status</label>
                            <select
                              name="status"
                              value={formData.status || "active"}
                              onChange={handleChange}
                              className={inputClass}
                            >
                              <option value="active">Active — Visible</option>
                              <option value="hidden">Hidden — Hidden</option>
                              <option value="draft">Draft — Work in Progress</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Display Rank</label>
                            <input
                              type="number"
                              name="rank"
                              value={formData.rank ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  rank: val !== "" ? Number(val) : undefined,
                                }));
                              }}
                              placeholder="e.g. 1 (Priority position)"
                              className={inputClass}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, isBestseller: !prev.isBestseller }))
                              }
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md border text-xs font-semibold transition cursor-pointer ${formData.isBestseller
                                  ? "bg-amber-50 border-amber-300 text-amber-800"
                                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              <span>🏆 Bestseller Product</span>
                              <span
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.isBestseller ? "bg-amber-500" : "bg-gray-300"
                                  }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.isBestseller ? "translate-x-4" : "translate-x-0.5"
                                    }`}
                                />
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, isSample: !prev.isSample }))
                              }
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md border text-xs font-semibold transition cursor-pointer ${formData.isSample
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              <span>🎁 Sample Product</span>
                              <span
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.isSample ? "bg-emerald-500" : "bg-gray-300"
                                  }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.isSample ? "translate-x-4" : "translate-x-0.5"
                                    }`}
                                />
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Product Title */}
                        <div>
                          <label className={labelClass}>Product Name</label>
                          <input
                            name="name"
                            value={formData.name || ""}
                            onChange={handleChange}
                            placeholder="Enter product name"
                            className={inputClass}
                          />
                        </div>

                        {/* Origin & Short Description */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Origin</label>
                            <input
                              name="origin"
                              value={formData.origin || ""}
                              onChange={handleChange}
                              placeholder="e.g. Gir, Gujarat"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Short Description</label>
                            <input
                              name="shortDescription"
                              value={formData.shortDescription || ""}
                              onChange={handleChange}
                              placeholder="Short highlight text"
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* Full Description */}
                        <div>
                          <label className={labelClass}>Full Description</label>
                          <textarea
                            name="description"
                            value={formData.description || ""}
                            onChange={handleChange}
                            placeholder="Detailed product story & benefits..."
                            rows={3}
                            className={inputClass}
                          />
                        </div>

                        {/* SKU & Warehouse */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>SKU</label>
                            <input
                              name="sku"
                              value={formData.sku || ""}
                              onChange={handleChange}
                              placeholder="Unique Product SKU"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Warehouse Location</label>
                            <input
                              list="warehouse-options"
                              name="warehouseName"
                              value={formData.warehouseName || ""}
                              onChange={handleChange}
                              placeholder="Select or type warehouse"
                              className={inputClass}
                            />
                            <datalist id="warehouse-options">
                              <option value="Ghee Warehouse" />
                              <option value="Oils Warehouse" />
                              <option value="Honey Warehouse" />
                            </datalist>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: MEDIA & BANNERS */}
                    {activeTab === "media" && (
                      <div className="space-y-4">
                        {/* Main Feature Image */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Main Feature Image
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={mainImageInputRef}
                                onChange={handleMainImageFileSelect}
                                disabled={mainImageUploading}
                              />
                              <button
                                type="button"
                                disabled={mainImageUploading}
                                onClick={() => mainImageInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {mainImageUploading ? "Uploading..." : "Upload File"}
                              </button>
                            </div>
                          </div>
                          {mainImageUploadError && (
                            <p className="text-xs text-red-600 font-medium">{mainImageUploadError}</p>
                          )}
                          {formData.images.main ? (
                            <div className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                              <img src={formData.images.main} alt="Main" className="w-full h-36 object-contain" />
                              <button
                                type="button"
                                onClick={() => handleImageChange("main", "")}
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
                            name="images.main"
                            value={formData.images.main || ""}
                            onChange={(e) => handleImageChange("main", e.target.value)}
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
                                className="hidden"
                                ref={bannerInputRef}
                                onChange={handleBannerFileSelect}
                                disabled={bannerUploading}
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
                          {bannerUploadError && (
                            <p className="text-xs text-red-600 font-medium">{bannerUploadError}</p>
                          )}
                          {formData.images.banner ? (
                            <div className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                              <img src={formData.images.banner} alt="Banner" className="w-full h-36 object-contain" />
                              <button
                                type="button"
                                onClick={handleRemoveBanner}
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
                            name="images.banner"
                            value={formData.images.banner || ""}
                            onChange={(e) => handleImageChange("banner", e.target.value)}
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
                                ref={fileInputRef}
                                onChange={handleGalleryFileSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={galleryUploading}
                                onClick={handleGalleryButtonClick}
                                className={uploadBtnClass}
                              >
                                {galleryUploading ? "Uploading..." : "Upload Gallery"}
                              </button>
                            </div>
                          </div>
                          {galleryUploadError && (
                            <p className="text-xs text-red-600 font-medium">{galleryUploadError}</p>
                          )}
                          {formData.images.gallery.length === 0 ? (
                            <div className="h-20 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No gallery images added yet
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {formData.images.gallery.map((url, idx) => (
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
                                    onClick={() => removeGalleryImage(idx)}
                                    className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-0.5 shadow-sm"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: BADGES & BENEFITS */}
                    {activeTab === "badges" && (
                      <div className="space-y-4">
                        {/* Standard Badges */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Product Badges
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={badgeImageInputRef}
                                onChange={handleMultipleBadgeFilesSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={badgeImageUploading}
                                onClick={() => badgeImageInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {badgeImageUploading ? "Uploading..." : "Upload Badges"}
                              </button>
                            </div>
                          </div>
                          {badgeImageUploadError && (
                            <p className="text-xs text-red-600 font-medium">{badgeImageUploadError}</p>
                          )}
                          {(formData.badges || []).length === 0 ? (
                            <div className="h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No badges uploaded
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {(formData.badges || []).map((badge, idx) => (
                                <div
                                  key={idx}
                                  className="relative group border border-gray-200 rounded-md p-2 bg-gray-50 flex flex-col items-center gap-1.5"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBadge(idx)}
                                    className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-0.5 shadow-sm"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                  </button>
                                  {badge.image ? (
                                    <img
                                      src={badge.image}
                                      alt="Badge"
                                      className="w-12 h-12 object-contain"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
                                      No Image
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    value={badge.text || ""}
                                    onChange={(e) => handleBadgeNameChange(idx, e.target.value)}
                                    placeholder="Badge label"
                                    className="w-full text-center px-1 py-0.5 border border-gray-200 rounded text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Health Badges */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Health Badges & Certifications
                            </label>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={healthBadgeInputRef}
                                onChange={handleMultipleHealthBadgeFilesSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={healthBadgeUploading}
                                onClick={() => healthBadgeInputRef.current?.click()}
                                className={uploadBtnClass}
                              >
                                {healthBadgeUploading ? "Uploading..." : "Upload Certifications"}
                              </button>
                            </div>
                          </div>
                          {healthBadgeUploadError && (
                            <p className="text-xs text-red-600 font-medium">{healthBadgeUploadError}</p>
                          )}
                          {(formData.healthBadges || []).length === 0 ? (
                            <div className="h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                              No health badges added
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(formData.healthBadges || []).map((badge, idx) => (
                                <div
                                  key={idx}
                                  className="relative group border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHealthBadge(idx)}
                                    className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-1 shadow-sm"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                  <div className="flex items-center gap-3">
                                    {badge.image ? (
                                      <img
                                        src={badge.image}
                                        alt="Health Badge"
                                        className="w-12 h-12 object-contain shrink-0 rounded border bg-white"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                                        No Img
                                      </div>
                                    )}
                                    <input
                                      type="text"
                                      value={badge.title || ""}
                                      onChange={(e) => handleHealthBadgeTitleChange(idx, e.target.value)}
                                      placeholder="Title (e.g., 100% Organic)"
                                      className="flex-1 px-2.5 py-1 border border-gray-300 rounded text-xs font-semibold"
                                    />
                                  </div>
                                  <textarea
                                    value={badge.description || ""}
                                    onChange={(e) => handleHealthBadgeDescriptionChange(idx, e.target.value)}
                                    placeholder="Short certification detail..."
                                    rows={2}
                                    className="w-full px-2.5 py-1 border border-gray-300 rounded text-xs resize-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between gap-3">
                    <p className="hidden sm:block text-xs text-gray-500">
                      {activeTab === "basics" && "Product basics, display rank & categories"}
                      {activeTab === "media" && "Product main feature image, banner & gallery"}
                      {activeTab === "badges" && "Product badges, certifications & health highlights"}
                    </p>
                    <div className="flex justify-end gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer ${formLoading
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                          }`}
                      >
                        {formLoading ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : editMode ? (
                          <>
                            <PencilIcon className="w-4 h-4" />
                            Update Product
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-4 h-4" />
                            Create Product
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

export default ProductFormModal;
