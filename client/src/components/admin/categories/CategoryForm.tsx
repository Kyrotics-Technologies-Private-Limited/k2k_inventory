import { useEffect, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../services/firebase/firebase";
import type { Category, CategoryFormData } from "../../../types/category";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";

function nameToUrlLinkName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const defaultForm: CategoryFormData = {
  name: "",
  urlLinkName: "",
  image: "",
  showInMenu: true,
  showOnHomepage: true,
  showInFooter: true,
  isFeatured: true,
  rank: undefined,
};

interface CategoryFormProps {
  category: Category | null;
  saving: boolean;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

const CategoryForm = ({ category, saving, onSubmit, onCancel }: CategoryFormProps) => {
  const [form, setForm] = useState<CategoryFormData>(defaultForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        urlLinkName: category.urlLinkName || category.slug || "",
        image: category.image || "",
        sortOrder: category.sortOrder,
        showInMenu: category.showInMenu ?? false,
        showOnHomepage: category.showOnHomepage ?? false,
        showInFooter: category.showInFooter ?? false,
        isFeatured: category.isFeatured ?? false,
        rank: category.rank,
      });
    } else {
      setForm(defaultForm);
    }
  }, [category]);

  const updateField = <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name") {
        next.urlLinkName = nameToUrlLinkName(String(value));
      }
      return next;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const urlLinkNamePart = form.urlLinkName || nameToUrlLinkName(form.name) || "category";
      const storageRef = ref(storage, `categories/${urlLinkNamePart}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateField("image", url);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4 rounded-lg border bg-white p-6 shadow-md animate-fadeIn"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {category ? "Edit Category" : "Create Category"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Category Image</label>
        <div className="space-y-3">
          <input
            type="text"
            value={form.image || ""}
            onChange={(e) => updateField("image", e.target.value)}
            placeholder="Enter image URL or upload below"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors text-sm font-semibold shadow-sm">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Image"
              )}
            </label>
            {form.image && (
              <div className="relative group h-20 w-20 rounded border border-gray-200 overflow-hidden bg-gray-50">
                <img
                  src={form.image}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => updateField("image", "")}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
      {category && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sort order</label>
          <input
            type="number"
            value={form.sortOrder ?? ""}
            onChange={(e) => updateField("sortOrder", Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Display Rank (Storefront Dropdown Position)</label>
        <input
          type="number"
          value={form.rank ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            updateField("rank", val !== "" ? Number(val) : undefined);
          }}
          placeholder="e.g. 1 (lower numbers show first)"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      */}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
          {category ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
