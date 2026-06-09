import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PlusIcon } from "@heroicons/react/24/outline";
import CategoryForm from "../../components/admin/categories/CategoryForm";
import CategoryList from "../../components/admin/categories/CategoryList";
import CategoryProductsPanel from "../../components/admin/categories/CategoryProductsPanel";
import { categoryApi } from "../../services/api/categoryApi";
import type { Category, CategoryFormData } from "../../types/category";

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getAll();
      const sorted = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to create category");
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Deactivate "${category.name}"? Products will keep their assignments.`)) return;
    try {
      await categoryApi.delete(category.id);
      await categoryApi.rebuildManifest();
      toast.success("Category deactivated");
      if (selected?.id === category.id) setSelected(null);
      if (editing?.id === category.id) setEditing(null);
      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };


  const showForm = creating || editing;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Manage catalog categories and storefront visibility</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          New Category
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : (
            <CategoryList
              categories={categories.filter((c) => c.isActive !== false)}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onEdit={(cat) => {
                setEditing(cat);
                setCreating(false);
              }}
              onDelete={handleDelete}
            />
          )}
        </div>
        <div>
          {selected ? (
            <CategoryProductsPanel category={selected} />
          ) : (
            <div className="rounded-lg border bg-white p-6 text-center text-gray-500 shadow-md">
              Select a category to see its products
            </div>
          )}
        </div>
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
    </div>
  );
};

export default CategoryManagement;
