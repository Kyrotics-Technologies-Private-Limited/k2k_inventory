import React, { useEffect, useState } from "react";

import {
  FiDollarSign,
  FiShoppingCart,
  FiUser,
  FiTrendingUp,
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
import { fetchDashboardStats } from "../../services/api/dashApi";
interface DashboardStatsResponse {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  totalOrders: number;
  totalCustomers: number;
  orderStatusCounts: {
    placed: number;
    delivered: number;
    cancelled: number;
  };
  revenueChart: {
    date: string;
    revenue: number;
  }[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
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
      // change: "+12% from last month",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders?.toString() ?? "0",
      icon: <FiShoppingCart size={24} />,
      //change: "+8% from last month",
    },
    {
      title: "Customers",
      value: stats?.totalCustomers?.toString() ?? "0",
      icon: <FiUser size={24} />,
      //change: "+5% from last month",
    },
    {
      title: "Conversion Rate",
      value: "3.2%",
      icon: <FiTrendingUp size={24} />,
      //change: "+0.8% from last month",
    },
  ];

  const statusCards = [
    {
      title: "Pending Orders",
      value: stats?.orderStatusCounts?.placed ?? 0,
      color: "text-yellow-600",
    },
    {
      title: "Delivered Orders",
      value: stats?.orderStatusCounts?.delivered ?? 0,
      color: "text-green-600",
    },
    {
      title: "Cancelled Orders",
      value: stats?.orderStatusCounts?.cancelled ?? 0,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-lg shadow flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "Loading..." : card.value}
                </p>
                {/* <p className="text-sm text-green-500 mt-1">{card.change}</p> */}
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4">
        {statusCards.map((card, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-lg shadow flex flex-col justify-center h-32"
          >
            <p className="text-gray-500">{card.title}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>
              {loading ? "..." : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
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
