// src/pages/admin/AdminOrdersPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { toast } from "react-toastify";
import { FiEye } from "react-icons/fi";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

// Helper functions for date and time formatting
// const formatDate = (timestamp: any) => {
//   if (!timestamp) return "-";
//   try {
//     // Handle Firestore Timestamp
//     if (timestamp?.seconds) {
//       const date = new Date(timestamp.seconds * 1000);
//       return date.toLocaleDateString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       });
//     }
//     // Handle regular date string
//     const date = new Date(timestamp);
//     if (isNaN(date.getTime())) return "-";
//     return date.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   } catch (error) {
//     console.error("Error formatting date:", error);
//     return "-";
//   }
// };

// const formatTime = (timestamp: any) => {
//   if (!timestamp) return "-";
//   try {
//     // Handle Firestore Timestamp
//     if (timestamp?.seconds) {
//       const date = new Date(timestamp.seconds * 1000);
//       return date.toLocaleTimeString("en-IN", {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       });
//     }
//     // Handle regular date string
//     const date = new Date(timestamp);
//     if (isNaN(date.getTime())) return "-";
//     return date.toLocaleTimeString("en-IN", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   } catch (error) {
//     console.error("Error formatting time:", error);
//     return "-";
//   }
// };

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (user) {
        fetchOrders();
      } else {
        setError("Please log in to view orders");
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchOrders = async () => {
    if (!auth.currentUser) {
      setError("Authentication required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await orderApi.getAllOrdersForAdmin();
      console.log("Orders received:", data);      // Log the first order's date for debugging
      if (data.length > 0) {
        console.log("First order created_at:", data[0].created_at);
      }
      setOrders(data);
    } catch (err: any) {
      console.error("Error fetching admin orders:", err);
      setError(err.message || "Failed to fetch orders");
      toast.error(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    status:
      | "pending"
      | "confirmed"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "returned"
  ) => {
    try {
      await orderApi.updateOrderStatus(orderId, { status });
      await fetchOrders();
      toast.success("Order status updated successfully");
      setEditingOrderId(null); // Close the dropdown after update
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      toast.error(err.message || "Failed to update order status");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const viewDetails = (id: string) => {
    navigate(`/admin/orders/${id}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">All Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found</p>
      ) : (        <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Order ID
                </th>                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Actions
                </th>
              </tr>
            </thead>            <tbody className="bg-white divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.userId}</div>
                  </td>{" "}                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {" "}
                {new Date(order.created_at || Date.now()).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {/* {formatTime(order.created_at)} */}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingOrderId === order.id ? (
                      <select
                        value={order.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Order["status"];
                          handleStatusUpdate(order.id, newStatus);
                        }}
                        className="button border rounded px-2 py-1 text-sm"
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{order.total_amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => viewDetails(order.id)}
                      className="button text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <FiEye className="inline-block" /> View
                    </button>
                    {order.status !== "delivered" &&
                      order.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            setEditingOrderId(
                              editingOrderId === order.id ? null : order.id
                            )
                          }
                          className="button text-blue-600 hover:text-blue-900"
                        >
                          {editingOrderId === order.id
                            ? "Cancel"
                            : "Update Status"}
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
