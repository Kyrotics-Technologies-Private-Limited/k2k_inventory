import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "../../services/api/dashApi";
import { categoryApi, type Category } from "../../services/api/categoryApi";
import variantApi from "../../services/api/variantApi";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { FiCalendar, FiDownload } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  CartesianGrid, Line, ResponsiveContainer, LineChart,
  Tooltip, XAxis, YAxis, BarChart, Bar, Cell,
  PieChart, Pie,
} from "recharts";

// ─── Palette (same as ProductAnalysis) ───────────────────────────────────────
const PIE_COLORS = ["#fbbf24", "#a855f7", "#fb923c", "#34d399", "#f472b6", "#60a5fa", "#f87171"];

interface Variant {
  id: string;
  productId: string;
  weight: string;
  price: number;
  units_in_stock: number;
}

interface RevenueDataPoint {
  period: string;
  revenue: number;
  growth?: number;
  date: Date;
}


const FinanceAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // KPI metrics from dashboard API
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [totalCancelledOrders, setTotalCancelledOrders] = useState(0);
  const [totalReturnedOrders, setTotalReturnedOrders] = useState(0);

  // Category revenue chart data (from dashboard API)
  const [categoryChartData, setCategoryChartData] = useState<{ category: string; revenue: number }[]>([]);

  // Revenue trend (local computation from raw orders, unchanged)
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);


  const [showAllRevenueData, setShowAllRevenueData] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<"line" | "bar">("line");

  // Active categories list
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  // ── Fetch active categories once ──────────────────────────────────────────
  useEffect(() => {
    categoryApi.getAllCategories().then(setAllCategories).catch(console.error);
  }, []);

  // ── Fetch KPI + category chart from dashboard API ─────────────────────────
  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await fetchDashboardStats();

      setTotalRevenue(stats.totalRevenue);
      setTotalOrders(stats.totalOrders);
      setAverageOrderValue(stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0);
      setTotalCancelledOrders(stats.orderStatusCounts.cancelled);
      setTotalReturnedOrders(stats.orderStatusCounts.returned);

      // revenueByCategory from the API is the source of truth
      const revMap: Record<string, number> = stats.revenueByCategory || {};

      // Merge with all active categories so all 4 appear (even with ₹0)
      return revMap;
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      return {};
    }
  }, []);

  // ── Fetch raw orders/variants/products for trend chart + inventory value ──
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [vars, ords] = await Promise.all([
          variantApi.getVariants(),
          orderApi.getAllOrdersForAdmin(),
        ]);

        setOrders(ords);

        // Inventory value from variants
        const invValue = vars.reduce((t: number, v: Variant) => t + v.price * v.units_in_stock, 0);
        setTotalInventoryValue(invValue);

        // Revenue trend data
        const trends = calculateRevenueTrends(ords, vars);
        setRevenueTrendData(trends);

        // Default date range
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        setStartDate(oneMonthAgo);
        setEndDate(now);

        // Cancelled / returned counts (local, for accuracy with raw orders)
        setTotalCancelledOrders(ords.filter((o: Order) => o.status === "cancelled").length);
        setTotalReturnedOrders(ords.filter((o: Order) => o.status === "returned").length);
      } catch (err) {
        console.error("Error fetching financial data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build category chart data once categories + dashboard stats are ready ─
  useEffect(() => {
    if (loading) return;
    loadDashboardStats().then((revMap) => {
      const categoryNames =
        allCategories.length > 0
          ? allCategories.map((c) => c.name)
          : Object.keys(revMap);

      const merged = categoryNames.map((name) => {
        const rev =
          revMap[name] ??
          revMap[name.toLowerCase()] ??
          revMap[name.toUpperCase()] ??
          0;
        return { category: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), revenue: rev };
      });

      // Also add any revMap keys not already covered
      Object.entries(revMap).forEach(([cat, rev]) => {
        const norm = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        if (!merged.find((m) => m.category.toLowerCase() === norm.toLowerCase())) {
          merged.push({ category: norm, revenue: rev });
        }
      });

      merged.sort((a, b) => b.revenue - a.revenue);
      setCategoryChartData(merged);

      // Also set total revenue from revMap if we got it from API
      const apiTotal = merged.reduce((s, c) => s + c.revenue, 0);
      if (apiTotal > 0) setTotalRevenue(apiTotal);
    });
  }, [loading, allCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Revenue trend helpers (unchanged) ────────────────────────────────────
  const calculateRevenueTrends = (orders: Order[], variants: any[]): RevenueDataPoint[] => {
    if (!orders || orders.length === 0) return [];
    const revenueMap = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "returned") return;
      if (!order.created_at) return;
      const periodKey = new Date(order.created_at).toISOString().split("T")[0];
      let orderRevenue = 0;
      if (order.items) {
        order.items.forEach((item: any) => {
          const variantId = item.variantId || item.variant_id;
          const variant = variants.find((v) => v.id === variantId);
          if (variant) orderRevenue += item.quantity * variant.price;
        });
      }
      revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + orderRevenue);
    });
    const data: RevenueDataPoint[] = Array.from(revenueMap.entries())
      .map(([period, revenue]) => ({ period, revenue, date: new Date(period) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    data.forEach((dp, i) => {
      if (i > 0 && data[i - 1].revenue > 0) {
        dp.growth = ((dp.revenue - data[i - 1].revenue) / data[i - 1].revenue) * 100;
      }
    });
    return data;
  };

  const filterDataByDateRange = (data: RevenueDataPoint[], start: Date | null, end: Date | null) => {
    if (!start || !end) {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return data.filter((item) => item.date >= oneMonthAgo && item.date <= now);
    }
    const startTime = new Date(start).setHours(0, 0, 0, 0);
    const endTime = new Date(end).setHours(23, 59, 59, 999);
    return data.filter((item) => {
      const t = new Date(item.date).setHours(0, 0, 0, 0);
      return t >= startTime && t <= endTime;
    });
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const filteredData = filterDataByDateRange(revenueTrendData, startDate, endDate);
    if (filteredData.length === 0) {
      alert("No data to export for the selected date range");
      return;
    }
    const exportData = filteredData.map((dp) => ({
      Period: dp.period,
      "Revenue (₹)": dp.revenue,
      "Growth %": dp.growth !== undefined ? `${dp.growth >= 0 ? "+" : ""}${dp.growth.toFixed(1)}%` : "—",
      Date: dp.date.toLocaleDateString(),
      "Revenue Formatted": formatCurrency(dp.revenue),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Trends");
    const buf = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, `revenue_trends_${startDate?.toISOString().slice(0, 10)}_to_${endDate?.toISOString().slice(0, 10)}.xlsx`);
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Analysis</h1>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: "180px" }}>
          <p className="text-gray-500">Total Revenue</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-green-600">
              {loading ? "Loading..." : formatCurrency(totalRevenue)}
            </p>
            {!loading && <p className="text-sm text-gray-400 mt-2">Total sales from all orders</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: "180px" }}>
          <p className="text-gray-500">Total Orders</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {loading ? "Loading..." : totalOrders || orders.length}
            </p>
            {!loading && <p className="text-sm text-gray-400 mt-2">Total number of orders</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: "180px" }}>
          <p className="text-gray-500">Average Order Value (AOV)</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {loading ? "Loading..." : formatCurrency(averageOrderValue)}
            </p>
            {!loading && <p className="text-sm text-gray-400 mt-2">Average amount per order</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: "180px" }}>
          <p className="text-gray-500">Total Inventory Value</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {loading ? "Loading..." : formatCurrency(totalInventoryValue)}
            </p>
            {!loading && <p className="text-sm text-gray-400 mt-2">Current stock value</p>}
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div
          className="bg-white p-6 rounded-lg shadow flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
          style={{ minHeight: "180px" }}
          onClick={() => navigate("/admin/orders?status=cancelled")}
        >
          <p className="text-gray-500">Total Cancelled Orders</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-red-600">
              {loading ? "Loading..." : totalCancelledOrders}
            </p>
            {/* {!loading && <p className="text-sm text-gray-400 mt-2">Orders that were cancelled</p>} */}
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
          style={{ minHeight: "180px" }}
          onClick={() => navigate("/admin/orders?status=returned")}
        >
          <p className="text-gray-500">Total Returned Orders</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-red-600">
              {loading ? "Loading..." : totalReturnedOrders}
            </p>
            {/* {!loading && <p className="text-sm text-gray-400 mt-2">Orders that were returned</p>} */}
          </div>
        </div>

        {/* Revenue by Category mini-card */}
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: "180px" }}>
          <p className="text-gray-500">Revenue by Category</p>
          <div className="mt-1 flex-1">
            {loading ? (
              <p className="text-2xl font-bold mt-1 text-purple-600">Loading...</p>
            ) : categoryChartData.length > 0 ? (
              <div className="mt-2 space-y-2">
                {categoryChartData.slice(0, 4).map(({ category, revenue }, idx) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="capitalize text-purple-700 font-medium text-sm">{category}</span>
                    </div>
                    <span className="font-semibold text-purple-600 text-sm">{formatCurrency(revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-purple-400 text-sm mt-2">No revenue data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue by Category — Bar + Pie Charts */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-1">
          Revenue by Category — {categoryChartData.length} categor{categoryChartData.length === 1 ? "y" : "ies"}
        </h2>
        <p className="text-sm text-gray-400 mb-4">Based on all non-cancelled, non-returned orders</p>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">Loading charts...</div>
        ) : categoryChartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">No category revenue data available</div>
        ) : (
          <div className="w-full flex flex-col md:flex-row gap-6">
            {/* Bar Chart */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2 text-center">Bar Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    label={{ value: "Category", position: "insideBottom", offset: -20 }}
                  />
                  <YAxis tickFormatter={(v: number) => `₹${v}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((_entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2 text-center">Pie Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine
                  >
                    {categoryChartData.map((_entry, idx) => (
                      <Cell key={`pie-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category performance summary */}
        {!loading && categoryChartData.length > 0 && (() => {
          const totalRev = categoryChartData.reduce((s, c) => s + c.revenue, 0);
          return (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryChartData.map(({ category, revenue }, idx) => (
                <div key={category} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <h3 className="text-base font-semibold text-gray-800 capitalize">{category}</h3>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-bold text-gray-800">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Share:</span>
                      <span className="font-bold text-gray-800">
                        {totalRev > 0 ? ((revenue / totalRev) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Revenue Growth Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue Growth Trend</h2>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                <FiCalendar className="inline-block mr-1" />
                Start Date:
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Select start date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxDate={endDate || new Date()}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">End Date:</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
                placeholderText="Select end date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxDate={new Date()}
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
              disabled={!startDate || !endDate || revenueTrendData.length === 0}
            >
              <FiDownload className="inline-block" />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Summary mini-cards */}
        {!loading && revenueTrendData.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Revenue Data</h3>
              <div className="text-sm text-gray-500">
                Showing {filterDataByDateRange(revenueTrendData, startDate, endDate).length} of {revenueTrendData.length} periods
                {startDate && endDate && (
                  <span className="ml-2">
                    • {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Today's Revenue</p>
                <p className="text-lg font-bold text-blue-800">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayRev = filterDataByDateRange(revenueTrendData, startDate, endDate)
                      .filter((item) => { const d = new Date(item.date); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime(); })
                      .reduce((s, i) => s + i.revenue, 0);
                    return formatCurrency(todayRev);
                  })()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Period Revenue</p>
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(filterDataByDateRange(revenueTrendData, startDate, endDate).reduce((s, i) => s + i.revenue, 0))}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">Avg. Revenue/Day</p>
                <p className="text-lg font-bold text-purple-800">
                  {(() => {
                    const filtered = filterDataByDateRange(revenueTrendData, startDate, endDate);
                    if (filtered.length === 0) return "—";
                    return formatCurrency(filtered.reduce((s, i) => s + i.revenue, 0) / filtered.length);
                  })()}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">Growth Trend</p>
                <p className="text-lg font-bold text-orange-800">
                  {(() => {
                    const filtered = filterDataByDateRange(revenueTrendData, startDate, endDate);
                    if (filtered.length < 2) return "—";
                    const first = filtered[0].revenue;
                    const last = filtered[filtered.length - 1].revenue;
                    if (first === 0) return "—";
                    const g = ((last - first) / first) * 100;
                    return `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
                  })()}
                </p>
              </div>
            </div>

            {/* Revenue table */}
            {filterDataByDateRange(revenueTrendData, startDate, endDate).length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center ring-1 ring-gray-200">
                <p className="text-gray-500 text-lg">No revenue data found for the selected date range</p>
                <button
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  Clear date filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Period</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Revenue</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Growth %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(() => {
                      const filtered = filterDataByDateRange(revenueTrendData, startDate, endDate);
                      const display = showAllRevenueData ? filtered : filtered.slice(0, 5);
                      return display.map((dp, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dp.period}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(dp.revenue)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {dp.growth !== undefined ? (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${dp.growth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {dp.growth >= 0 ? "+" : ""}{dp.growth.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {/* View More */}
            {(() => {
              const filtered = filterDataByDateRange(revenueTrendData, startDate, endDate);
              if (filtered.length > 5) {
                return (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowAllRevenueData(!showAllRevenueData)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                      {showAllRevenueData ? "Show Less" : `View More (${filtered.length - 5} more rows)`}
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Revenue trend chart */}
        <div id="revenue-chart" className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Growth Trend</h2>
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Chart Type:</label>
            <select
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as "line" | "bar")}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              style={{ width: 120 }}
            >
              <option value="line">Line Graph</option>
              <option value="bar">Bar Graph</option>
            </select>
          </div>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const filteredChartData = filterDataByDateRange(revenueTrendData, startDate, endDate);
                if (filteredChartData.length === 0) {
                  return <div className="flex items-center justify-center h-full text-gray-400">No data for selected range</div> as any;
                }
                if (selectedChartType === "bar") {
                  return (
                    <BarChart data={filteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" label={{ value: "Time", position: "insideBottom", offset: -5 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v: number) => `₹${v}`} label={{ value: "Revenue", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  );
                }
                return (
                  <LineChart data={filteredChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" label={{ value: "Time", position: "insideBottom", offset: -5 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(v: number) => `₹${v}`} label={{ value: "Revenue", angle: -90, position: "insideLeft" }} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                      dot={{ r: filteredChartData.length === 1 ? 6 : 4, fill: "#3b82f6" }}
                      activeDot={{ r: filteredChartData.length === 1 ? 8 : 6 }}
                    />
                  </LineChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAnalysis;
