import axios from "axios";

// Define the API URL based on environment or default to local
const API_URL = "http://localhost:5567/api/categories";

export interface Category {
    id: string;
    name: string;
    key: string;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const categoryApi = {
    // Get all categories
    getAllCategories: async (): Promise<Category[]> => {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error("Error fetching categories:", error);
            throw error;
        }
    },

    // Create a new category
    createCategory: async (categoryData: Partial<Category>): Promise<Category> => {
        try {
            const response = await axios.post(`${API_URL}/create`, categoryData);
            return response.data;
        } catch (error) {
            console.error("Error creating category:", error);
            throw error;
        }
    },

    // Update a category
    updateCategory: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
        try {
            const response = await axios.put(`${API_URL}/${id}`, categoryData);
            return response.data;
        } catch (error) {
            console.error("Error updating category:", error);
            throw error;
        }
    },

    // Delete a category
    deleteCategory: async (id: string): Promise<void> => {
        try {
            await axios.delete(`${API_URL}/${id}`);
        } catch (error) {
            console.error("Error deleting category:", error);
            throw error;
        }
    }
};
