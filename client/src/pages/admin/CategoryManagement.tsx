import React, { Fragment, useEffect, useState } from "react";
import { categoryApi, type Category } from "../../services/api/categoryApi";
import {
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
    ArrowPathIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";


const foodCategories = [
    "Dairy", "Spices", "Grains", "Oils", "Beverages", "Snacks", "Sweets",
    "Fruits", "Vegetables", "Bakery", "Meat", "Seafood", "Honey",
    "Dry Fruits", "Ready to Eat"
];

const initialForm: Partial<Category> = {
    name: "",
    key: "",
};

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Category>>(initialForm);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await categoryApi.getAllCategories();
            setCategories(data);
        } catch (err) {
            setError("Failed to load categories.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        setSuccess("");

        try {
            if (editMode && editId) {
                const updated = await categoryApi.updateCategory(editId, formData);
                setCategories((prev) =>
                    prev.map((c) => (c.id === editId ? updated : c))
                );
                setSuccess("Category updated successfully!");
            } else {
                const created = await categoryApi.createCategory(formData);
                setCategories((prev) => [...prev, created]);
                setSuccess("Category created successfully!");
            }
            closeModal();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to save category.");
            console.error(err);
        } finally {
            setFormLoading(false);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
            await categoryApi.deleteCategory(deleteId);
            setCategories((prev) => prev.filter((c) => c.id !== deleteId));
            setSuccess("Category deleted successfully!");
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to delete category.");
            console.error(err);
        } finally {
            closeDeleteModal();
        }
    };

    const openCreateModal = () => {
        setFormData(initialForm);
        setEditMode(false);
        setEditId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setFormData({
            name: category.name,
            key: category.key
        });
        setEditId(category.id);
        setEditMode(true);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setError("");
        setSuccess("");
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Category Management</h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Category
                </button>
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

            {loading ? (
                <div className="p-6 flex justify-center">
                    <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Key
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {category.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {category.key}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(category)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(category.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        No categories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
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
                                            {editMode ? "Edit Category" : "Add New Category"}
                                        </h2>
                                        <button
                                            onClick={closeModal}
                                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Category Name
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                list="food-categories"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Select or enter category name"
                                                required
                                                autoComplete="off"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <datalist id="food-categories">
                                                {foodCategories.map((category) => (
                                                    <option key={category} value={category} />
                                                ))}
                                            </datalist>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Choose from the list or type a new one.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Key (Unique Identifier)
                                            </label>
                                            <input
                                                type="text"
                                                name="key"
                                                value={formData.key}
                                                onChange={handleChange}
                                                placeholder="e.g. ghee, oils"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name.</p>
                                        </div>



                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={closeModal}
                                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={formLoading}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center disabled:opacity-50"
                                            >
                                                {formLoading && <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />}
                                                {editMode ? "Update" : "Create"}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

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
                                <Dialog.Panel className="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg w-full sm:p-6">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                                Delete Category
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Are you sure you want to delete this category? This action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={confirmDelete}
                                        >
                                            Delete
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                            onClick={closeDeleteModal}
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

export default CategoryManagement;
