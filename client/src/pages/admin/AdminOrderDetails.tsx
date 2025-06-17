import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { toast } from "react-toastify";
import { FiArrowLeft, FiEdit2, FiTruck } from "react-icons/fi";

const AdminOrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderApi.getOrderById(id);
      setOrder(orderData);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      setError(err.message || "Failed to fetch order details");
      toast.error(err.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!orderId) return;

    try {
      await orderApi.adminUpdateOrderStatus(orderId, { status });
      await fetchOrderDetails(orderId);
      setIsUpdateModalOpen(false);
      toast.success("Order status updated successfully");
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      toast.error(err.message || "Failed to update order status");
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || "Order not found"}</p>
            </div>
          </div>
          <button 
            onClick={() => orderId && fetchOrderDetails(orderId)}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/admin/orders")}
          className="button flex items-center text-gray-600 hover:text-blue-700"
        >
          <FiArrowLeft className="mr-2" /> Back to Orders
        </button>
        <button
          onClick={() => setIsUpdateModalOpen(true)}
          className="button flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiEdit2 className="mr-2" /> Update Status
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Order Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order #{order.id}</h1>
              <p className="text-gray-500">Placed on {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}
            >
              {order.status}
            </span>
          </div>
          {order.tracking_number && (
            <div className="flex items-center text-sm text-gray-600 mt-2">
              <FiTruck className="mr-2" />
              <span>Tracking Number: {order.tracking_number}</span>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Order Information</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div>
                <span className="text-gray-500">Order Total:</span>
                <span className="ml-2 font-medium">₹{order.total_amount}</span>
              </div>
              <div>
                <span className="text-gray-500">User ID:</span>
                <span className="ml-2 font-medium">{order.user_id}</span>
              </div>
              <div>
                <span className="text-gray-500">Payment Method:</span>
                <span className="ml-2 font-medium">{order.payment_method}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-medium mb-4">Shipping Information</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div>
                <span className="text-gray-500">Shipping Method:</span>
                <span className="ml-2 font-medium">{order.shipping_method}</span>
              </div>
              {order.address && (
                <>
                  <div className="text-sm">
                    <p className="font-medium">{order.address.first_name} {order.address.last_name}</p>
                    <p>{order.address.street}</p>
                    <p>{order.address.city}, {order.address.state} {order.address.postal_code}</p>
                    <p>{order.address.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="text-sm">{order.address.phone}</p>
                    <p className="text-sm">{order.address.email}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">Order Items</h2>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.name || item.product_id}</div>
                        {item.variant_name && (
                          <div className="text-sm text-gray-500">{item.variant_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">₹{item.unit_price}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Order Status</h3>
              <div className="space-y-2">
                {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    className={`button w-full p-3 text-left rounded-lg transition-colors ${
                      order.status.toLowerCase() === status
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    disabled={status === "cancelled" && order.status.toLowerCase() === "delivered"}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="button px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetailsPage;