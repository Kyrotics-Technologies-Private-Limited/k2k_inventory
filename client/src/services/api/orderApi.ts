//src/services/api/orderApi.ts
import api from '../api/api';
import { getAuth } from 'firebase/auth';
import type {
  Order,
  OrderItem,
  TrackingInfo,
  CreateOrderPayload,
  OrderListResponse,
  UpdateOrderStatusPayload
} from '../../types/order';



const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return await user.getIdToken();
};

export const orderApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const token = await getAuthToken();
    const response = await api.post(`/orders/create`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getOrders: async (): Promise<Order[]> => {
    const token = await getAuthToken();
    const response = await api.get(`/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getAllOrders: async (): Promise<Order[]> => {
    const token = await getAuthToken();
    const response = await api.get(`/orders/getAllOrders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const token = await getAuthToken();
    const response = await api.get(`/orders/getOrder/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    const token = await getAuthToken();
    await api.put(`/orders/${orderId}/cancel`, null, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getTracking: async (orderId: string): Promise<TrackingInfo> => {
    const token = await getAuthToken();
    const response = await api.get(`/orders/${orderId}/tracking`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  updateOrderStatus: async (orderId: string, payload: UpdateOrderStatusPayload): Promise<void> => {
    const token = await getAuthToken();
    await api.put(`/orders/${orderId}/status`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};