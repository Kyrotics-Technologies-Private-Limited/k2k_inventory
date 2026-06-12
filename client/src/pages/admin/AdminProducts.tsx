import React, { Fragment, useEffect, useState } from "react";
import type { Product } from "../../types";
import { productApi } from "../../services/api/productApi";
import { categoryApi, type Category } from "../../services/api/categoryApi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchDashboardStats, type outOfStockVariants } from "../../services/api/dashApi";
import { Dialog, Transition } from "@headlessui/react";
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Import Shared Components
import Loader from "../../components/common/Loader";
import SearchBar from "../../components/common/SearchBar";
import PageHeader from "../../components/common/PageHeader";

// Import Product Subcomponents
import ProductList from "../../components/admin/products/ProductList";
import ProductFormModal from "../../components/admin/products/ProductFormModal";
import ErrorBoundary from "../../components/common/ErrorBoundary";

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

const AdminProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outOfStockVariants, setOutOfStockVariants] = useState<outOfStockVariants[]>([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<Omit<Product, "id">>(initialForm);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortProductsByRank = (productList: Product[]) => {
    return [...productList].sort((a, b) => {
      const rankA = a.rank !== undefined && a.rank !== null ? a.rank : 999999;
      const rankB = b.rank !== undefined && b.rank !== null ? b.rank : 999999;
      return rankA - rankB;
    });
  };

  // Load Categories on startup
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryApi.getAllCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    loadCategories();
  }, []);

  // Fetch Products and Dashboard Stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [fetchedProducts, dashboardStats] = await Promise.all([
          productApi.getAllProducts(),
          fetchDashboardStats(),
        ]);

        const sorted = sortProductsByRank(fetchedProducts);
        setProducts(sorted);
        setFilteredProducts(sorted);
        setOutOfStockVariants(dashboardStats.outOfStockVariants || []);
      } catch (e) {
        setError("Failed to fetch data. Please try again.");
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Route check from Dashboard navigation
  useEffect(() => {
    const fromDashboard = searchParams.get('fromDashboard');
    if (fromDashboard === 'true' && outOfStockVariants.length > 0) {
      navigate('/admin/out-of-stock');
    }
  }, [searchParams, outOfStockVariants, navigate]);

  // Client-side Product filter
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = products.filter(
        (product) =>
          (product.name && product.name.toLowerCase().includes(lowerSearch)) ||
          (product.categories && product.categories.some(cat => cat.toLowerCase().includes(lowerSearch))) ||
          (product.category && product.category.toLowerCase().includes(lowerSearch)) ||
          (product.origin && product.origin.toLowerCase().includes(lowerSearch)) ||
          (product.sku && product.sku.toLowerCase().includes(lowerSearch))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Form Submit (Create or Edit)
  const handleSubmit = async (submitData: Omit<Product, "id">) => {
    setFormLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editMode && editId) {
        const updated = await productApi.updateProduct(editId, submitData);
        setProducts((prev) => sortProductsByRank(prev.map((p) => (p.id === editId ? updated : p))));
        setSuccess("Product updated successfully!");
      } else {
        const created = await productApi.createProduct(submitData);
        setProducts((prev) => sortProductsByRank([...prev, created]));
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

  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await productApi.deleteProduct(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setSuccess("Product deleted successfully!");
    } catch (err) {
      setError("Failed to delete product. Please try again.");
      console.error("Delete error:", err);
    } finally {
      closeDeleteModal();
    }
  };

  const handleEditClick = (product: Product) => {
    setFormData({
      ...product,
      categoryIds: product.categoryIds || (product.categoryId ? [product.categoryId] : []),
      status: product.status || "active",
      badges: product.badges?.map((b) => ({ image: b.image || "", text: b.text || "" })) || [],
      healthBadges: product.healthBadges?.map((b) => ({ image: b.image || "", title: b.title || "", description: b.description || "" })) || [],
    });
    setEditId(product.id);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditMode(false);
    setEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
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

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Page Header */}
      <PageHeader
        title="Product Management"
        actions={
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <SearchBar
              placeholder="Search products..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="md:w-64"
            />
            <button
              onClick={openCreateModal}
              className="button flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Product
            </button>
          </div>
        }
      />

      {/* Feedback Alerts */}
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

      {/* Out of Stock Alert Banner */}
      {outOfStockVariants.length > 0 && (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => navigate('/admin/out-of-stock')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="mr-3 text-red-600 w-5 h-5" />
              <div>
                <div className="font-bold">⚠️ Stock Alert</div>
                <div className="text-sm">
                  {outOfStockVariants.length} variant{outOfStockVariants.length > 1 ? 's' : ''} out of stock
                </div>
              </div>
            </div>
            <span className="text-red-600 hover:text-red-800 font-semibold text-sm">
              View Details →
            </span>
          </div>
        </div>
      )}

      {/* Main Content (List/Grid) */}
      {loading ? (
        <Loader text="Loading products catalog..." />
      ) : (
        <ErrorBoundary>
          <ProductList
            products={filteredProducts}
            categories={categories}
            onEdit={handleEditClick}
            onDelete={openDeleteModal}
            onViewVariants={viewVariants}
            onViewDetails={viewDetails}
          />
        </ErrorBoundary>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editMode={editMode}
        editId={editId}
        categories={categories}
        initialData={formData}
        onSubmit={handleSubmit}
        formLoading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <Transition.Root show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeDeleteModal}>
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
                <Dialog.Panel className="relative bg-white rounded-lg p-6 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg w-full">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                        Delete Product
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete this product? This action cannot be undone and will remove the product catalog details.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default AdminProductPage;
