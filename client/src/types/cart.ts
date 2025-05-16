// Add to your types or cartApi.ts
export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
}

export interface CartSummary {
  cartId: string;
  total_items: number;
  total: number;
  updated_at: string;
}
