// src/types/order.ts

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  name?: string;              // Added for frontend display
  image?: string;             // Added for frontend display
  variant_name?: string;      // Added for frontend display
}

export interface OrderAddress {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
}

export interface OrderPayment {
  id: string;
  method: 'card' | 'upi' | 'netbanking' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  transaction_id?: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface Order {
  id: string;
  userId: string;
  address_id: string;
  address?: OrderAddress;     // Expanded address details
  total_amount: number;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  status: OrderStatus;
  payment_id: string;
  payment_url?: string;      // URL for payment gateway
  items?: OrderItem[];
  created_at?: string;
  shipping_method?: string;
  payment_method?: string;
  tracking_number?: string;
}

export interface CreateOrderPayload {
  address_id: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}