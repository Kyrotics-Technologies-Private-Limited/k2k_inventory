import React, { useEffect, useState } from "react";
import { orderApi } from "../../services/api/orderApi";
import type { Order, UpdateOrderStatusPayload } from "../../types/order";
import { toast } from "react-toastify";
import { FiEye, FiEdit2, FiX } from "react-icons/fi";

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderApi.getAllOrders();
      setOrders(ordersData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to fetch orders. Please try again later.");
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    status: UpdateOrderStatusPayload["status"]
  ) => {
    try {
      await orderApi.updateOrderStatus(orderId, { status });
      await fetchOrders();
      toast.success("Order status updated successfully");
    } catch (err) {
      console.error("Failed to update order status:", err);
      toast.error("Failed to update order status");
    }
  };

  const handleViewOrder = async (orderId: string) => {
    try {
      const orderDetails = await orderApi.getOrderById(orderId);
      setSelectedOrder(orderDetails);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch order details:", err);
      toast.error("Failed to fetch order details");
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

  if (error) {
    return (
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
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">
                      #{order.id.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.address?.first_name} {order.address?.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.user_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ₹{order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      title="View Order"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsUpdateModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                      title="Update Status"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Order Status
              </h3>
              <div className="space-y-2">
                {[
                  "pending",
                  "processing",
                  "shipped",
                  "delivered",
                  "cancelled",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      handleStatusUpdate(
                        selectedOrder.id,
                        status as Order["status"]
                      );
                      setIsUpdateModalOpen(false);
                    }}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      selectedOrder.status === status
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order View Modal */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Order Details #{selectedOrder.id.slice(-6)}
                </h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Customer Information
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="text-sm font-medium">
                          {selectedOrder.address?.first_name}{" "}
                          {selectedOrder.address?.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Contact</p>
                        <p className="text-sm font-medium">
                          {selectedOrder.address?.phone}
                        </p>
                        {selectedOrder.address?.email && (
                          <p className="text-sm font-medium">
                            {selectedOrder.address?.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Shipping Address
                    </h4>
                    <div className="text-sm">
                      <p>{selectedOrder.address?.street}</p>
                      <p>
                        {selectedOrder.address?.city},{" "}
                        {selectedOrder.address?.state}{" "}
                        {selectedOrder.address?.postal_code}
                      </p>
                      <p>{selectedOrder.address?.country}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Order Items
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Variant
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm">{item.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.variant_name || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              ₹{item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              ₹{(item.unit_price * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Subtotal</span>
                      <span className="text-sm font-medium">
                        ₹{selectedOrder.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Shipping</span>
                      <span className="text-sm font-medium">
                        ₹{selectedOrder.shipping_fee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Tax</span>
                      <span className="text-sm font-medium">
                        ₹{selectedOrder.tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t">
                      <span className="text-base font-medium">Total</span>
                      <span className="text-base font-medium">
                        ₹{selectedOrder.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;


// import React, { useEffect, useState } from "react";
// import { orderApi } from "../../services/api/orderApi";
// import { Order, UpdateOrderStatusPayload } from "../../types/order";
// import { toast } from "react-toastify";
// import { FiEye, FiEdit2, FiX } from "react-icons/fi";
// //import { getUserById } from "../../services/api/authApi";

// const formatDate = (dateString: string | Date) => {
//   const date = new Date(dateString);
//   return date.toLocaleString("en-IN", {
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const AdminOrdersPage: React.FC = () => {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
//   const [isViewModalOpen, setIsViewModalOpen] = useState(false);
//   const [customerData, setCustomerData] = useState<
//     Record<string, { name?: string; phone?: string }>
//   >({});

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const fetchOrders = async () => {
//     try {
//       setLoading(true);
//       const ordersData = await orderApi.getAllOrders();
//       setOrders(ordersData);
//       setError(null);

//       // Fetch customer data for all orders
//       const customerRecords: Record<string, { name?: string; phone?: string }> =
//         {};
//       await Promise.all(
//         ordersData.map(async (order) => {
//           try {
//             //const user = await getUserById(order.user_id);
//             customerRecords[order.user_id] = {
//               name: user.name,
//               phone: user.phone,
//             };
//           } catch (error) {
//             console.error(`Failed to fetch user ${order.user_id}:`, error);
//             customerRecords[order.user_id] = {};
//           }
//         })
//       );
//       setCustomerData(customerRecords);
//     } catch (err) {
//       console.error("Failed to fetch orders:", err);
//       setError("Failed to fetch orders. Please try again later.");
//       toast.error("Failed to fetch orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleStatusUpdate = async (
//     orderId: string,
//     status: UpdateOrderStatusPayload["status"]
//   ) => {
//     try {
//       await orderApi.updateOrderStatus(orderId, { status });
//       await fetchOrders();
//       toast.success("Order status updated successfully");
//     } catch (err) {
//       console.error("Failed to update order status:", err);
//       toast.error("Failed to update order status");
//     }
//   };

//   const handleViewOrder = async (orderId: string) => {
//     try {
//       const orderDetails = await orderApi.getOrderById(orderId);
//       setSelectedOrder(orderDetails);
//       setIsViewModalOpen(true);
//     } catch (err) {
//       console.error("Failed to fetch order details:", err);
//       toast.error("Failed to fetch order details");
//     }
//   };

//   const getStatusBadgeColor = (status: string) => {
//     switch (status.toLowerCase()) {
//       case "pending":
//         return "bg-yellow-100 text-yellow-800";
//       case "processing":
//         return "bg-blue-100 text-blue-800";
//       case "shipped":
//         return "bg-indigo-100 text-indigo-800";
//       case "delivered":
//         return "bg-green-100 text-green-800";
//       case "cancelled":
//         return "bg-red-100 text-red-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-50 border-l-4 border-red-500 p-4">
//         <div className="flex">
//           <div className="flex-shrink-0">
//             <svg
//               className="h-5 w-5 text-red-500"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
//                 clipRule="evenodd"
//               />
//             </svg>
//           </div>
//           <div className="ml-3">
//             <p className="text-sm text-red-700">{error}</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-6">Order Management</h1>

//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Order ID
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Customer
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Status
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Total
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {orders.map((order) => (
//                 <tr key={order.id} className="hover:bg-gray-50">
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="text-sm font-medium text-blue-600">
//                       #{order.id.slice(-8)}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       {formatDate(order.created_at)}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="text-sm font-medium text-gray-900">
//                       {customerData[order.user_id]?.name ||
//                         `${order.address?.first_name || ""} ${
//                           order.address?.last_name || ""
//                         }`.trim() ||
//                         `Customer (${order.user_id.slice(0, 6)}...)`}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       {order.user_id.slice(0, 8)}...
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span
//                       className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
//                         order.status
//                       )}`}
//                     >
//                       {order.status.charAt(0).toUpperCase() +
//                         order.status.slice(1)}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                     ₹{order.total_amount.toFixed(2)}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
//                     <button
//                       onClick={() => handleViewOrder(order.id)}
//                       className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
//                       title="View Order"
//                     >
//                       <FiEye className="w-5 h-5" />
//                     </button>
//                     <button
//                       onClick={() => {
//                         setSelectedOrder(order);
//                         setIsUpdateModalOpen(true);
//                       }}
//                       className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
//                       title="Update Status"
//                     >
//                       <FiEdit2 className="w-5 h-5" />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Status Update Modal */}
//       {isUpdateModalOpen && selectedOrder && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
//           <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
//             <div className="p-6">
//               <h3 className="text-lg font-medium text-gray-900 mb-4">
//                 Update Order Status
//               </h3>
//               <div className="space-y-2">
//                 {[
//                   "pending",
//                   "processing",
//                   "shipped",
//                   "delivered",
//                   "cancelled",
//                 ].map((status) => (
//                   <button
//                     key={status}
//                     onClick={() => {
//                       handleStatusUpdate(
//                         selectedOrder.id,
//                         status as Order["status"]
//                       );
//                       setIsUpdateModalOpen(false);
//                     }}
//                     className={`w-full p-3 text-left rounded-lg transition-colors ${
//                       selectedOrder.status === status
//                         ? "bg-blue-50 text-blue-700 border border-blue-200"
//                         : "hover:bg-gray-50"
//                     }`}
//                   >
//                     {status.charAt(0).toUpperCase() + status.slice(1)}
//                   </button>
//                 ))}
//               </div>
//               <div className="mt-6 flex justify-end">
//                 <button
//                   onClick={() => setIsUpdateModalOpen(false)}
//                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Order View Modal */}
//       {isViewModalOpen && selectedOrder && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
//           <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
//             <div className="p-6">
//               <div className="flex justify-between items-center border-b pb-4">
//                 <h3 className="text-lg font-medium text-gray-900">
//                   Order Details #{selectedOrder.id.slice(-6)}
//                 </h3>
//                 <button
//                   onClick={() => setIsViewModalOpen(false)}
//                   className="text-gray-400 hover:text-gray-500"
//                 >
//                   <FiX size={24} />
//                 </button>
//               </div>

//               <div className="mt-6 space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {/* Customer Information */}
//                   <div>
//                     <h4 className="font-medium text-gray-900 mb-2">
//                       Customer Information
//                     </h4>
//                     <div className="space-y-2">
//                       <div>
//                         <p className="text-sm text-gray-500">Name</p>
//                         <p className="text-sm font-medium">
//                           {customerData[selectedOrder.user_id]?.name ||
//                             `${selectedOrder.address?.first_name || ""} ${
//                               selectedOrder.address?.last_name || ""
//                             }`.trim() ||
//                             `Customer (${selectedOrder.user_id.slice(
//                               0,
//                               6
//                             )}...)`}
//                         </p>
//                       </div>
//                       <div>
//                         <p className="text-sm text-gray-500">Contact</p>
//                         <p className="text-sm font-medium">
//                           {customerData[selectedOrder.user_id]?.phone ||
//                             selectedOrder.address?.phone ||
//                             "N/A"}
//                         </p>
//                       </div>
//                       <div>
//                         <p className="text-sm text-gray-500">Customer ID</p>
//                         <p className="text-sm font-medium">
//                           {selectedOrder.user_id}
//                         </p>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Shipping Address */}
//                   <div>
//                     <h4 className="font-medium text-gray-900 mb-2">
//                       Shipping Address
//                     </h4>
//                     <div className="text-sm">
//                       <p>{selectedOrder.address?.street}</p>
//                       <p>
//                         {selectedOrder.address?.city},{" "}
//                         {selectedOrder.address?.state}{" "}
//                         {selectedOrder.address?.postal_code}
//                       </p>
//                       <p>{selectedOrder.address?.country}</p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Order Items */}
//                 <div>
//                   <h4 className="font-medium text-gray-900 mb-2">
//                     Order Items
//                   </h4>
//                   <div className="border rounded-lg overflow-hidden">
//                     <table className="min-w-full divide-y divide-gray-200">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                             Product
//                           </th>
//                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                             Variant
//                           </th>
//                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                             Qty
//                           </th>
//                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                             Price
//                           </th>
//                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                             Total
//                           </th>
//                         </tr>
//                       </thead>
//                       <tbody className="bg-white divide-y divide-gray-200">
//                         {selectedOrder.items?.map((item) => (
//                           <tr key={item.id}>
//                             <td className="px-4 py-3 text-sm">{item.name}</td>
//                             <td className="px-4 py-3 text-sm">
//                               {item.variant_name || "N/A"}
//                             </td>
//                             <td className="px-4 py-3 text-sm">
//                               {item.quantity}
//                             </td>
//                             <td className="px-4 py-3 text-sm">
//                               ₹{item.unit_price.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3 text-sm">
//                               ₹{(item.unit_price * item.quantity).toFixed(2)}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* Order Summary */}
//                 <div className="border-t pt-4">
//                   <div className="space-y-2">
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-500">Subtotal</span>
//                       <span className="text-sm font-medium">
//                         ₹{selectedOrder.subtotal.toFixed(2)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-500">Shipping</span>
//                       <span className="text-sm font-medium">
//                         ₹{selectedOrder.shipping_fee.toFixed(2)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-500">Tax</span>
//                       <span className="text-sm font-medium">
//                         ₹{selectedOrder.tax.toFixed(2)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between pt-2 mt-2 border-t">
//                       <span className="text-base font-medium">Total</span>
//                       <span className="text-base font-medium">
//                         ₹{selectedOrder.total_amount.toFixed(2)}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-6 flex justify-end">
//                 <button
//                   onClick={() => setIsViewModalOpen(false)}
//                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminOrdersPage;