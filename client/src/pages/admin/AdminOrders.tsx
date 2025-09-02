import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { toast } from "react-toastify";
import { FiEye, FiSearch, FiCalendar } from "react-icons/fi";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ORDER_STATUSES = [
  "placed",
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
    let date;
    // Handle Firestore Timestamp
    if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Handle ISO string or number
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "-";

    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

const formatDateForDatePicker = (timestamp: any) => {
  if (!timestamp) return null;
  try {
    let date;
    if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return null;

    // Set the time to start of day for consistent comparison
    date.setHours(0, 0, 0, 0);
    return date;
  } catch (error) {
    console.error("Error formatting date for picker:", error);
    return null;
  }
};

// const isSameDay = (date1: Date, date2: Date) => {
//   return (
//     date1.getFullYear() === date2.getFullYear() &&
//     date1.getMonth() === date2.getMonth() &&
//     date1.getDate() === date2.getDate()
//   );
// };

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchOrders();
      } else {
        setError("Please log in to view orders");
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle URL parameters for status filtering
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && ORDER_STATUSES.includes(statusFromUrl as any)) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    if (!auth.currentUser) {
      setError("Authentication required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await orderApi.getAllOrdersForAdmin();
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
    status: (typeof ORDER_STATUSES)[number]
  ) => {
    try {
      await orderApi.updateOrderStatus(orderId, { status });
      await fetchOrders();
      
      // Show specific message for cancellation and refresh inventory
      if (status.toLowerCase() === 'cancelled') {
        toast.success("Order cancelled successfully. Inventory has been restocked.");
        // Refresh inventory data in the background
        try {
          await orderApi.refreshInventoryAfterCancellation(orderId);
        } catch (error) {
          console.warn('Failed to refresh inventory data:', error);
        }
      } else {
        toast.success("Order status updated successfully");
      }
      
      setEditingOrderId(null);
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

    // Apply date filter
    let dateMatch = true;
    if (startDate || endDate) {
      const orderDate = formatDateForDatePicker(order.created_at);
      if (!orderDate) {
        dateMatch = false;
      } else {
        // Reset time components for comparison
        const orderDateAtMidnight = new Date(orderDate);
        orderDateAtMidnight.setHours(0, 0, 0, 0);

        if (startDate) {
          const startDateAtMidnight = new Date(startDate);
          startDateAtMidnight.setHours(0, 0, 0, 0);
          dateMatch = orderDateAtMidnight >= startDateAtMidnight;
        }

        if (endDate && dateMatch) {
          const endDateAtMidnight = new Date(endDate);
          endDateAtMidnight.setHours(23, 59, 59, 999);
          dateMatch = orderDateAtMidnight <= endDateAtMidnight;
        }
      }
    }

    return statusMatch && searchMatch && dateMatch;
  });

  const handleExportExcel = () => {
    const maxItemsCount = Math.max(
      ...filteredOrders.map((order) =>
        Array.isArray(order.items) ? order.items.length : 0
      )
    );

    const exportData = filteredOrders.map((order) => {
      const fullAddress = order.address
        ? `${order.address.first_name} ${order.address.last_name}, ${order.address.street}, ${order.address.city}, ${order.address.state}, ${order.address.postal_code}, ${order.address.country}, Phone: ${order.address.phone}`
        : "";

      const row: Record<string, any> = {
        "Order ID": order.id,
        "User ID": order.userId,
        Username: order.username || "",
        Address: fullAddress,
        "Total Amount": order.total_amount,
        "Payment Method": order.payment_method,
        "Shipping Method": order.shipping_method,
        Status: order.status,
        "Order Date": formatDate(order.created_at),
      };

      // Dynamically add item columns
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any, index: number) => {
          row[`Item ${index + 1} Name`] = item.name || "Unnamed Product";
          row[`Item ${index + 1} Qty`] = item.quantity || 1;
          row[`Item ${index + 1} Variant`] = item.variant_name || "";
        });
      }

      // Fill empty columns if fewer items than max
      for (let i = order.items?.length || 0; i < maxItemsCount; i++) {
        row[`Item ${i + 1} Name`] = "";
        row[`Item ${i + 1} Qty`] = "";
        row[`Item ${i + 1} Variant`] = "";
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
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

      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="statusFilter"
              className="text-sm font-medium text-gray-700"
            >
              Filter by Status:
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

          {/* Clear Filters */}
          {(statusFilter !== "all" || searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
                clearDateFilters();
              }}
              className="button inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
            >
              Clear All Filters
              <span className="ml-1">✕</span>
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              <FiCalendar className="inline-block mr-1" />
              Date Range:
            </label>
            <div className="flex items-center gap-2">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxDate={endDate || new Date()}
              />
              <span>to</span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
                placeholderText="End date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxDate={new Date()}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilters}
                className="button inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
              >
                Clear Dates
              </button>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="button px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            disabled={filteredOrders.length === 0}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <p className="text-gray-500 text-lg">
            No orders found matching your criteria
          </p>
          {(statusFilter !== "all" || searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
                clearDateFilters();
              }}
              className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg bg-white shadow-sm">
          <div className="p-2 bg-gray-50 text-right text-sm text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
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
                    <button
                      onClick={() => viewDetails(order.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover cursor-pointer transition-colors duration-150"
                    >
                      {order.id.substring(0, 8)}...
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.username || order.userId.substring(0, 8) + "..."}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
  {editingOrderId === order.id ? (
    (() => {
      // Build allowed statuses based on current order.status
      let availableStatuses: Order['status'][] = [];
      switch (order.status) {
        case "placed":
          availableStatuses = ["processing", "cancelled"];
          break;
        case "processing":
          availableStatuses = ["shipped", "cancelled"];
          break;
        case "shipped":
          availableStatuses = ["delivered", "returned", "cancelled"];
          break;
        case "delivered":
        case "cancelled":
        case "returned":
          availableStatuses = [];
          break;
      }

      // Ensure the current status is present in the option list (so select value always matches an option)
      const options = [order.status, ...availableStatuses.filter((s) => s !== order.status)];

      const currentValue = selectedStatus ?? order.status;

      return (
        <select
          value={currentValue}
          onChange={async (e) => {
            const newStatus = e.target.value as Order['status'];
            setSelectedStatus(newStatus);

            // Immediately update the status (if desired). handleStatusUpdate will fetch orders & clear edit mode.
            await handleStatusUpdate(order.id, newStatus);
            // handleStatusUpdate already calls setEditingOrderId(null) when done.
            setSelectedStatus(null);
          }}
          className="border rounded px-2 py-1 text-sm"
          autoFocus
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      );
    })()
  ) : (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
        ${
          order.status === "cancelled"
            ? "bg-red-100 text-red-800"
            : order.status === "delivered"
            ? "bg-green-100 text-green-800"
            : order.status === "returned"
            ? "bg-yellow-100 text-yellow-800"
            : order.status === "processing"
            ? "bg-purple-100 text-purple-800"
            : order.status === "shipped"
            ? "bg-indigo-100 text-indigo-800"
            : "bg-gray-100 text-gray-800"
        }`}
    >
      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
    </span>
  )}
</td>


                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => viewDetails(order.id)}
                      className="button text-indigo-600 hover:text-indigo-900 mr-4"
                      title="View order details"
                    >
                      <FiEye className="inline-block" /> View
                    </button>
                    {order.status !== "delivered" &&
                      order.status !== "cancelled" && (
                        <button
  onClick={() => {
    if (editingOrderId === order.id) {
      setEditingOrderId(null);
      setSelectedStatus(null);
    } else {
      setEditingOrderId(order.id);
      setSelectedStatus(order.status); // init local selection
    }
  }}
  className="button text-blue-600 hover:text-blue-900"
  title="Update order status"
>
  {editingOrderId === order.id ? "Cancel" : "Update"}
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
