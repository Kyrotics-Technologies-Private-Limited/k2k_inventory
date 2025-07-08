import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

interface Order {
  id: string;
  [key: string]: any;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: string;
  location: string;
  [key: string]: any;
}

const CustomerDetailsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.DEV
          ? `http://localhost:5567/api/admin/customers/${customerId}`
          : `/api/admin/customers/${customerId}`;
        const res = await axios.get(apiUrl);
        setCustomer(res.data.customer);
        setOrders(res.data.orders);
      } catch (err: any) {
        setError("Failed to fetch customer details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [customerId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!customer)
    return <div className="p-8 text-center">Customer not found</div>;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="button mb-6 flex items-center text-blue-600 hover:underline text-sm"
      >
        <span className="mr-2">&larr;</span> Back to Customers
      </button>
      <div className="bg-white shadow-lg rounded-lg p-6 flex flex-col sm:flex-row gap-8 mb-8">
        <div className="flex-shrink-0 flex items-center justify-center w-28 h-28 rounded-full bg-blue-100 text-blue-600 text-5xl font-bold">
          {customer.name &&
          typeof customer.name === "string" &&
          customer.name.length > 0
            ? customer.name.charAt(0).toUpperCase()
            : "?"}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1 text-gray-900">
            {customer.name}
          </h1>
          <div className="flex flex-wrap gap-4 mb-2 text-gray-700">
            <span className="inline-flex items-center text-sm">
              <span className="font-medium mr-1">Email:</span> {customer.email}
            </span>
            <span className="inline-flex items-center text-sm">
              <span className="font-medium mr-1">Phone:</span> {customer.phone}
            </span>
            {/* <span className="inline-flex items-center text-sm">
              <span className="font-medium mr-1">Location:</span>{" "}
              {customer.location || "-"}
            </span> */}
          </div>
          <div className="flex flex-wrap gap-4 mb-2 text-gray-700">
            {/* <span className="inline-flex items-center text-sm">
              <span className="font-medium mr-1">Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  typeof customer.status === "string" &&
                  customer.status.toLowerCase() === "active"
                    ? "bg-green-100 text-green-800"
                    : typeof customer.status === "string" &&
                      customer.status.toLowerCase() === "new"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {typeof customer.status === "string" &&
                customer.status.length > 0
                  ? customer.status.charAt(0).toUpperCase() +
                    customer.status.slice(1)
                  : "-"}
              </span>
            </span> */}
            <span className="inline-flex items-center text-sm">
              <span className="font-medium mr-1">Joined:</span>{" "}
              {customer.joinDate
                ? new Date(customer.joinDate).toLocaleDateString()
                : "-"}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          Order History
        </h2>
        {orders.length === 0 ? (
          <div className="text-gray-500">
            No orders found for this customer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-700">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.createdAt
                        ? typeof order.createdAt === "object" &&
                          order.createdAt !== null &&
                          "seconds" in order.createdAt
                          ? new Date(
                              order.createdAt.seconds * 1000
                            ).toLocaleDateString()
                          : typeof order.createdAt === "string" ||
                            typeof order.createdAt === "number"
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "-"
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status
                          ? order.status.charAt(0).toUpperCase() +
                            order.status.slice(1)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {typeof order.total === "number" && !isNaN(order.total)
                        ? `₹${order.total}`
                        : typeof order.total_amount === "number" &&
                          !isNaN(order.total_amount)
                        ? `₹${order.total_amount}`
                        : typeof order.amount === "number" &&
                          !isNaN(order.amount)
                        ? `₹${order.amount}`
                        : typeof order.totalAmount === "number" &&
                          !isNaN(order.totalAmount)
                        ? `₹${order.totalAmount}`
                        : Array.isArray(order.items)
                        ? (() => {
                            const sum = order.items.reduce((acc, item) => {
                              if (typeof item.total === "number")
                                return acc + item.total;
                              if (
                                typeof item.price === "number" &&
                                typeof item.quantity === "number"
                              )
                                return acc + item.price * item.quantity;
                              return acc;
                            }, 0);
                            return sum > 0 ? `₹${sum}` : "-";
                          })()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
