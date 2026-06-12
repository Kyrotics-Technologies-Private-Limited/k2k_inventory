import api from "./api";
import type {
  Category,
  CategoryFormData,
  CategoryProduct,
  ProductReorderItem,
  ReorderItem,
} from "../../types/category";

export const categoryApi = {
  getAll: async (params?: {
    active?: boolean;
    showInMenu?: boolean;
    tree?: boolean;
  }): Promise<Category[]> => {
    const response = await api.get<Category[]>("/categories", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await api.post<Category>("/categories", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<CategoryFormData> & { isActive?: boolean; parentCategoryId?: string | null }
  ): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  reorder: async (items: ReorderItem[]): Promise<{ message: string; count: number }> => {
    const response = await api.put("/categories/reorder", items);
    return response.data;
  },

  getProducts: async (categoryId: string): Promise<CategoryProduct[]> => {
    const response = await api.get<CategoryProduct[]>(`/categories/${categoryId}/products`);
    return response.data;
  },

  assignProduct: async (
    categoryId: string,
    productId: string,
    opts?: { isFeatured?: boolean }
  ): Promise<unknown> => {
    const response = await api.post(`/categories/${categoryId}/products`, {
      productId,
      ...opts,
    });
    return response.data;
  },

  removeProduct: async (
    categoryId: string,
    productId: string
  ): Promise<{ removed: boolean }> => {
    const response = await api.delete(`/categories/${categoryId}/products/${productId}`);
    return response.data;
  },

  reorderProducts: async (
    categoryId: string,
    items: ProductReorderItem[]
  ): Promise<{ message: string }> => {
    const response = await api.put(`/categories/${categoryId}/products/reorder`, items);
    return response.data;
  },

  patchMembership: async (
    categoryId: string,
    productId: string,
    data: { isFeatured?: boolean; sortOrder?: number }
  ): Promise<unknown> => {
    const response = await api.patch(
      `/categories/${categoryId}/products/${productId}`,
      data
    );
    return response.data;
  },

  rebuildManifest: async (): Promise<unknown> => {
    const response = await api.post("/catalog/manifest/rebuild");
    return response.data;
  },

  /** @deprecated Use getAll — kept for existing admin pages */
  getAllCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>("/categories");
    return response.data;
  },
};

export type { Category };
