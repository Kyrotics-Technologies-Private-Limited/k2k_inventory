import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiShoppingCart,
  FiUser,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { fetchDashboardStats, type DashboardStatsResponse } from "../../services/api/dashApi";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const navigate = useNavigate();

  // Helper to render out-of-stock warning
  const renderOutOfStockWarning = () => {
    if (!stats || !stats.outOfStockVariants || stats.outOfStockVariants.length === 0) return null;
    
    return (
      <div 
        className="bg-red-50 border border-red-200 text-red-800 p-4 mb-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
        onClick={() => navigate('/admin/out-of-stock')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiAlertTriangle className="mr-3 text-red-600" size={20} />
            <div>
              <div className="font-bold">⚠️ Stock Alert</div>
              <div className="text-sm">
                {stats.outOfStockVariants.length} variant{stats.outOfStockVariants.length > 1 ? 's' : ''} out of stock
              </div>
            </div>
          </div>
          <span className="text-red-600 hover:text-red-800 font-medium text-sm">
            View Details →
          </span>
        </div>
      </div>
    );
  };

  // Set default dates to first day of current month to current date
  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Use local timezone consistently for date formatting
    setStartDate(firstDayOfMonth.toLocaleDateString('en-CA')); // YYYY-MM-DD format
    setEndDate(now.toLocaleDateString('en-CA')); // YYYY-MM-DD format
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!startDate || !endDate) return; // Wait for dates to be set
      
      try {
        setLoading(true);
        const data = await fetchDashboardStats(startDate, endDate);
        setStats(data);

        console.log("Dashboard stats loaded:", data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [startDate, endDate]);

  const summaryCards = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue
        ? `₹${stats.totalRevenue.toLocaleString()}`
        : "₹0",
      icon: <FaRupeeSign size={24} />,
      onClick: () => {
        const revenueChart = document.getElementById('revenue-chart');
        if (revenueChart) {
          revenueChart.scrollIntoView({ behavior: 'smooth' });
        }
      },
      clickable: true,
    },
    {
      title: "Total Orders",
      value: stats?.monthlyOrders?.toString() ?? "0",
      icon: <FiShoppingCart size={24} />,
      onClick: () => {
        // Navigate with first day of current month to current date and revenue filter
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];
        
        const url = `/admin/orders?revenue=true&startDate=${startDate}&endDate=${endDate}`;
        console.log('Navigating to:', url);
        console.log('Date range:', { firstDayOfMonth, now, startDate, endDate });
        
        navigate(url);
      },
      clickable: true,
    },
    {
      title: "Total Customers",
      value: stats?.totalCustomers?.toString() ?? "0",
      icon: <FiUser size={24} />,
      onClick: () => navigate("/admin/customers"),
      clickable: true,
    },
  ];

  const statusCards = [
    {
      title: "Pending Orders",
      value: stats?.orderStatusCounts?.placed ?? 0,
      color: "text-yellow-600",
      status: "placed",
    },
    {
      title: "Processing Orders",
      value: stats?.orderStatusCounts?.processing ?? 0,
      color: "text-blue-600",
      status: "processing",
    },
    {
      title: "Shipped Orders",
      value: stats?.orderStatusCounts?.shipped ?? 0,
      color: "text-indigo-600",
      status: "shipped",
    },
    {
      title: "Delivered Orders",
      value: stats?.orderStatusCounts?.delivered ?? 0,
      color: "text-green-600",
      status: "delivered",
    },
    {
      title: "Cancelled Orders",
      value: stats?.orderStatusCounts?.cancelled ?? 0,
      color: "text-red-600",
      status: "cancelled",
    },
    {
      title: "Returned Orders",
      value: stats?.orderStatusCounts?.returned ?? 0,
      color: "text-red-600",
      status: "returned",
      onClick: () => navigate("/admin/orders?status=returned"),
    },
  ];


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* Out of Stock Warning */}
      {renderOutOfStockWarning()}

      {/* Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`bg-white p-6 rounded-lg shadow flex flex-col justify-between h-36 ${
              card.clickable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50' : ''
            }`}
            onClick={card.onClick}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "Loading..." : card.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                card.clickable ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mt-4">
        {statusCards.map((card, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-lg shadow flex flex-col justify-center h-32 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
            onClick={() => {
              if (card.status === "outOfStock") {
                navigate("/admin/products?fromDashboard=true");
              } else {
                navigate(`/admin/orders?status=${card.status}`);
              }
            }}
          >
            <p className="text-gray-500">{card.title}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>
              {loading ? "..." : card.value}
            </p>
          </div>
        ))}
      </div>



                    {/* Revenue Chart */}
       <div id="revenue-chart" className="bg-white p-6 rounded-lg shadow mt-6">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
           <h2 className="text-xl font-semibold mb-4 sm:mb-0">Revenue Analysis</h2>
           <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex flex-col">
               <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">
                 Start Date
               </label>
               <input
                 id="startDate"
                 type="date"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
             <div className="flex flex-col">
               <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">
                 End Date
               </label>
               <input
                 id="endDate"
                 type="date"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
           </div>
         </div>
         <div className="w-full h-[300px] flex flex-col md:flex-row gap-6">
           <div className="flex-1">
             <ResponsiveContainer width="100%" height={300}>
               <LineChart data={stats?.revenueChart || []}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis 
                   dataKey="date" 
                   angle={-45}
                   textAnchor="end"
                   height={80}
                 />
                 <YAxis tickFormatter={(value) => `₹${value}`} />
                 <Tooltip formatter={(value) => `₹${value}`} />
                 <Legend />
                 <Line
                   type="monotone"
                   dataKey="revenue"
                   stroke="#3b82f6"
                   strokeWidth={2}
                   dot={{ r: 3 }}
                   name="Revenue (Line)"
                 />
               </LineChart>
             </ResponsiveContainer>
           </div>
           <div className="flex-1">
             <ResponsiveContainer width="100%" height={300}>
               <BarChart data={stats?.revenueChart || []}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis 
                   dataKey="date" 
                   angle={-45}
                   textAnchor="end"
                   height={80}
                 />
                 <YAxis tickFormatter={(value) => `₹${value}`} />
                 <Tooltip formatter={(value) => `₹${value}`} />
                 <Legend />
                 <Bar dataKey="revenue" fill="#fbbf24" name="Revenue (Bar)" />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
       </div>
    </div>
  );
};

export default AdminDashboard;