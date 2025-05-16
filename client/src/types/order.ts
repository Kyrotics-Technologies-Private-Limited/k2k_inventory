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

export interface Order {
  id: string;
  user_id: string;
  address_id: string;
  address?: OrderAddress;     // Expanded address details
  total_amount: number;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment_id: string;
  payment_url?: string; // URL for payment gateway
  payment?: OrderPayment;     // Expanded payment details
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
  tracking_number?: string;
}

export interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  description?: string;
}

export interface TrackingInfo {
  order_id: string;
  tracking_number: string;
  carrier?: string;
  estimated_delivery?: string;
  status: string;
  history: TrackingEvent[];
}

// For API responses
export interface CreateOrderResponse {
  order: Order;
  payment_url?: string; // For redirecting to payment gateway
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

// For order creation payload
export interface CreateOrderPayload {
  address_id: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
  payment_method?: string;
}

// For order status update payload
export interface UpdateOrderStatusPayload {
  status: Order['status'];
  notify_customer?: boolean;
}

// For order cancellation payload
export interface CancelOrderPayload {
  reason?: string;
}

// Add this export if it doesn't exist
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";