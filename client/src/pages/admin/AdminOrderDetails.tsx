import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order, OrderStatus } from "../../types/order";
import { toast } from "react-toastify";
import { FiArrowLeft, FiEdit2, FiTruck } from "react-icons/fi";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const AdminOrderDetailsPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    // First effect to handle authentication
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecked(true);
      if (!user) {
        setLoading(false);
        setError("Please log in to view order details");
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Second effect to handle order fetching after auth is checked
    const fetchOrder = async () => {
      if (!isAuthChecked) return; // Wait for auth check
      if (!auth.currentUser) return; // Make sure we have a user

      const orderId = params.orderId || params.id;
      if (!orderId) {
        setLoading(false);
        setError("Order ID is missing from URL parameters");
        return;
      }

      setCurrentOrderId(orderId);
      await fetchOrderDetails(orderId);
    };

    fetchOrder();
  }, [params, isAuthChecked]);

  const fetchOrderDetails = async (id: string) => {
    if (!auth.currentUser) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching order details for ID:", id);

      const orderData = await orderApi.getOrderById(id);
      console.log("Received order data:", orderData);

      if (!orderData) {
        throw new Error("Order not found");
      }

      // Normalize the status to lowercase if it comes in different case
      const normalizedOrder: Order = {
        ...orderData,
        status: (orderData.status?.toLowerCase() || "pending") as OrderStatus,
      };
      setOrder(normalizedOrder);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      setError(err.message || "Failed to fetch order details");
      toast.error(err.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!currentOrderId || !auth.currentUser) {
      toast.error(
        "Cannot update status: Missing order ID or not authenticated"
      );
      return;
    }

    try {
      setLoading(true);
      await orderApi.updateOrderStatus(currentOrderId, { status: newStatus });
      await fetchOrderDetails(currentOrderId);
      setIsUpdateModalOpen(false);
      toast.success("Order status updated successfully");
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      toast.error(err.message || "Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: OrderStatus) => {
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

  // Show loading spinner while waiting for initial load
  if (loading && !error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error || "Order not found"}
              </p>
              <p className="text-sm text-red-600 mt-1">
                ID: {currentOrderId || "Not available"}
              </p>
            </div>
          </div>
          {currentOrderId && (
            <button
              onClick={() => fetchOrderDetails(currentOrderId)}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => navigate("/admin/orders")}
            className="mt-4 ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Back to Orders
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
          disabled={loading}
        >
          <FiArrowLeft className="mr-2" /> Back to Orders
        </button>
        {!["delivered", "cancelled"].includes(order.status) && (
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            className="button flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            <FiEdit2 className="mr-2" /> Update Status
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Order Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order #{order.id}</h1>
              <p className="text-gray-500">
                Placed on{" "}
                {new Date(order.created_at || Date.now()).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                order.status
              )}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
                <span className="ml-2 font-medium">
                  {order.payment_method || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Shipping Information</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div>
                <span className="text-gray-500">Shipping Method:</span>
                <span className="ml-2 font-medium">
                  {order.shipping_method || "Standard"}
                </span>
              </div>
              {order.address && (
                <>
                  <div className="text-sm">
                    <p className="font-medium">
                      {order.address.first_name} {order.address.last_name}
                    </p>
                    <p>{order.address.street}</p>
                    <p>
                      {order.address.city}, {order.address.state}{" "}
                      {order.address.postal_code}
                    </p>
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

        {/* Status Update Modal */}
        {isUpdateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Update Order Status</h3>
              <div className="space-y-4">
                {ORDER_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    className={`w-full p-2 rounded ${
                      status === order.status
                        ? "bg-blue-100 text-blue-800"
                        : "hover:bg-gray-100"
                    }`}
                    disabled={loading || status === order.status}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="mt-4 w-full p-2 bg-gray-100 rounded hover:bg-gray-200"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">Order Items</h2>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-10 w-10 object-cover rounded"
                            />
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            {item.variant_name && (
                              <div className="text-sm text-gray-500">
                                {item.variant_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        ₹{item.unit_price}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        ₹{item.quantity * item.unit_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDetailsPage;
