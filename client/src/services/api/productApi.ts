import api from "./api";
import type { Product } from "../../types/index"; // adjust this path based on your project structure

// const BASE_URL = "http://localhost:5566/api/products";

export const productApi = {
  // CREATE a new product
  createProduct: async (product: Omit<Product, "id">) => {
    const response = await api.post(`/products/create`, product);
    return response.data as Product;
  },

  // GET all products
  getAllProducts: async (): Promise<Product[]> => {
    const response = await api.get(`/products`);
    return response.data;
  },

  // GET single product by ID
  getProductById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // UPDATE product
  updateProduct: async (
    id: string,
    updatedProduct: Partial<Omit<Product, "id">>
  ): Promise<Product> => {
    const response = await api.put(`/products/${id}`, updatedProduct);
    return response.data;
  },

  // DELETE product
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  fetchProducts: async () => {
    const response = await api.get(`/products`);
    return response.data; // Assuming the products are in response.data
  },

  // UPLOAD gallery images
  uploadGalleryImages: async (files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("gallery", file);
    });
    const response = await api.post(`/products/upload-gallery`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.urls as string[];
  },

  // UPLOAD main image
  uploadMainImage: async (file: File) => {
    const formData = new FormData();
    formData.append("mainImage", file);
    const response = await api.post(`/products/upload-main-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url as string;
  },

  // UPLOAD badge image
  uploadBadgeImage: async (file: File) => {
    const formData = new FormData();
    formData.append("badgeImage", file);
    const response = await api.post(`/products/upload-badge-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url as string;
  },

  // UPLOAD multiple badge images
  uploadMultipleBadgeImages: async (files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("badgeImages", file);
    });
    const response = await api.post(`/products/upload-multiple-badge-images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.urls as string[];
  },
};