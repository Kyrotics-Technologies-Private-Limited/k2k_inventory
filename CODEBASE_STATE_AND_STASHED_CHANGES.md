# K2K Inventory — Comprehensive Codebase State & Uncommitted Changes Reference

This document provides a complete technical reference for **K2K Inventory** (`client` & `server`), detailing the current system architecture, data models, API endpoints, and full source code blocks for all recent refactorings.

---

## 1. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT  (client/)                                                   │
│  React 19 · TypeScript · Vite · Tailwind · MUI · Headless UI         │
│                                                                      │
│  - App.tsx (React Router 7 — /admin/* routes)                        │
│  - Product management, variant stock management, category hierarchy  │
│  - Order management, customer records, reports & finance analysis    │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  HTTP /api/* (Axios)
                                │  Authorization: Bearer <Firebase Token>
┌───────────────────────────────▼──────────────────────────────────────┐
│  SERVER  (server/)                                                   │
│  Node.js · Express 5.1 · Firebase Admin SDK 13                       │
│                                                                      │
│  - Controllers (ProductController, VariantController, etc.)          │
│  - Invoicing, order state machine & variant stock deduction          │
│  - Catalog manifest generator service (catalogManifest/latest)       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  FIREBASE                                                            │
│  Firestore (Data) · Firebase Auth (Admins) · Firebase Storage         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventory Data Models (Firestore)

- **`products` collection:** Main product details (`id`, `name`, `price`, `description`, `categoryIds`, `images`, `badges`, `healthBadges`, `rank`, `isBestseller`).
- **`products/{productId}/variants` subcollection:** SKU variants (`weight`, `price`, `originalPrice`, `discount`, `gstPercentage`, `units_in_stock`, `inStock`).
- **`categories` collection:** Product category definitions (`id`, `name`, `key`, `isFeatured`, `showInMenu`, `showOnHomepage`).
- **`orders` collection:** Placed customer orders (`userId`, `items[]`, `total_amount`, `status`, `invoiceUrl`).
- **`catalogManifest` collection:** Pre-compiled homepage and navigation snapshot (`catalogManifest/latest`).

---

## 3. Full Source Code of Modular Components & Scripts

All modular components and utility scripts are fully documented below so they can be reviewed or re-created directly.

### 3.1 `ProductFormBasicsTab.tsx`
```tsx
import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Product } from "../../../../types";
import type { Category } from "../../../../services/api/categoryApi";
import { inputClass, labelClass } from "./styles";

export interface ProductFormBasicsTabProps {
  formData: Omit<Product, "id">;
  categories: Category[];
  rankError: string;
  rankFieldRef: React.RefObject<HTMLDivElement | null>;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onCategoryToggle: (catId: string) => void;
  onRankChange: (nextRank: number | undefined) => void;
  onToggleBestseller: () => void;
}

const ProductFormBasicsTab: React.FC<ProductFormBasicsTabProps> = ({
  formData,
  categories,
  rankError,
  rankFieldRef,
  onChange,
  onCategoryToggle,
  onRankChange,
  onToggleBestseller,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Categories</label>
        <div className="min-h-[42px] p-2 border border-gray-300 rounded-md bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500">
          {(formData.categoryIds || []).map((catId) => {
            const cat = categories.find((c) => c.id === catId);
            if (!cat) return null;
            return (
              <span
                key={catId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-md border border-blue-100"
              >
                {cat.name}
                <button
                  type="button"
                  onClick={() => onCategoryToggle(catId)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            );
          })}
          <select
            className="flex-grow border-none focus:ring-0 text-sm py-1 bg-transparent cursor-pointer min-w-[140px]"
            value=""
            onChange={(e) => {
              if (e.target.value) onCategoryToggle(e.target.value);
            }}
          >
            <option value="" disabled>Select category...</option>
            {categories
              .filter((cat) => !(formData.categoryIds || []).includes(cat.id))
              .map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
          </select>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
          <CheckIcon className="w-3 h-3 text-green-500" />
          Multiple categories allowed
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Catalog Status</label>
          <select name="status" value={formData.status || "active"} onChange={onChange} className={inputClass}>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div ref={rankFieldRef}>
          <label className={labelClass}>Display Rank</label>
          <input
            type="number"
            name="rank"
            value={formData.rank ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onRankChange(val !== "" ? Number(val) : undefined);
            }}
            placeholder="e.g. 1"
            className={`${inputClass} ${rankError ? "border-red-400 focus:ring-red-400 focus:border-red-400" : ""}`}
          />
          {rankError && <p className="mt-1 text-sm text-red-600">{rankError}</p>}
        </div>
        <div className="flex items-end pb-0.5">
          <button
            type="button"
            onClick={onToggleBestseller}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm font-medium transition ${
              formData.isBestseller
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            role="switch"
            aria-checked={formData.isBestseller}
          >
            <span>Bestseller</span>
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${formData.isBestseller ? "bg-amber-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${formData.isBestseller ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Product Name</label>
        <input name="name" value={formData.name || ""} onChange={onChange} placeholder="Enter product name" className={inputClass} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Origin</label>
          <input name="origin" value={formData.origin || ""} onChange={onChange} placeholder="Product origin" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Short Description</label>
          <input name="shortDescription" value={formData.shortDescription || ""} onChange={onChange} placeholder="Short description" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" value={formData.description || ""} onChange={onChange} placeholder="Full product description" rows={3} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>SKU</label>
          <input name="sku" value={formData.sku || ""} onChange={onChange} placeholder="Product SKU" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Warehouse</label>
          <input list="warehouse-options" name="warehouseName" value={formData.warehouseName || ""} onChange={onChange} placeholder="Warehouse name" className={inputClass} />
          <datalist id="warehouse-options">
            <option value="Ghee Warehouse" />
            <option value="Oils Warehouse" />
            <option value="Honey Warehouse" />
          </datalist>
        </div>
      </div>
    </div>
  );
};

export default ProductFormBasicsTab;
```

---

### 3.2 `ProductFormMediaTab.tsx`
```tsx
import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Product } from "../../../../types";
import { uploadBtnClass } from "./styles";

export interface ProductFormMediaTabProps {
  formData: Omit<Product, "id">;
  mainImageUploading: boolean;
  mainImageUploadError: string;
  mainImageInputRef: React.RefObject<HTMLInputElement | null>;
  bannerUploading: boolean;
  bannerUploadError: string;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  galleryUploading: boolean;
  galleryUploadError: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onMainImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGallerySelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGalleryButtonClick: () => void;
  onRemoveMainImage: () => void;
  onRemoveBanner: () => void;
  onRemoveGalleryImage: (idx: number) => void;
}

const ProductFormMediaTab: React.FC<ProductFormMediaTabProps> = ({
  formData, mainImageUploading, mainImageUploadError, mainImageInputRef,
  bannerUploading, bannerUploadError, bannerInputRef, galleryUploading, galleryUploadError,
  fileInputRef, onMainImageSelect, onBannerSelect, onGallerySelect, onGalleryButtonClick,
  onRemoveMainImage, onRemoveBanner, onRemoveGalleryImage,
}) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-800">Main Image</label>
            <label className={uploadBtnClass}>
              <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={onMainImageSelect} disabled={mainImageUploading} />
              {mainImageUploading ? "Uploading..." : "Upload"}
            </label>
          </div>
          {formData.images.main ? (
            <div className="relative group border rounded-md overflow-hidden bg-gray-50">
              <img src={formData.images.main} alt="Main" className="w-full h-36 object-contain" />
              <button type="button" onClick={onRemoveMainImage} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                <XMarkIcon className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="h-36 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">No main image</div>
          )}
          {mainImageUploadError && <p className="text-red-500 text-sm mt-1">{mainImageUploadError}</p>}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-800">Banner Image</label>
            <label className={uploadBtnClass}>
              <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={onBannerSelect} disabled={bannerUploading} />
              {bannerUploading ? "Uploading..." : "Upload"}
            </label>
          </div>
          {formData.images.banner ? (
            <div className="relative group">
              <img src={formData.images.banner} alt="Banner" className="w-full h-36 object-contain rounded border bg-gray-50" />
              <button type="button" onClick={onRemoveBanner} className="absolute top-2 right-2 bg-white/90 rounded-full p-1 text-red-600 opacity-0 group-hover:opacity-100 transition">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="h-36 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">No banner image</div>
          )}
          {bannerUploadError && <p className="text-red-500 text-sm mt-1">{bannerUploadError}</p>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-800">Gallery Images</label>
          <div>
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={onGallerySelect} className="hidden" />
            <button type="button" onClick={onGalleryButtonClick} disabled={galleryUploading} className={uploadBtnClass}>
              {galleryUploading ? "Uploading..." : "Upload Images"}
            </button>
          </div>
        </div>
        {galleryUploadError && <p className="text-red-500 text-sm mb-2">{galleryUploadError}</p>}
        {formData.images.gallery.length === 0 ? (
          <div className="h-24 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">No gallery images yet</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {formData.images.gallery.map((url, idx) => (
              <div key={idx} className="relative group border rounded-md overflow-hidden bg-gray-50">
                {url && <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-24 object-contain" />}
                <button type="button" onClick={() => onRemoveGalleryImage(idx)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                  <XMarkIcon className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFormMediaTab;
```

---

### 3.3 `useProductForm.ts`
```ts
import { useEffect, useRef, useState } from "react";
import type { Product } from "../../../../types";
import { productApi } from "../../../../services/api/productApi";

export type FormTab = "basics" | "media" | "badges";

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

export interface UseProductFormOptions {
  isOpen: boolean;
  editId: string | null;
  existingProducts: Product[];
  initialData: Product | Omit<Product, "id">;
  onSubmit: (formData: Omit<Product, "id">) => Promise<void>;
}

export function useProductForm({
  isOpen, editId, existingProducts, initialData, onSubmit,
}: UseProductFormOptions) {
  const [formData, setFormData] = useState<Omit<Product, "id">>(initialForm);
  const [, setPriceInput] = useState("");
  const [rankError, setRankError] = useState("");
  const [activeTab, setActiveTab] = useState<FormTab>("basics");
  const rankFieldRef = useRef<HTMLDivElement>(null);
  const tabBodyRef = useRef<HTMLDivElement>(null);
  const pendingBadgeScrollRef = useRef<"badges" | "health" | null>(null);
  const firstNewBadgeIndexRef = useRef<number>(0);

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
    if (!isOpen) return;
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
    setRankError("");
    setActiveTab("basics");
  }, [isOpen, editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "amount") {
      if (/^\d*\.?\d*$/.test(value)) {
        setPriceInput(value);
        setFormData((prev) => ({ ...prev, price: { ...prev.price, amount: value === "" ? 0 : parseFloat(value) } }));
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

  const handleRankChange = (nextRank: number | undefined) => {
    setFormData((prev) => ({ ...prev, rank: nextRank }));
    if (rankError) setRankError("");
  };

  const handleToggleBestseller = () => {
    setFormData((prev) => ({ ...prev, isBestseller: !prev.isBestseller }));
  };

  const removeGalleryImage = (idx: number) => {
    setFormData((prev) => ({ ...prev, images: { ...prev.images, gallery: prev.images.gallery.filter((_, i) => i !== idx) } }));
  };

  const handleRemoveMainImage = () => {
    setFormData((prev) => ({ ...prev, images: { ...prev.images, main: "" } }));
  };

  const handleRemoveBanner = () => {
    setFormData((prev) => ({ ...prev, images: { ...prev.images, banner: "" } }));
  };

  const handleMainImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setMainImageUploading(true);
    setMainImageUploadError("");
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setFormData((prev) => ({ ...prev, images: { ...prev.images, main: url } }));
    } catch {
      setMainImageUploadError("Failed to upload main image. Please try again.");
    } finally {
      setMainImageUploading(false);
      if (mainImageInputRef.current) mainImageInputRef.current.value = "";
    }
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBannerUploading(true);
    setBannerUploadError("");
    try {
      const url = await productApi.uploadMainImage(e.target.files[0]);
      setFormData((prev) => ({ ...prev, images: { ...prev.images, banner: url } }));
    } catch {
      setBannerUploadError("Failed to upload banner image. Please try again.");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleGalleryButtonClick = () => { fileInputRef.current?.click(); };

  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setGalleryUploading(true);
    setGalleryUploadError("");
    try {
      const urls = await productApi.uploadGalleryImages(e.target.files);
      setFormData((prev) => ({ ...prev, images: { ...prev.images, gallery: [...prev.images.gallery, ...urls] } }));
    } catch {
      setGalleryUploadError("Failed to upload gallery images.");
    } finally {
      setGalleryUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMultipleBadgeFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBadgeImageUploading(true);
    setBadgeImageUploadError("");
    try {
      const startIndex = formData.badges?.length || 0;
      const urls = await productApi.uploadMultipleBadgeImages(e.target.files);
      firstNewBadgeIndexRef.current = startIndex;
      pendingBadgeScrollRef.current = "badges";
      setFormData((prev) => ({
        ...prev,
        badges: [...(prev.badges || []), ...urls.map((url) => ({ image: url, text: "" }))],
      }));
    } catch {
      setBadgeImageUploadError("Failed to upload badge images.");
    } finally {
      setBadgeImageUploading(false);
      if (badgeImageInputRef.current) badgeImageInputRef.current.value = "";
    }
  };

  const handleBadgeNameChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges.map((badge, i) => (i === idx ? { ...badge, text: value } : badge)),
    }));
  };

  const handleRemoveBadge = (idx: number) => {
    setFormData((prev) => ({ ...prev, badges: prev.badges.filter((_, i) => i !== idx) }));
  };

  const handleMultipleHealthBadgeFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setHealthBadgeUploading(true);
    setHealthBadgeUploadError("");
    try {
      const startIndex = formData.healthBadges?.length || 0;
      const urls = await productApi.uploadMultipleHealthBadgeImages(e.target.files);
      firstNewBadgeIndexRef.current = startIndex;
      pendingBadgeScrollRef.current = "health";
      setFormData((prev) => ({
        ...prev,
        healthBadges: [...(prev.healthBadges || []), ...urls.map((url) => ({ image: url, title: "", description: "" }))],
      }));
    } catch {
      setHealthBadgeUploadError("Failed to upload health badge images.");
    } finally {
      setHealthBadgeUploading(false);
      if (healthBadgeInputRef.current) healthBadgeInputRef.current.value = "";
    }
  };

  const handleHealthBadgeTitleChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).map((badge, i) => (i === idx ? { ...badge, title: value } : badge)),
    }));
  };

  const handleHealthBadgeDescriptionChange = (idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).map((badge, i) => (i === idx ? { ...badge, description: value } : badge)),
    }));
  };

  const handleRemoveHealthBadge = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      healthBadges: (prev.healthBadges || []).filter((_, i) => i !== idx),
    }));
  };

  const findRankConflict = (rank: number | undefined) => {
    if (rank === undefined || rank === null || Number.isNaN(Number(rank))) return null;
    return (
      existingProducts.find(
        (p) => p.rank !== undefined && p.rank !== null && Number(p.rank) === Number(rank) && String(p.id) !== String(editId ?? "")
      ) || null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Product, "id"> = {
      ...formData,
      rank: formData.rank === undefined || formData.rank === null || Number.isNaN(Number(formData.rank)) ? undefined : Number(formData.rank),
    };
    const conflict = findRankConflict(payload.rank);
    if (conflict) {
      setRankError(`Rank ${payload.rank} is already assigned to "${conflict.name}". Please choose a different rank.`);
      return;
    }
    setRankError("");
    await onSubmit(payload);
  };

  return {
    formData, rankError, activeTab, setActiveTab, rankFieldRef, tabBodyRef,
    mainImageUploading, mainImageUploadError, mainImageInputRef, bannerUploading, bannerUploadError,
    bannerInputRef, galleryUploading, galleryUploadError, fileInputRef, badgeImageUploading,
    badgeImageUploadError, badgeImageInputRef, healthBadgeUploading, healthBadgeUploadError,
    healthBadgeInputRef, handleChange, handleCategoryToggle, handleRankChange, handleToggleBestseller,
    handleMainImageFileSelect, handleBannerFileSelect, handleGalleryButtonClick, handleGalleryFileSelect,
    handleRemoveMainImage, handleRemoveBanner, removeGalleryImage, handleMultipleBadgeFilesSelect,
    handleBadgeNameChange, handleRemoveBadge, handleMultipleHealthBadgeFilesSelect,
    handleHealthBadgeTitleChange, handleHealthBadgeDescriptionChange, handleRemoveHealthBadge, handleSubmit,
  };
}
```

---

### 3.4 `VariantFormModal.tsx`
```tsx
import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ArrowPathIcon, ExclamationTriangleIcon, PlusIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { Variant } from "../../../types/variant";
import { calculatePriceIncludingGST, calculateGSTAmount, formatPrice, GST_RATE_OPTIONS } from "../../../utils/gstCalculations";
import { useVariantForm, WEIGHT_UNITS } from "./useVariantForm";

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export interface VariantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  productId: string;
  variant?: Variant | null;
  isWeightDuplicate: (weight: string, excludeId?: string) => boolean;
  onSuccess: (variant: Variant) => void;
}

const VariantFormModal: React.FC<VariantFormModalProps> = ({
  isOpen, onClose, mode, productId, variant = null, isWeightDuplicate, onSuccess,
}) => {
  const form = useVariantForm({ isOpen, mode, productId, variant, isWeightDuplicate, onSuccess, onClose });
  const isEdit = mode === "edit";

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-800/50 transition-opacity" />
        </Transition.Child>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:scale-95">
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all flex flex-col">
                <form onSubmit={form.handleSubmit} className="flex flex-col">
                  <div className="shrink-0 border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Variant" : "Add Variant"}</Dialog.Title>
                      <p className="text-xs text-gray-500 mt-0.5">Size, pricing, tax, and stock</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <span className="sr-only">Close</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>
                  </div>
                  <div className="px-5 py-4 bg-gray-50/40 space-y-3">
                    {form.error && (
                      <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 shrink-0 mt-0.5" />{form.error}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      <div className="space-y-3">
                        <section className="bg-white border border-gray-200 rounded-lg p-3.5">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Size</h3>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className={labelClass}>Weight</label>
                              <input type="number" name="weightNumber" value={form.formData.weightNumber} onChange={form.handleChange} min="0" step="0.01" placeholder="e.g. 500" className={`${inputClass} ${form.weightDuplicate ? "border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400" : ""}`} required />
                            </div>
                            <div>
                              <label className={labelClass}>Unit</label>
                              <select name="weightUnit" value={form.formData.weightUnit} onChange={form.handleChange} className={inputClass} required>
                                {WEIGHT_UNITS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                              </select>
                            </div>
                          </div>
                        </section>
                        <section className="bg-white border border-gray-200 rounded-lg p-3.5">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Stock</h3>
                          <div className="space-y-3">
                            <div>
                              <label className={labelClass}>Units in stock</label>
                              <input type="number" name="units_in_stock" value={form.formData.units_in_stock} onChange={form.handleChange} min="0" className={inputClass} required />
                            </div>
                            <button type="button" onClick={form.toggleInStock} className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm font-medium transition ${form.formData.inStock ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-gray-300 text-gray-700"}`} role="switch" aria-checked={form.formData.inStock}>
                              <span>In stock</span>
                              <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${form.formData.inStock ? "bg-emerald-500" : "bg-gray-300"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${form.formData.inStock ? "translate-x-4" : "translate-x-0.5"}`} /></span>
                            </button>
                          </div>
                        </section>
                      </div>
                      <div className="space-y-3">
                        <section className="bg-white border border-gray-200 rounded-lg p-3.5">
                          <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</h3>
                            {form.formData.discount && Number(form.formData.discount) > 0 && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{form.formData.discount}% off</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Price (₹)</label>
                              <input type="number" name="price" value={form.formData.price} onChange={form.handleChange} min="0" step="0.01" className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Strike-through (₹)</label>
                              <input type="number" name="originalPrice" value={form.formData.originalPrice} onChange={form.handleChange} min="0" step="0.01" className={inputClass} />
                            </div>
                          </div>
                        </section>
                        <section className="bg-white border border-gray-200 rounded-lg p-3.5">
                          <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tax (GST)</h3>
                            <button type="button" onClick={() => form.setUseCustomGst(!form.formData.useCustomGst)} className={`text-xs font-medium px-2 py-1 rounded-md border transition ${form.formData.useCustomGst ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                              {form.formData.useCustomGst ? "Using custom" : "Custom rate"}
                            </button>
                          </div>
                          {!form.formData.useCustomGst ? (
                            <select name="gstPercentage" value={form.formData.gstPercentage} onChange={form.handleChange} className={inputClass} required>
                              {GST_RATE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                          ) : (
                            <input type="number" name="customGstPercentage" value={form.formData.customGstPercentage} onChange={form.handleChange} min="0" max="100" step="0.01" placeholder="Enter GST %" className={inputClass} required />
                          )}
                        </section>
                        <section className="rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-3 flex items-center justify-between gap-3">
                          <div className="text-xs text-blue-700/80">
                            <p className="text-[10px] uppercase tracking-wide text-blue-600/70 font-semibold mb-1">Overall price</p>
                            <span className="block">Base {form.priceNum ? formatPrice(form.priceNum) : "₹0.00"}</span>
                            <span className="block">+ GST {form.priceNum && !Number.isNaN(form.gstRate) ? formatPrice(calculateGSTAmount(form.priceNum, form.gstRate)) : "₹0.00"}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wide text-blue-600/70 font-medium">Incl. GST</p>
                            <p className="text-lg font-semibold text-blue-900">{form.priceNum && !Number.isNaN(form.gstRate) ? formatPrice(calculatePriceIncludingGST(form.priceNum, form.gstRate)) : "₹0.00"}</p>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={form.loading} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                    <button type="submit" disabled={form.loading || form.weightDuplicate} className={`px-4 py-2 rounded-md text-white flex items-center text-sm font-medium ${form.loading || form.weightDuplicate ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                      {form.loading ? (<><ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</>) : isEdit ? (<><PencilIcon className="w-4 h-4 mr-2" />Save Changes</>) : (<><PlusIcon className="w-4 h-4 mr-2" />Add Variant</>)}
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

export default VariantFormModal;
```

---

### 3.5 `useVariantForm.ts`
```ts
import { useEffect, useState } from "react";
import type { Variant } from "../../../types/variant";
import variantApi from "../../../services/api/variantApi";
import { GST_RATE_OPTIONS } from "../../../utils/gstCalculations";

export const WEIGHT_UNITS = ["g", "kg", "ml", "l"] as const;

export interface VariantFormState {
  weight: string;
  weightNumber: string;
  weightUnit: string;
  price: string;
  originalPrice: string;
  discount: string;
  gstPercentage: string;
  customGstPercentage: string;
  useCustomGst: boolean;
  inStock: boolean;
  units_in_stock: string;
}

const emptyForm: VariantFormState = {
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
};

const isPresetGst = (rate: number) => GST_RATE_OPTIONS.some((opt) => opt.value === rate);

function variantToForm(variant: Variant): VariantFormState {
  const [weightNumber, weightUnit] = variant.weight.split(/\s+/);
  const gst = variant.gstPercentage ?? 18;
  const preset = isPresetGst(gst);

  return {
    weight: variant.weight,
    weightNumber: weightNumber || "",
    weightUnit: weightUnit || "g",
    price: variant.price !== undefined && variant.price !== null ? String(variant.price) : "",
    originalPrice: variant.originalPrice !== undefined && variant.originalPrice !== null ? String(variant.originalPrice) : "",
    discount: variant.discount !== undefined && variant.discount !== null ? String(variant.discount) : "",
    gstPercentage: preset ? String(gst) : "18",
    customGstPercentage: preset ? "" : String(gst),
    useCustomGst: !preset,
    inStock: variant.inStock,
    units_in_stock: typeof variant.units_in_stock === "number" ? String(variant.units_in_stock) : "",
  };
}

export interface UseVariantFormOptions {
  isOpen: boolean;
  mode: "create" | "edit";
  productId: string;
  variant: Variant | null;
  isWeightDuplicate: (weight: string, excludeId?: string) => boolean;
  onSuccess: (variant: Variant) => void;
  onClose: () => void;
}

export function useVariantForm({
  isOpen, mode, productId, variant, isWeightDuplicate, onSuccess, onClose,
}: UseVariantFormOptions) {
  const [formData, setFormData] = useState<VariantFormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && variant) {
      setFormData(variantToForm(variant));
    } else {
      setFormData(emptyForm);
    }
    setError("");
    setLoading(false);
  }, [isOpen, mode, variant]);

  const currentWeight = `${formData.weightNumber || ""} ${formData.weightUnit || ""}`.trim();
  const excludeId = mode === "edit" && variant ? variant.id : undefined;
  const weightDuplicate = Boolean(formData.weightNumber) && Boolean(formData.weightUnit) && isWeightDuplicate(currentWeight, excludeId);
  const gstRate = Number(formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage);
  const priceNum = Number(formData.price) || 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (error) setError("");

    setFormData((prev) => {
      const next: VariantFormState = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "weightNumber" || name === "weightUnit") {
        const number = name === "weightNumber" ? value : prev.weightNumber;
        const unit = name === "weightUnit" ? value : prev.weightUnit;
        next.weight = `${number || ""} ${unit || ""}`.trim();
      }
      if (name === "price" || name === "originalPrice") {
        const price = name === "price" ? Number(value) : Number(prev.price);
        const originalPrice = name === "originalPrice" ? Number(value) : Number(prev.originalPrice);
        if (originalPrice > 0 && price > 0) {
          const discountPercent = ((originalPrice - price) / originalPrice) * 100;
          next.discount = String(Math.round(discountPercent * 100) / 100);
        } else {
          next.discount = "0";
        }
      }
      return next;
    });
  };

  const setUseCustomGst = (useCustom: boolean) => {
    setFormData((prev) => ({ ...prev, useCustomGst: useCustom }));
    if (error) setError("");
  };

  const toggleInStock = () => {
    setFormData((prev) => ({ ...prev, inStock: !prev.inStock }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const finalWeight = `${formData.weightNumber || ""} ${formData.weightUnit || ""}`.trim();

    if (isWeightDuplicate(finalWeight, excludeId)) {
      const [number] = finalWeight.trim().split(/\s+/);
      setError(`A variant with ${number} already exists. Please choose a different quantity.`);
      return;
    }

    const gstPercentage = Number(formData.useCustomGst ? formData.customGstPercentage : formData.gstPercentage);
    setLoading(true);
    try {
      if (mode === "edit" && variant) {
        const updated = await variantApi.updateVariant(productId, variant.id, {
          id: variant.id, productId, weight: finalWeight, price: Number(formData.price) || 0,
          originalPrice: Number(formData.originalPrice) || 0, discount: Number(formData.discount) || 0,
          gstPercentage, inStock: formData.inStock, units_in_stock: Number(formData.units_in_stock) || 0,
        });
        onSuccess(updated);
        onClose();
      } else {
        const created = await variantApi.createVariant(productId, {
          productId, weight: finalWeight, price: Number(formData.price) || 0,
          originalPrice: Number(formData.originalPrice) || 0, discount: Number(formData.discount) || 0,
          gstPercentage, inStock: formData.inStock, units_in_stock: Number(formData.units_in_stock) || 0,
        });
        onSuccess(created);
        setFormData(emptyForm);
        onClose();
      }
    } catch {
      setError(mode === "edit" ? "Failed to update variant. Please check the data and try again." : "Failed to add variant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData, error, loading, weightDuplicate, currentWeight, gstRate, priceNum,
    handleChange, setUseCustomGst, toggleInStock, handleSubmit,
  };
}
```

---

### 3.6 `resetAdminPassword.js` (Server Admin Script)
```js
/**
 * Ensures the Univillage inventory admin exists and resets password to 123456.
 * Usage: node scripts/resetAdminPassword.js [email] [password]
 */
const { auth, db } = require('../firebase/firebase-config');

const ADMIN_COLLECTION = 'admin';
const DEFAULT_EMAIL = 'admin@gmail.com';
const DEFAULT_PASSWORD = '123456';
const DISPLAY_NAME = 'k2kadmin';

async function resetAdminPassword() {
  const email = (process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase();
  const NEW_PASSWORD = process.argv[3] || DEFAULT_PASSWORD;

  if (process.env.FIREBASE_PROJECT_ID !== 'univillage-503009') {
    throw new Error(
      `Refusing to run: FIREBASE_PROJECT_ID is "${process.env.FIREBASE_PROJECT_ID}" ` +
        `(expected univillage-503009). Do not use old kisan2kitchen credentials.`
    );
  }

  console.log(`Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Target admin email: ${email}`);
  console.log(`New password: ${NEW_PASSWORD}`);

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Found Firebase Auth user: ${userRecord.uid}`);

    await auth.updateUser(userRecord.uid, {
      password: NEW_PASSWORD,
      displayName: userRecord.displayName || DISPLAY_NAME,
      disabled: false,
    });
    console.log('Password updated successfully.');
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;

    console.log('User not found — creating Firebase Auth user...');
    userRecord = await auth.createUser({
      email,
      password: NEW_PASSWORD,
      displayName: DISPLAY_NAME,
      emailVerified: true,
    });
    console.log(`Created Firebase Auth user: ${userRecord.uid}`);
  }

  await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || DISPLAY_NAME,
      role: 'admin',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log(`Firestore admin doc ensured: ${ADMIN_COLLECTION}/${userRecord.uid}`);
}

resetAdminPassword()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to reset admin password:', err.message || err);
    process.exit(1);
  });
```

---

## 4. Restoration Instructions

All changes are archived in:
1. `CODEBASE_STATE_AND_STASHED_CHANGES.md` (Verbatim source code blocks above)
2. `uncommitted_changes.patch` (Tracked modified files patch)

---

*Documentation updated on September 18, 2026.*
