// src/types/order.ts

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  productId?: string;
  variant_id?: string;
  variantId?: string;
  quantity: number;
  unit_price: number;
  price?: number;
  original_price?: number;
  originalPrice?: number;
  discount?: number;
  gstPercentage?: number;
  cessRate?: number;
  created_at?: string;
  name?: string;
  productName?: string;
  image?: string;
  imageUrl?: string;
  variant_name?: string;
  weight?: string;
  hsn?: string;
}

export interface OrderAddress {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  address?: string;
  apartment?: string;
  appartment?: string;
  postal_code?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface OrderPayment {
  id: string;
  method: "card" | "upi" | "netbanking" | "wallet" | "cod" | string;
  status: "pending" | "completed" | "failed" | "refunded" | "paid" | string;
  amount: number;
  transaction_id?: string;
  created_at?: string;
}

export type OrderStatus =
  | "placed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  userId: string;
  username?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  email?: string;
  phone?: string;
  address_id?: string;
  address?: OrderAddress;
  billingAddress?: string;
  shippingAddress?: string;
  total_amount: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  shipping_fee?: number;
  status: OrderStatus;
  payment_id?: string;
  payment_url?: string;
  payment_method?: string;
  payment_status?: string;
  transaction_id?: string;
  items?: OrderItem[];
  created_at?: string;
  createdAt?: any;
  updated_at?: string;
  updatedAt?: any;
  placedDate?: string;
  processingDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  cancelledDate?: string;
  returnedDate?: string;
  processing_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  returned_at?: string;
  shipping_method?: string;
  tracking_number?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  invoiceDate?: any;
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
  tracking_number?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}
