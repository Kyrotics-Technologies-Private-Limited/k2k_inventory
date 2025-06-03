// // src/services/api/cartApi.ts
// import api from 'api';
// import { CartItem, Cart, CartSummary } from '../../types/cart';
// import { getAuth } from 'firebase/auth';

// const API_BASE = import.meta.env.VITE_API_BASE_URL;

// const getAuthToken = async () => {
//   const auth = getAuth();
//   const user = auth.currentUser;
//   if (!user) throw new Error('User not authenticated');
//   return await user.getIdToken();
// };

// export const cartApi = {
//   getCart: async (): Promise<{ cart: Cart }> => {
//     const token = await getAuthToken();
//     const response = await api.get(`/cart`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     return response.data;
//   },

//   getCartSummary: async (): Promise<CartSummary> => {
//     const token = await getAuthToken();
//     const response = await api.get(`/cart/summary`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     return response.data;
//   },

//   addItem: async (productId: string, variantId?: string, quantity = 1): Promise<CartItem> => {
//     const token = await getAuthToken();
//     const response = await api.post(`/cart/items`, {
//       product_id: productId,
//       variant_id: variantId,
//       quantity
//     }, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     return response.data;
//   },

//   updateItem: async (itemId: string, quantity: number): Promise<CartItem> => {
//     const token = await getAuthToken();
//     const response = await api.put(`/cart/items/${itemId}`, {
//       quantity
//     }, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     return response.data;
//   },

//   removeItem: async (itemId: string): Promise<void> => {
//     const token = await getAuthToken();
//     await api.delete(`/cart/items/${itemId}`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//   },

//   clearCart: async (): Promise<void> => {
//     const token = await getAuthToken();
//     await api.delete(`/cart/items`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//   }
// };

// src/services/api/cartApi.ts

import api from "./api";
import type { CartItem, Cart } from "../../types/cart";
import { getAuth } from "firebase/auth";

const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return await user.getIdToken();
};

export const cartApi = {
  // Create a new cart
  createCart: async (): Promise<Cart> => {
    const token = await getAuthToken();
    const response = await api.post(
      `/carts/create`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get all carts (admin function)
  getAllCarts: async (): Promise<Cart[]> => {
    const token = await getAuthToken();
    const response = await api.get(`/carts/get`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Get cart by ID
  getCartById: async (cartId: string): Promise<Cart> => {
    const token = await getAuthToken();
    const response = await api.get(`/carts/${cartId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Get cart by user ID (current user)
  getUserCart: async (): Promise<Cart> => {
    const token = await getAuthToken();
    const response = await api.get(`/carts/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Update cart
  updateCart: async (cartId: string): Promise<Cart> => {
    const token = await getAuthToken();
    const response = await api.put(
      `/carts/${cartId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Delete cart
  deleteCart: async (cartId: string): Promise<void> => {
    const token = await getAuthToken();
    await api.delete(`/carts/${cartId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Get cart items
  getCartItems: async (cartId: string): Promise<CartItem[]> => {
    const token = await getAuthToken();
    const response = await api.get(`/carts/${cartId}/get`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Add an item to cart
  addCartItem: async (
    cartId: string,
    itemData: Partial<CartItem>
  ): Promise<CartItem> => {
    try {
      const token = await getAuthToken();
      
      // let cartId = localStorage.getItem('user_cart_id');
  
      if (!cartId) {
        const cart = await cartApi.getUserCart();
        cartId = cart.id;
        localStorage.setItem('user_cart_id', cartId);
      }
      console.log('cartId', cartId);

      const response = await api.post(
        `/carts/${cartId}/items`,
        itemData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      console.log('created cart item succesfullyresponse', response);
      return response.data;
  
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw new Error("Failed to add item to cart.");
    }
  },
  
  // Update cart item
  updateCartItem: async (
    cartId: string,
    itemId: string,
    itemData: Partial<CartItem>
  ): Promise<CartItem> => {
    const token = await getAuthToken();
    const response = await api.put(
      `/carts/${cartId}/items/${itemId}`,
      itemData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Remove cart item
  removeCartItem: async (cartId: string, itemId: string): Promise<void> => {
    const token = await getAuthToken();
    await api.delete(`/carts/${cartId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
