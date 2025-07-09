import React, { Fragment, useEffect, useState } from "react";
import type { Variant } from "../../types/variant";
import type { Product } from "../../types";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import { useNavigate } from "react-router-dom";
import {
  PencilIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";

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

const initialVariantForm = {
  weight: "",
  price: 0,
  originalPrice: 0,
  discount: 0,
  inStock: true,
  units_in_stock: 0,
};

const AdminProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<Omit<Product, "id">>(initialForm);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [variantForm, setVariantForm] = useState(initialVariantForm);
  const [showVariantForm, setShowVariantForm] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [priceInput, setPriceInput] = useState(""); // New state for price input as string

  // Fetch products and their variants
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const fetchedProducts = await productApi.getAllProducts();
        setProducts(fetchedProducts);

        // Fetch variants for each product
        const variantsMap: Record<string, Variant[]> = {};
        await Promise.all(
          fetchedProducts.map(async (product) => {
            try {
              const productVariants = await variantApi.getVariantsByProductId(
                product.id
              );
              variantsMap[product.id] = productVariants;
            } catch (err) {
              console.error(
                `Error fetching variants for product ${product.id}:`,
                err
              );
              variantsMap[product.id] = [];
            }
          })
        );
        setVariants(variantsMap);
      } catch (e) {
        setError("Failed to fetch products. Please try again.");
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle form changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "amount") {
      // Update price input as string
      if (/^\d*\.?\d*$/.test(value)) {
        setPriceInput(value);
        setFormData((prev) => ({
          ...prev,
          price: { ...prev.price, amount: value === "" ? 0 : parseFloat(value) },
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle image array changes
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

  // update a single gallery URL
  const handleGalleryChange = (idx: number, url: string) => {
    setFormData((prev) => {
      const newGallery = [...prev.images.gallery];
      newGallery[idx] = url;
      return {
        ...prev,
        images: { ...prev.images, gallery: newGallery },
      };
    });
  };

  // add an empty slot
  const addGalleryImage = () => {
    setFormData((prev) => ({
      ...prev,
      images: { ...prev.images, gallery: [...prev.images.gallery, ""] },
    }));
  };

  // remove one by index
  const removeGalleryImage = (idx: number) => {
    setFormData((prev) => {
      const newGallery = prev.images.gallery.filter((_, i) => i !== idx);
      return {
        ...prev,
        images: { ...prev.images, gallery: newGallery },
      };
    });
  };

  // Handle variant form changes
  const handleVariantChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setVariantForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  };

  // Create or update product
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

  // Handle variant submission
  const handleVariantSubmit = async (productId: string) => {
    try {
      setFormLoading(true);
      setError("");
      setSuccess("");

      if (editingVariantId) {
        // Update existing variant
        const updatedVariant = await variantApi.updateVariant(
          productId,
          editingVariantId,
          { id: editingVariantId, ...variantForm, productId }
        );
        setVariants((prev) => ({
          ...prev,
          [productId]: prev[productId].map((v) =>
            v.id === editingVariantId ? updatedVariant : v
          ),
        }));
        setSuccess("Variant updated successfully!");
      } else {
        // Create new variant
        const newVariant = await variantApi.createVariant(productId, {
          ...variantForm,
          productId,
        });
        setVariants((prev) => ({
          ...prev,
          [productId]: [...(prev[productId] || []), newVariant],
        }));
        setSuccess("Variant created successfully!");
      }
      resetVariantForm();
    } catch (err) {
      console.error("Variant save error:", err);
      setError("Failed to save variant. Please try again.");
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

      // Remove variants for this product
      setVariants((prev) => {
        const newVariants = { ...prev };
        delete newVariants[id];
        return newVariants;
      });

      setSuccess("Product deleted successfully!");
    } catch (err) {
      setError("Failed to delete product. Please try again.");
      console.error("Delete error:", err);
    }
  };

  const handleVariantDelete = async (productId: string, variantId: string) => {
    if (!window.confirm("Are you sure you want to delete this variant?"))
      return;

    try {
      await variantApi.deleteVariant(productId, variantId);
      setVariants((prev) => ({
        ...prev,
        [productId]: prev[productId].filter((v) => v.id !== variantId),
      }));
      setSuccess("Variant deleted successfully!");
    } catch (err) {
      console.error("Variant delete error:", err);
      setError("Failed to delete variant. Please try again.");
    }
  };

  const handleEditClick = (product: Product) => {
    setFormData({ ...product });
    setEditId(product.id);
    setEditMode(true);
    setIsModalOpen(true); // Ensure modal opens on edit
    setPriceInput(product.price.amount ? String(product.price.amount) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVariantEditClick = (variant: Variant) => {
    setVariantForm({
      weight: variant.weight,
      price: variant.price,
      originalPrice: variant.originalPrice || 0,
      discount: variant.discount || 0,
      inStock: variant.inStock,
      units_in_stock: variant.units_in_stock || 0,
    });
    setEditingVariantId(variant.id);
    setShowVariantForm(variant.productId);
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditMode(false);
    setEditId(null);
  };

  const resetVariantForm = () => {
    setVariantForm(initialVariantForm);
    setEditingVariantId(null);
    setShowVariantForm(null);
  };

  const toggleVariantForm = (productId: string) => {
    if (showVariantForm === productId) {
      resetVariantForm();
    } else {
      setShowVariantForm(productId);
      setEditingVariantId(null);
      setVariantForm(initialVariantForm);
    }
  };

  // Open modal for new product
  const openCreateModal = () => {
    resetForm();
    setPriceInput(""); // Reset price input
    setIsModalOpen(true);
  };
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Navigate to the dedicated variants page
  const viewVariants = (id: string) => {
    navigate(`/admin/products/${id}/variants`);
  };

  const viewDetails = (id: string) => {
    navigate(`/admin/products/${id}`);
  };

  // Open file picker when upload button is clicked
  const handleGalleryButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle gallery file selection and upload immediately
  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Reset the file input value so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
        <button
          onClick={openCreateModal}
          className="button flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Product
        </button>
      </div>

      {/* Status Messages */}
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

      {/* Product Form Modal */}
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
                <Dialog.Panel className="relative bg-white rounded-lg px-6 pt-6 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-2xl w-full">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter product description"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

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
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₹)
                          </label>
                          <input
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceInput}
                            onChange={handleChange}
                            placeholder="Enter price"
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
                            value={formData.origin}
                            onChange={handleChange}
                            placeholder="Enter product origin"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Image URL
                          </label>
                          <input
                            name="images.main"
                            value={formData.images.main}
                            onChange={(e) =>
                              handleImageChange("main", e.target.value)
                            }
                            placeholder="Enter main image URL"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-4">
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
                          {formData.images.gallery.map((url, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="text"
                                value={url}
                                readOnly
                                className="flex-1 px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(idx)}
                                className="button px-2 py-1 text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU
                      </label>
                      <input
                        name="sku"
                        value={formData.sku}
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
                        value={formData.warehouseName}
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

      {/* Product List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Product List</h2>
        </div>

        {loading ? (
          <div className="p-6 flex justify-center">
            <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No products found. Create your first product.
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.images.main ? (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ₹{product.price.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => viewVariants(product.id)}
                          className="button text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Variants
                        </button>
                        {/* <button
                          onClick={() => viewDetails(product.id)}
                          className="button text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </button> */}
                        <button
                          onClick={() => handleEditClick(product)}
                          className="button text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="button text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => toggleVariantForm(product.id)}
                          className="button ml-4 text-green-600 hover:text-green-900 flex items-center"
                        >
                          {showVariantForm === product.id ? (
                            <ChevronUpIcon className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 mr-1" />
                          )}
                          Add Variants
                        </button>
                      </td>
                    </tr>

                    {/* Quick Variants section (optional in-page view) */}
                    {showVariantForm === product.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="mb-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {editingVariantId
                                ? "Edit Variant"
                                : "Add New Variant"}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Weight
                                </label>
                                <input
                                  name="weight"
                                  value={variantForm.weight}
                                  onChange={handleVariantChange}
                                  placeholder="e.g., 500g, 1kg"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price (₹)
                                </label>
                                <input
                                  name="price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variantForm.price}
                                  onChange={handleVariantChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Original Price (₹)
                                </label>
                                <input
                                  name="originalPrice"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variantForm.originalPrice}
                                  onChange={handleVariantChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Discount (%)
                                </label>
                                <input
                                  name="discount"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={variantForm.discount}
                                  onChange={handleVariantChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Units in Stock
                                </label>
                                <input
                                  type="number"
                                  name="units_in_stock"
                                  value={variantForm.units_in_stock || 0}
                                  onChange={handleVariantChange}
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>
                              <div className="flex items-center">
                                <input
                                  name="inStock"
                                  type="checkbox"
                                  checked={variantForm.inStock}
                                  onChange={handleVariantChange}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700">
                                  In Stock
                                </label>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={resetVariantForm}
                                className="button px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVariantSubmit(product.id)}
                                disabled={formLoading}
                                className={`button px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition ${
                                  formLoading
                                    ? "opacity-75 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {formLoading ? (
                                  <ArrowPathIcon className="w-4 h-4 animate-spin inline mr-1" />
                                ) : null}
                                {editingVariantId ? "Update" : "Add"} Variant
                              </button>
                            </div>
                          </div>

                          {/* Variants list */}
                          {variants[product.id]?.length > 0 ? (
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                                      Weight
                                    </th>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                      Price
                                    </th>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                      Original Price
                                    </th>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                      Discount
                                    </th>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                      Stock
                                    </th>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                      Units in Stock
                                    </th>
                                    <th className="relative py-3 pl-3 pr-4 text-right text-sm font-semibold text-gray-900">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                  {variants[product.id].map((variant) => (
                                    <tr key={variant.id}>
                                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                        {variant.weight}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        ₹{variant.price.toFixed(2)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {variant.originalPrice
                                          ? `₹${variant.originalPrice.toFixed(
                                              2
                                            )}`
                                          : "-"}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {variant.discount
                                          ? `${variant.discount}%`
                                          : "-"}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            variant.inStock
                                              ? "bg-green-100 text-green-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {variant.inStock
                                            ? "In Stock"
                                            : "Out of Stock"}
                                        </span>
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-semibold">
                                        {variant.units_in_stock}
                                      </td>
                                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                                        <button
                                          onClick={() =>
                                            handleVariantEditClick(variant)
                                          }
                                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleVariantDelete(
                                              product.id,
                                              variant.id
                                            )
                                          }
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No variants added yet.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
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
