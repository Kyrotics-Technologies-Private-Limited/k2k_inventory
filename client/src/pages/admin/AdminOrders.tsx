import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { toast } from "react-toastify";
import { FiEye, FiSearch } from "react-icons/fi";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
const formatDate = (timestamp: any) => {
  if (!timestamp) return "-";
  try {
    // Handle Firestore Timestamp
    if (timestamp?.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    // Handle ISO string or number
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

const formatTime = (timestamp: any) => {
  if (!timestamp) return "-";
  try {
    // Handle Firestore Timestamp
    if (timestamp?.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    // Handle ISO string or number
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "-";
  }
};

// Helper to flatten nested objects/arrays for Excel export
const flattenObject = (obj: any, prefix = ""): any => {
  let result: any = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
};

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
      console.log("Orders received:", data);
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

  const filteredOrders = orders.filter((order) => {
    // Apply status filter
    const statusMatch = statusFilter === "all" || order.status === statusFilter;

    // Apply search filter
    const searchMatch =
      searchQuery === "" ||
      (order.username &&
        order.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.userId &&
        order.userId.toLowerCase().includes(searchQuery.toLowerCase()));

    return statusMatch && searchMatch;
  });

  // Excel export handler (selected backend fields)
  const handleExportExcel = () => {
    const exportData = filteredOrders.map((order) => ({
      "Order ID": order.id,
      "User ID": order.userId,
      Username: order.username || "",
      "Address ID": order.address_id,
      "Total Amount": order.total_amount,
      "Payment Method": order.payment_method,
      "Shipping Method": order.shipping_method,
      Items: Array.isArray(order.items)
        ? order.items
            .map((item: any) => item.name || item.title || "")
            .join(", ")
        : "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "orders_selected_fields.xlsx");
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="statusFilter"
            className="text-sm font-medium text-gray-700"
          >
            <span className="inline-block mr-1">Filter by Status:</span>
          </label>
          <div className="relative">
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="button appearance-none border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white pr-8 min-w-[120px]"
            >
              <option value="all">All</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              ▼
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by username or user ID..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {statusFilter !== "all" && (
          <button
            onClick={() => setStatusFilter("all")}
            className="button inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
          >
            Clear Filter
            <span className="ml-1">✕</span>
          </button>
        )}
        <button
          onClick={handleExportExcel}
          className="button px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Export to Excel
        </button>
      </div>
      {filteredOrders.length === 0 ? (
        <p className="text-gray-500">No orders found</p>
      ) : (
        <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b">
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
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.username || order.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatTime(order.created_at)}
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
