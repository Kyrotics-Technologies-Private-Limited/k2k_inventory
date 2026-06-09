import type { Category } from "../../../types/category";

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const CategoryList = ({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: CategoryListProps) => {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-gray-500 shadow-md">
        No categories yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-md overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-gray-900">Categories</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                View
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                Edit
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className={`transition-colors duration-150 ${
                  selectedId === cat.id ? "bg-blue-50/70" : "hover:bg-gray-50/80"
                }`}
              >
                {/* Category: image + name + urlLinkName */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {cat.image ? (
                      <img src={cat.image} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400 flex-shrink-0">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 text-sm">{cat.name}</p>
                      <p className="truncate text-xs text-gray-500">/{cat.urlLinkName || cat.slug}</p>
                    </div>
                  </div>
                </td>
                {/* View */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSelect(cat)}
                    className="text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors"
                  >
                    View
                  </button>
                </td>
                {/* Edit */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onEdit(cat)}
                    className="text-amber-600 hover:text-amber-900 font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>
                </td>
                {/* Delete */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onDelete(cat)}
                    className="text-red-600 hover:text-red-900 font-medium text-sm transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryList;
