import type { Category } from "../../../types/category";
import { FolderIcon, EyeIcon, PencilIcon, TrashIcon, EyeSlashIcon, CheckIcon } from "@heroicons/react/24/outline";

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDisableToggle: (category: Category) => void;
  onDelete: (category: Category) => void;
  productsPanel?: React.ReactNode;
}

const CategoryList = ({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onDisableToggle,
  onDelete,
  productsPanel,
}: CategoryListProps) => {
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border border-gray-200">
        No categories yet. Create one to get started.
      </div>
    );
  }

  const activeCategories = categories.filter((cat) => cat.isActive !== false);
  const disabledCategories = categories.filter((cat) => cat.isActive === false);

  return (
    <div className="space-y-4">
      {/* Active Categories Table */}
      {activeCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden w-full">
          <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
            <colgroup>
              <col className="w-[55%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeCategories.map((cat) => (
                <tr
                  key={cat.id}
                  className={`transition-colors duration-150 ${
                    selectedId === cat.id ? "bg-blue-50/70" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <FolderIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {cat.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          /{cat.urlLinkName || cat.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onSelect(cat)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-all duration-200 cursor-pointer"
                        title="View Products"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(cat)}
                        className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 hover:text-yellow-700 rounded-full transition-all duration-200 cursor-pointer"
                        title="Edit Category"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDisableToggle(cat)}
                        className="p-2 rounded-full transition-all duration-200 cursor-pointer text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700"
                        title="Disable Category"
                      >
                        <EyeSlashIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(cat)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-full transition-all duration-200 cursor-pointer"
                        title="Delete Category"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productsPanel}

      {/* Disabled Categories Table */}
      {disabledCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden w-full">
          <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
            <colgroup>
              <col className="w-[55%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disabledCategories.map((cat) => (
                <tr
                  key={cat.id}
                  className={`bg-gray-50/50 hover:bg-gray-100/50 text-gray-500 opacity-70 border-l-4 border-l-gray-300 transition-colors duration-150 ${
                    selectedId === cat.id ? "bg-blue-50/40" : ""
                  }`}
                  title="This category is disabled. To edit, view products, or perform actions, you must enable this category first by clicking the check icon."
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt=""
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <FolderIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-400 line-through">
                          {cat.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          /{cat.urlLinkName || cat.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      Disabled
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        disabled
                        className="p-2 text-gray-400 bg-gray-50 rounded-full cursor-not-allowed opacity-50"
                        title="To view products, you must enable this category first."
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        disabled
                        className="p-2 text-gray-400 bg-gray-50 rounded-full cursor-not-allowed opacity-50"
                        title="To edit this category, you must enable it first."
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDisableToggle(cat)}
                        className="p-2 rounded-full transition-all duration-200 cursor-pointer text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700"
                        title="Enable Category"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        disabled
                        className="p-2 text-gray-400 bg-gray-50 rounded-full cursor-not-allowed opacity-50"
                        title="To delete this category, you must enable it first."
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoryList;
