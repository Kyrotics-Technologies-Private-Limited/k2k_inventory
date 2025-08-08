import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiDollarSign,
  FiShoppingCart,
  FiUser,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchDashboardStats, type outOfStockVariants, type DashboardStatsResponse } from "../../services/api/dashApi";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const navigate = useNavigate();

  // Helper to render out-of-stock warning
  const renderOutOfStockWarning = () => {
    if (!stats || !stats.outOfStockVariants || stats.outOfStockVariants.length === 0) return null;
    
    return (
      <>
        {/* Warning Banner */}
        <div 
          className="bg-red-50 border border-red-200 text-red-800 p-4 mb-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setShowOutOfStockModal(true)}
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
            <button className="text-red-600 hover:text-red-800 font-medium text-sm">
              View Details →
            </button>
          </div>
        </div>

        {/* Modal */}
        {showOutOfStockModal && (
          <div className="fixed inset-0  bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white bg-opacity-90 backdrop-blur-xl border border-white border-opacity-20 rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 bg-opacity-70 backdrop-blur-sm px-6 py-4 border-b border-red-200 border-opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiAlertTriangle className="text-red-600 mr-3" size={24} />
                    <h3 className="text-lg font-semibold text-red-800">
                      Out of Stock Alert
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowOutOfStockModal(false)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  The following product variants are currently out of stock:
                </p>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-3">
                    {stats.outOfStockVariants.map((item: outOfStockVariants, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border-l-4 border-red-400">
                        <div className="font-semibold text-gray-800">{item.product}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Variant: <span className="font-medium">{item.variant}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 bg-opacity-70 backdrop-blur-sm px-6 py-4 border-t border-gray-200 border-opacity-50">
                <button
                  onClick={() => setShowOutOfStockModal(false)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);

        console.log("Dashboard stats loaded:", data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const summaryCards = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue
        ? `₹${stats.totalRevenue.toLocaleString()}`
        : "₹0",
      icon: <FiDollarSign size={24} />,
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
      value: stats?.totalOrders?.toString() ?? "0",
      icon: <FiShoppingCart size={24} />,
      onClick: () => navigate("/admin/orders"),
      clickable: true,
    },
    {
      title: "Customers",
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
      title: "Out of Stock Variants",
      value: stats?.outOfStockVariants?.length ?? 0,
      color: "text-red-600",
      status: "outOfStock",
      onClick: () => navigate("/admin/products?fromDashboard=true"),
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
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mt-4">
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
         <h2 className="text-xl font-semibold mb-4">Revenue This Month</h2>
         <div className="w-full h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={stats?.revenueChart || []}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="date" />
               <YAxis tickFormatter={(value) => `₹${value}`} />
               <Tooltip formatter={(value) => `₹${value}`} />
               <Line
                 type="monotone"
                 dataKey="revenue"
                 stroke="#3b82f6"
                 strokeWidth={2}
                 dot={{ r: 3 }}
               />
             </LineChart>
           </ResponsiveContainer>
         </div>
       </div>
    </div>
  );
};

export default AdminDashboard;