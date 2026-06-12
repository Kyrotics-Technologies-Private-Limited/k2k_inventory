import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PlusIcon } from "@heroicons/react/24/outline";
import CategoryForm from "../../components/admin/categories/CategoryForm";
import CategoryList from "../../components/admin/categories/CategoryList";
import CategoryProductsPanel from "../../components/admin/categories/CategoryProductsPanel";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { categoryApi } from "../../services/api/categoryApi";
import type { Category, CategoryFormData } from "../../types/category";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal target states
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [disableTarget, setDisableTarget] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getAll();
      const sorted = [...data]; // Sorting logic commented out: [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCategories(sorted);
    } catch (err) {
      console.error("Failed to load categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async (data: CategoryFormData) => {
    setSaving(true);
    try {
      await categoryApi.create(data);
      await categoryApi.rebuildManifest();
      toast.success("Category created");
      setCreating(false);
      await loadCategories();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Failed to create category";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: CategoryFormData) => {
    if (!editing) return;
    setSaving(true);
    try {
      await categoryApi.update(editing.id, data);
      await categoryApi.rebuildManifest();
      toast.success("Category updated");
      setEditing(null);
      if (selected?.id === editing.id) {
        setSelected({ ...editing, ...data });
      }
      await loadCategories();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Failed to update category";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const cat = deleteTarget;
    setDeleteTarget(null);
    try {
      await categoryApi.delete(cat.id);
      await categoryApi.rebuildManifest();
      toast.success(`Category "${cat.name}" deleted successfully`);
      if (selected?.id === cat.id) setSelected(null);
      if (editing?.id === cat.id) setEditing(null);
      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  const handleDisableConfirm = async () => {
    if (!disableTarget) return;
    const cat = disableTarget;
    setDisableTarget(null);
    try {
      await categoryApi.update(cat.id, { isActive: false });
      await categoryApi.rebuildManifest();
      toast.success(`Category "${cat.name}" disabled successfully`);
      if (selected?.id === cat.id) {
        setSelected({ ...cat, isActive: false });
      }
      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to disable category");
    }
  };

  const handleDisableToggle = (category: Category) => {
    if (category.isActive !== false) {
      // Show confirmation modal to disable
      setDisableTarget(category);
    } else {
      // Enable directly without confirmation
      enableCategory(category);
    }
  };

  const enableCategory = async (cat: Category) => {
    try {
      await categoryApi.update(cat.id, { isActive: true });
      await categoryApi.rebuildManifest();
      toast.success(`Category "${cat.name}" enabled successfully`);
      if (selected?.id === cat.id) {
        setSelected({ ...cat, isActive: true });
      }
      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable category");
    }
  };

  const showForm = creating || editing;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Categories"
        description="Manage catalog categories and storefront visibility"
        actions={
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 font-medium text-sm transition-colors cursor-pointer"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            New Category
          </button>
        }
      />

      <div className="space-y-6">
        {loading ? (
          <Loader text="Loading categories..." />
        ) : (
          <CategoryList
            categories={categories}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={(cat) => {
              setEditing(cat);
              setCreating(false);
            }}
            onDisableToggle={handleDisableToggle}
            onDelete={(cat) => setDeleteTarget(cat)}
            productsPanel={
              selected ? (
                <CategoryProductsPanel category={selected} onClose={() => setSelected(null)} />
              ) : null
            }
          />
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CategoryForm
              category={editing}
              saving={saving}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Category"
        message={`Are you sure you want to permanently delete category "${deleteTarget?.name}"?\n\nThis will permanently delete the category and remove its assignment from all products. This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmationModal
        isOpen={disableTarget !== null}
        title="Disable Category"
        message={`Are you sure you want to disable category "${disableTarget?.name}"?\n\nThis will hide the category and all products belonging to it from the storefront.`}
        confirmText="Disable Category"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
};

export default CategoryManagement;
