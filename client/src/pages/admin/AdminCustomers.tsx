import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import api from "../../services/api/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
  status: "active" | "inactive" | "new";
  location: string;
}

const CustomersManagement: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch customers from backend API
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        // Use absolute backend URL in dev if needed
        const apiUrl =  "/admin/users";
        const res = await api.get(apiUrl);
        if (!Array.isArray(res.data)) {
          throw new Error("API did not return an array of users");
        }
        const users: Customer[] = res.data.map((user: any) => ({
          id: user.uid || user.id,
          name: user.name || user.displayName || "",
          email: user.email || "",
          phone: user.phone || user.phoneNumber || "",
          joinDate: user.joinDate || new Date().toISOString(), // Use only joinDate from backend
          orders: user.ordersCount || 0,
          totalSpent: user.totalSpent || 0,
          lastOrder: user.lastOrder || null,
          status: user.status || "active",
          location: user.location || "",
        }));
        setCustomers(users);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const viewCustomerDetails = (customerId: string) => {
    navigate(`/admin/customers/${customerId}`);
  };

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) return;
    const exportData = filteredCustomers.map((customer) => ({
      "Customer ID": customer.id,
      Name: customer.name,
      Email: customer.email,
      Phone: customer.phone,
      "Join Date": customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : "",
      Orders: customer.orders,
      "Total Spent": customer.totalSpent,
      "Last Order": customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : "",
      Status: customer.status.charAt(0).toUpperCase() + customer.status.slice(1),
      Location: customer.location,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customers Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and analyze your customer base
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            className="button inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            onClick={handleExportExcel}
            disabled={filteredCustomers.length === 0}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <div className="sm:flex sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search customers by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <select
              className="button block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="new">New</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-gray-500">
              No customers found matching your criteria
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <UserCircleIcon className="flex-shrink-0 h-10 w-10 text-gray-400 mr-3" />
                          <div>
                            <div
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                              onClick={() => viewCustomerDetails(customer.id)}
                              title="View Details"
                            >
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                        {customer.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <PhoneIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(customer.joinDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          customer.status === "active"
                            ? "bg-green-100 text-green-800"
                            : customer.status === "new"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {customer.status.charAt(0).toUpperCase() +
                          customer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => viewCustomerDetails(customer.id)}
                          className="button text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          {/* <PencilIcon className="h-5 w-5" /> */}
                        </button>
                        <button
                          onClick={() => viewCustomerDetails(customer.id)}
                          className="button bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 px-3 py-1 rounded"
                          title="View Orders"
                        >
                          View Orders
                        </button>
                        {/* <button
                          onClick={() => console.log("Delete", customer.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Customer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">10</span> of{" "}
          <span className="font-medium">{filteredCustomers.length}</span>{" "}
          customers
        </div>
        <div className="flex space-x-2">
          <button
            className="button px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled
          >
            Previous
          </button>
          <button className="button px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomersManagement;
