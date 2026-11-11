//src/services/api/orderApi.ts
import api from '../api/api';
// import { getAuth } from 'firebase/auth';
import type {
  Order,
 
  // TrackingInfo,
  CreateOrderPayload,
  
  UpdateOrderStatusPayload
} from '../../types/order';



// const getAuthToken = async () => {
//   const auth = getAuth();
//   const user = auth.currentUser;
//   if (!user) throw new Error('User not authenticated');
//   return await user.getIdToken();
// };

export const orderApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    //const token = await getAuthToken();
    const response = await api.post(`/orders/create`, payload, {
      //headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // getOrders: async (): Promise<Order[]> => {
  //   const token = await getAuthToken();
  //   const response = await api.get(`/orders`, {
  //     headers: { Authorization: `Bearer ${token}` }
  //   });
  //   return response.data;
  // },

  // getAllOrders: async (): Promise<Order[]> => {
  //   const token = await getAuthToken();
  //   const response = await api.get(`/orders/getAllOrders`, {
  //     headers: { Authorization: `Bearer ${token}` }
  //   });
  //   return response.data;
  // },
  // ✅ Get All Orders (admin only)
  getAllOrdersForAdmin: async (): Promise<Order[]> => {
    //const token = await getAuthToken();
    const response = await api.get(`/orders`);
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    //const token = await getAuthToken();
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    //const token = await getAuthToken();
    await api.put(`/orders/${orderId}/cancel`, null);
  },

  // getTracking: async (orderId: string): Promise<TrackingInfo> => {
  //   //const token = await getAuthToken();
  //   const response = await api.get(`/orders/${orderId}/tracking`, {
  //     //headers: { Authorization: `Bearer ${token}` }
  //   });
  //   return response.data;
  // },

    getInvoice: async (orderId: string): Promise<{ invoiceUrl?: string; invoiceNumber?: string }> => {
    const response = await api.get(`/orders/${orderId}/invoice`);
    return response.data;
  },

  downloadInvoiceFile: async (orderId: string, invoiceUrl?: string): Promise<void> => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
      return;
    }
    const res = await api.get(`/orders/${orderId}/invoice`);
    if (res.data?.invoiceUrl) {
      window.open(res.data.invoiceUrl, '_blank');
    } else {
      const blobRes = await api.get(`/orders/${orderId}/invoice?download=true`, {
        responseType: 'blob',
      });
      const blob = new Blob([blobRes.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }
  },

updateOrderStatus: async (orderId: string, payload: UpdateOrderStatusPayload): Promise<void> => {
    //const token = await getAuthToken();
    await api.patch(`/orders/${orderId}/status`, payload);
  },

  // Function to refresh inventory data after order cancellation
  refreshInventoryAfterCancellation: async (orderId: string): Promise<void> => {
    try {
      // Get the order details to know which variants were affected
      const order = await orderApi.getOrderById(orderId);
      
      if (order.items && order.items.length > 0) {
        // Import variantApi dynamically to avoid circular dependencies
        const { default: variantApi } = await import('./variantApi');
        
        // Refresh inventory data for affected products
        for (const item of order.items) {
          if (item.product_id) {
            try {
              // Refresh variants for this product
              await variantApi.getVariantsByProductId(item.product_id);
            } catch (error) {
              console.warn(`Failed to refresh inventory for product ${item.product_id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh inventory data:', error);
    }
  }
};