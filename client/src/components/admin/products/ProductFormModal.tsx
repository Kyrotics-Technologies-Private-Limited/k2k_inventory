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
      });
      setPriceInput(initialData.price?.amount ? String(initialData.price.amount) : "");
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
      setGalleryUploadError("Failed to upload gallery images.");
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
      setFormData((prev) => ({
        ...prev,
        badges: [
          ...(prev.badges || []),
          ...urls.map((url) => ({ image: url, text: "" })),
        ],
      }));
    } catch (err) {
      setBadgeImageUploadError("Failed to upload badge images.");
    } finally {
      setBadgeImageUploading(false);
      if (badgeImageInputRef.current) badgeImageInputRef.current.value = "";
    }
  };

  const handleBadgeNameChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges.map((badge, i) =>
        i === idx ? { ...badge, text: value } : badge
      ),
    }));
  };

  const handleRemoveBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges.filter((_, i) => i !== idx),
    }));
  };

  const handleMultipleHealthBadgeFilesSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setHealthBadgeUploading(true);
    setHealthBadgeUploadError("");
    try {
      const urls = await productApi.uploadMultipleHealthBadgeImages(e.target.files);
      setFormData((prev) => ({
        ...prev,
        healthBadges: [
          ...(prev.healthBadges || []),
          ...urls.map((url) => ({ image: url, title: "", description: "" })),
        ],
      }));
    } catch (err) {
      setHealthBadgeUploadError("Failed to upload health badge images.");
    } finally {
      setHealthBadgeUploading(false);
      if (healthBadgeInputRef.current) healthBadgeInputRef.current.value = "";
    }
  };

  const handleHealthBadgeTitleChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).map((badge, i) =>
        i === idx ? { ...badge, title: value } : badge
      ),
    }));
  };

  const handleHealthBadgeDescriptionChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).map((badge, i) =>
        i === idx ? { ...badge, description: value } : badge
      ),
    }));
  };

  const handleRemoveHealthBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-800/50 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative bg-white rounded-lg px-6 pt-6 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-4xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {editMode ? "Edit Product" : "Create New Product"}
                  </h2>
                  <button
                    onClick={onClose}
                    className="button text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categories
                      </label>
                      <div className="min-h-[42px] p-2 border border-gray-300 rounded-md bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200">
                        {(formData.categoryIds || []).map((catId) => {
                          const cat = categories.find((c) => c.id === catId);
                          if (!cat) return null;
                          return (
                            <span
                              key={catId}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-md border border-blue-100 shadow-sm transition-all"
                            >
                              {cat.name}
                              <button
                                type="button"
                                onClick={() => handleCategoryToggle(catId)}
                                className="text-blue-400 hover:text-blue-600 focus:outline-none transition-colors"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </span>
                          );
                        })}
                        <select
                          className="flex-grow border-none focus:ring-0 text-sm py-1 bg-transparent cursor-pointer min-w-[150px]"
                          value=""
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (selectedId) {
                              handleCategoryToggle(selectedId);
                            }
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
                      <p className="mt-2 text-xs text-gray-500 italic flex items-center gap-1">
                        <CheckIcon className="w-3 h-3 text-green-500" />
                        Choose multiple categories from the dropdown. Selected items appear as tags above.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Catalog Status
                      </label>
                      <select
                        name="status"
                        value={formData.status || "active"}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active — visible on storefront</option>
                        <option value="hidden">Hidden — not shown on storefront</option>
                        <option value="draft">Draft — work in progress</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Rank (Storefront Dropdown Position)
                      </label>
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
                        placeholder="e.g. 1 (lower numbers show first)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                      </label>
                      <input
                        name="name"
                        value={formData.name || ""}
                        onChange={handleChange}
                        placeholder="Enter product name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Origin
                      </label>
                      <input
                        name="origin"
                        value={formData.origin || ""}
                        onChange={handleChange}
                        placeholder="Enter product origin"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Short Description
                      </label>
                      <input
                        name="shortDescription"
                        value={formData.shortDescription || ""}
                        onChange={handleChange}
                        placeholder="Enter short description"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description || ""}
                        onChange={handleChange}
                        placeholder="Enter product description"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SKU
                        </label>
                        <input
                          name="sku"
                          value={formData.sku || ""}
                          onChange={handleChange}
                          placeholder="Enter Product SKU"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warehouse Name
                        </label>
                        <input
                          list="warehouse-options"
                          name="warehouseName"
                          value={formData.warehouseName || ""}
                          onChange={handleChange}
                          placeholder="Select or enter warehouse name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <datalist id="warehouse-options">
                          <option value="Ghee Warehouse" />
                          <option value="Oils Warehouse" />
                          <option value="Honey Warehouse" />
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Main Image URL
                    </label>
                    <input
                      name="images.main"
                      value={formData.images.main || ""}
                      onChange={(e) =>
                        handleImageChange("main", e.target.value)
                      }
                      placeholder="Enter main image URL"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-2 flex items-center space-x-2">
                      <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition text-sm font-medium">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={mainImageInputRef}
                          onChange={handleMainImageFileSelect}
                          disabled={mainImageUploading}
                        />
                        {mainImageUploading
                          ? "Uploading..."
                          : "Upload Main Image"}
                      </label>
                      {mainImageUploadError && (
                        <span className="text-red-500 text-sm">
                          {mainImageUploadError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">
                      Gallery Images
                    </label>
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
                      onClick={handleGalleryButtonClick}
                      disabled={galleryUploading}
                      className="button mb-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {galleryUploading ? "Uploading..." : "Upload Images"}
                    </button>
                    {galleryUploadError && (
                      <div className="text-red-500 text-sm">{galleryUploadError}</div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formData.images.gallery.map((url, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2"
                        >
                          {typeof url === "string" && url.trim() !== "" && (
                            <img
                              src={url}
                              alt={`Gallery ${idx + 1}`}
                              className="w-20 h-20 object-contain rounded border"
                            />
                          )}
                          <input
                            type="text"
                            value={url || ""}
                            readOnly
                            className="flex-1 px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="ml-1 p-1 rounded-full hover:bg-red-500 focus:outline-none"
                            aria-label="Remove image"
                          >
                            <XMarkIcon className="w-5 h-5 text-red-500 hover:text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banner Image
                    </label>
                    {formData.images.banner &&
                      typeof formData.images.banner === "string" &&
                      formData.images.banner.trim() !== "" && (
                        <div className="mb-2 relative group">
                          <img
                            src={formData.images.banner}
                            alt="Banner Preview"
                            className="w-full h-32 object-contain rounded border"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveBanner}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-red-600 hover:bg-red-200 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ zIndex: 10 }}
                            aria-label="Remove banner"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition text-sm font-medium">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={bannerInputRef}
                        onChange={handleBannerFileSelect}
                        disabled={bannerUploading}
                      />
                      {bannerUploading
                        ? "Uploading..."
                        : "Upload Banner Image"}
                    </label>
                    {bannerUploadError && (
                      <span className="text-red-500 text-sm ml-2">
                        {bannerUploadError}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Health Badges
                    </label>
                    <div className="flex space-x-2 mb-2 items-center">
                      <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition text-sm font-medium">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={healthBadgeInputRef}
                          onChange={handleMultipleHealthBadgeFilesSelect}
                          multiple
                          disabled={healthBadgeUploading}
                        />
                        {healthBadgeUploading
                          ? "Uploading..."
                          : "Upload Health Badge Images"}
                      </label>
                    </div>
                    {healthBadgeUploadError && (
                      <span className="text-red-500 text-sm">
                        {healthBadgeUploadError}
                      </span>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {(formData.healthBadges || []).map((badge, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col space-y-2 p-4 border rounded-lg relative"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveHealthBadge(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 focus:outline-none"
                            aria-label="Remove health badge"
                          >
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          </button>
                          {typeof badge.image === "string" &&
                            badge.image.trim() !== "" && (
                              <img
                                src={badge.image}
                                alt="Health Badge"
                                className="w-20 h-20 object-contain rounded border mx-auto"
                              />
                            )}
                          <input
                            type="text"
                            value={badge.title || ""}
                            onChange={(e) =>
                              handleHealthBadgeTitleChange(idx, e.target.value)
                            }
                            placeholder="Health badge title"
                            className="px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <textarea
                            value={badge.description || ""}
                            onChange={(e) =>
                              handleHealthBadgeDescriptionChange(idx, e.target.value)
                            }
                            placeholder="Health badge description"
                            rows={2}
                            className="px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Badges
                    </label>
                    <div className="flex space-x-2 mb-2 items-center">
                      <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition text-sm font-medium">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={badgeImageInputRef}
                          onChange={handleMultipleBadgeFilesSelect}
                          multiple
                          disabled={badgeImageUploading}
                        />
                        {badgeImageUploading
                          ? "Uploading..."
                          : "Upload Badge Images"}
                      </label>
                    </div>
                    {badgeImageUploadError && (
                      <span className="text-red-500 text-sm">
                        {badgeImageUploadError}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2">
                      {(formData.badges || []).map((badge, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center relative border p-2 rounded-md"
                        >
                          {typeof badge.image === "string" &&
                            badge.image.trim() !== "" && (
                              <img
                                src={badge.image}
                                alt="Badge"
                                className="w-20 h-20 object-contain rounded border mb-1"
                              />
                            )}
                          <input
                            type="text"
                            value={badge.text || ""}
                            onChange={(e) =>
                              handleBadgeNameChange(idx, e.target.value)
                            }
                            placeholder="Badge name"
                            className="px-2 py-1 border rounded-md text-center text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBadge(idx)}
                            className="absolute top-0 right-0 mt-1 mr-1 p-1 rounded-full hover:bg-red-100 focus:outline-none"
                            aria-label="Remove badge"
                          >
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Bestseller Toggle */}
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-amber-800">🏆 Bestseller Tag</h3>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Mark this product as a bestseller — it will be highlighted on the storefront.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, isBestseller: !prev.isBestseller }))
                        }
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
                          formData.isBestseller ? "bg-amber-500" : "bg-gray-300"
                        }`}
                        aria-checked={formData.isBestseller}
                        role="switch"
                        aria-label="Toggle bestseller"
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                            formData.isBestseller ? "translate-x-8" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    {formData.isBestseller && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow">
                          🏆 BESTSELLER
                        </span>
                        <span className="text-xs text-amber-700">This badge will appear on the product card.</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="button px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className={`button px-4 py-2 rounded-md text-white flex items-center text-sm font-medium ${
                        formLoading
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {formLoading ? (
                        <>
                          <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : editMode ? (
                        <>
                          <PencilIcon className="w-5 h-5 mr-2" />
                          Update Product
                        </>
                      ) : (
                        <>
                          <PlusIcon className="w-5 h-5 mr-2" />
                          Create Product
                        </>
                      )}
                    </button>
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
