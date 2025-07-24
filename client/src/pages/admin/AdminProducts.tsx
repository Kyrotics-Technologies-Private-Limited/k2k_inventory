import React, { Fragment, useEffect, useState } from "react";
import type { Variant } from "../../types/variant";
import type { Product } from "../../types";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import { membershipApi } from "../../services/api/membershipApi";
import { useNavigate } from "react-router-dom";
import {
  PencilIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";

interface MembershipSettings {
  discountPercentage: number;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  monthlyDuration: number;
  quarterlyDuration: number;
  yearlyDuration: number;
  updatedAt: Date;
}

const initialForm: Omit<Product, "id"> = {
  name: "",
  price: { amount: 0, currency: "INR" },
  description: "",
  origin: "",
  sku: "",
  warehouseName: "",
  category: "ghee",
  images: { main: "", gallery: [], banner: "" },
  stockStatus: "in_stock",
  ratings: 0,
  reviews: 0,
  badges: [],
  benefits: [],
};

const initialMembershipForm: MembershipSettings = {
  discountPercentage: 10,
  monthlyPrice: 299,
  quarterlyPrice: 799,
  yearlyPrice: 2499,
  monthlyDuration: 1,
  quarterlyDuration: 3,
  yearlyDuration: 12,
  updatedAt: new Date(),
};

const AdminProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<Omit<Product, "id">>(initialForm);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [membershipSettings, setMembershipSettings] =
    useState<MembershipSettings | null>(null);
  const [membershipForm, setMembershipForm] = useState<MembershipSettings>(
    initialMembershipForm
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [priceInput, setPriceInput] = useState("");
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [mainImageUploadError, setMainImageUploadError] = useState("");
  const mainImageInputRef = React.useRef<HTMLInputElement>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState("");
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const [badgeImageUploading, setBadgeImageUploading] = useState(false);
  const [badgeImageUploadError, setBadgeImageUploadError] = useState("");
  const badgeImageInputRef = React.useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const categoryDefaults: Record<
    Product["category"],
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

  useEffect(() => {
    if (!editMode && formData.category && categoryDefaults[formData.category]) {
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          banner: categoryDefaults[formData.category].banner,
        },
        badges: categoryDefaults[formData.category].badges.map((b) => ({
          text: b.text,
          image: b.image || "",
        })),
      }));
    }
  }, [formData.category, editMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [fetchedProducts, membershipData] = await Promise.all([
          productApi.getAllProducts(),
          membershipApi.getMembershipSettings(),
        ]);

        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);

        if (membershipData) {
          setMembershipSettings(membershipData);
          setMembershipForm(membershipData);
        }

      } catch (e) {
        setError("Failed to fetch data. Please try again.");
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.origin &&
            product.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.sku &&
            product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editMode && editId) {
        const updated = await productApi.updateProduct(editId, formData);
        setProducts((prev) => prev.map((p) => (p.id === editId ? updated : p)));
        setSuccess("Product updated successfully!");
      } else {
        const created = await productApi.createProduct(formData);
        setProducts((prev) => [...prev, created]);
        setSuccess("Product created successfully!");
      }
      resetForm();
      closeModal();
    } catch (err) {
      setError("Failed to save product. Please try again.");
      console.error("Product save error:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      await productApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSuccess("Product deleted successfully!");
    } catch (err) {
      setError("Failed to delete product. Please try again.");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (product: Product) => {
    setFormData({
      ...product,
      badges:
        product.badges?.map((b) => ({
          image: b.image || "",
          text: b.text || "",
        })) || [],
    });
    setEditId(product.id);
    setEditMode(true);
    setIsModalOpen(true);
    setPriceInput(product.price.amount ? String(product.price.amount) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditMode(false);
    setEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setPriceInput("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const viewVariants = (id: string) => {
    navigate(`/admin/products/${id}/variants`);
  };

  const viewDetails = (id: string) => {
    navigate(`/admin/products/${id}`);
  };

  const handleGalleryButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleGalleryFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setFormLoading(true);
    setError("");
    try {
      const urls = await productApi.uploadGalleryImages(e.target.files);
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: [...prev.images.gallery, ...urls],
        },
      }));
    } catch (err: any) {
      setError("Failed to upload images. Please try again.");
    } finally {
      setFormLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      if (isModalOpen && bannerInputRef.current)
        bannerInputRef.current.value = "";
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
      setBadgeImageUploadError(
        "Failed to upload badge images. Please try again."
      );
    } finally {
      setBadgeImageUploading(false);
      if (isModalOpen && badgeImageInputRef.current)
        badgeImageInputRef.current.value = "";
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

  const handleRemoveBanner = () => {
    setFormData((prev) => ({
      ...prev,
      images: { ...prev.images, banner: "" },
    }));
  };

  // Membership functions
  const handleMembershipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMembershipForm((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleMembershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setSuccess("");

    try {
      await membershipApi.updateMembershipSettings(membershipForm);
      const updatedSettings = await membershipApi.getMembershipSettings();
      if (updatedSettings) {
        setMembershipSettings(updatedSettings);
        setMembershipForm(updatedSettings);
      }
      setSuccess("Membership settings updated successfully!");
      setIsMembershipModalOpen(false);
    } catch (err) {
      setError("Failed to update membership settings. Please try again.");
      console.error("Membership update error:", err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={openCreateModal}
              className="button flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Product
            </button>
            <button
              onClick={() => setIsMembershipModalOpen(true)}
              className="button flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Membership
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <XMarkIcon className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
          <CheckIcon className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* Product Modal */}
      <Transition.Root show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
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
                      onClick={closeModal}
                      className="button text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="ghee">Ghee</option>
                          <option value="oils">Oils</option>
                          <option value="honey">Honey</option>
                        </select>
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
                        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
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
                        disabled={formLoading}
                        className="button mb-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {formLoading ? "Uploading..." : "Upload Images"}
                      </button>
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
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
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
                        Badges
                      </label>
                      <div className="flex space-x-2 mb-2 items-center">
                        <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
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
                            className="flex flex-col items-center relative"
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
                              className="px-2 py-1 border rounded-md text-center"
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
                    <div className="mt-6 flex justify-end space-x-3">
                      {editMode && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="button px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={formLoading}
                        className={`button px-4 py-2 rounded-md text-white flex items-center ${
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

      {/* Membership Modal */}
      <Transition.Root show={isMembershipModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsMembershipModalOpen(false)}
        >
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
                <Dialog.Panel className="relative bg-white rounded-lg px-6 pt-6 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-2xl w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Kishan Parivar Membership Settings
                    </h2>
                    <button
                      onClick={() => setIsMembershipModalOpen(false)}
                      className="button text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleMembershipSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          name="discountPercentage"
                          value={membershipForm.discountPercentage || 0}
                          onChange={handleMembershipChange}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Price (₹)
                        </label>
                        <input
                          type="number"
                          name="monthlyPrice"
                          value={membershipForm.monthlyPrice || 0}
                          onChange={handleMembershipChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quarterly Price (₹)
                        </label>
                        <input
                          type="number"
                          name="quarterlyPrice"
                          value={membershipForm.quarterlyPrice || 0}
                          onChange={handleMembershipChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Yearly Price (₹)
                        </label>
                        <input
                          type="number"
                          name="yearlyPrice"
                          value={membershipForm.yearlyPrice || 0}
                          onChange={handleMembershipChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Duration (months)
                        </label>
                        <input
                          type="number"
                          name="monthlyDuration"
                          value={membershipForm.monthlyDuration || 1}
                          onChange={handleMembershipChange}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quarterly Duration (months)
                        </label>
                        <input
                          type="number"
                          name="quarterlyDuration"
                          value={membershipForm.quarterlyDuration || 3}
                          onChange={handleMembershipChange}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Yearly Duration (months)
                        </label>
                        <input
                          type="number"
                          name="yearlyDuration"
                          value={membershipForm.yearlyDuration || 12}
                          onChange={handleMembershipChange}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsMembershipModalOpen(false)}
                        className="button px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className={`button px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition ${
                          formLoading ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                      >
                        {formLoading ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Settings"
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Product List</h2>
          {searchTerm && (
            <p className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>

        {loading ? (
          <div className="p-6 flex justify-center">
            <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchTerm ? (
              <>
                No products found matching your search. Try a different term.
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition block mx-auto"
                >
                  Clear search
                </button>
              </>
            ) : (
              "No products found. Create your first product."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {typeof product.images.main === "string" &&
                            product.images.main.trim() !== "" ? (
                              <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={product.images.main}
                                alt={product.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-200" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              <button
                                type="button"
                                onClick={() => viewDetails(product.id)}
                                className="button text-blue-600 hover:text-blue-900 mr-4"
                              >
                                {product.name}
                              </button>
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.origin}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {product.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => viewVariants(product.id)}
                          className="button inline-flex items-center px-2 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded mx-2"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Variants
                        </button>
                        <button
                          onClick={() => handleEditClick(product)}
                          className="button inline-flex items-center px-2 py-1 text-xs text-white bg-green-500 hover:bg-green-600 rounded mx-2"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="button inline-flex items-center px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductPage;
