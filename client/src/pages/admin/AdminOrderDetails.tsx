import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order, OrderStatus } from "../../types/order";
import { toast } from "react-toastify";
import { FiArrowLeft, FiEdit2, FiTruck } from "react-icons/fi";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  
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

  console.log("order", order);

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
      
      // Show specific message for cancellation and refresh inventory
      if (newStatus.toLowerCase() === 'cancelled') {
        toast.success("Order cancelled successfully. Inventory has been restocked.");
        // Refresh inventory data in the background
        try {
          await orderApi.refreshInventoryAfterCancellation(currentOrderId);
        } catch (error) {
          console.warn('Failed to refresh inventory data:', error);
        }
      } else {
        toast.success("Order status updated successfully");
      }
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
                <span className="ml-2 font-medium">{order.userId}</span>
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
                    <p>{order.address.street},{order.address.address}</p>
                    <p>
                      {order.address.city}, {order.address.state}{"-"}
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
        )}        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <span className="bg-blue-50 text-blue-600 p-1.5 rounded-lg mr-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </span>
              Order Items
              <span className="ml-2 text-sm text-gray-500 font-normal">({order.items.length} items)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.items?.map((item: any, idx: number) => (
                <div key={item.id || idx} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
                  <div className="flex p-4">
                    <div className="relative w-24 h-24 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm">
                        x{item.quantity}
                      </div>
                    </div>

                    <div className="ml-4 flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          {item.variant_name && (
                            <p className="text-sm text-gray-500 mt-0.5">{item.variant_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">₹{item.unit_price}</div>
                          <div className="text-sm text-gray-500 mt-0.5">per unit</div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-end">
                        <div className="text-xs text-gray-500">Item Total:</div>
                        <div className="text-base font-semibold text-blue-600">
                          ₹{item.quantity * item.unit_price}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-600">Total Item :</div>
                <div className="text-sm font-medium text-gray-900">{order.items.length}</div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-base font-medium text-gray-900">Order Total:</div>
                <div className="text-lg font-semibold text-blue-600">₹{order.total_amount}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDetailsPage;
