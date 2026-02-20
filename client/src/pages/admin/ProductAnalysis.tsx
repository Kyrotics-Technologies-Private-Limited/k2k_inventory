import React, { useCallback, useEffect, useState } from "react";
import { fetchDashboardStats, type DashboardStatsResponse } from "../../services/api/dashApi";
import { categoryApi, type Category } from "../../services/api/categoryApi";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from "recharts";
import { FiCalendar } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ─── Small card wrapper ──────────────────────────────────────────────────────
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg shadow flex flex-col hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50">
    <p className="text-gray-500">{title}</p>
    <div className="mt-2">{children}</div>
  </div>
);

// ─── Palette ─────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#fbbf24", "#a855f7", "#fb923c", "#34d399", "#f472b6", "#60a5fa", "#f87171"];

// ─── Type for chart row ───────────────────────────────────────────────────────
interface CategoryEntry {
  category: string;
  value: number; // units sold
}

// ─── Main component ───────────────────────────────────────────────────────────
const ProductAnalysis: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived chart data
  const [categoryPieData, setCategoryPieData] = useState<CategoryEntry[]>([]);

  // Date range (default: first day of current month → today)
  const now = new Date();
  const [categoryStartDate, setCategoryStartDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [categoryEndDate, setCategoryEndDate] = useState<Date | null>(now);

  const [isFiltering, setIsFiltering] = useState(false);

  // ── Fetch active categories list once ──────────────────────────────────────
  useEffect(() => {
    categoryApi.getAllCategories().then(setAllCategories).catch(console.error);
  }, []);

  // ── Fetch dashboard stats whenever the date range changes ─────────────────
  const loadStats = useCallback(async () => {
    setIsFiltering(true);
    try {
      const startParam = categoryStartDate
        ? categoryStartDate.toISOString().split("T")[0]
        : undefined;
      const endParam = categoryEndDate
        ? categoryEndDate.toISOString().split("T")[0]
        : undefined;
      const data = await fetchDashboardStats(startParam, endParam);
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsFiltering(false);
      setLoading(false);
    }
  }, [categoryStartDate, categoryEndDate]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch whenever date range changes (skip very first render handled above)
  useEffect(() => {
    if (!loading) {
      loadStats();
    }
  }, [categoryStartDate, categoryEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build pie/bar data from salesByCategory + allCategories ───────────────
  useEffect(() => {
    if (!stats) return;

    const salesMap: Record<string, number> = stats.salesByCategory || {};

    // Merge with all active categories so every category appears (even with 0)
    const categoryNames = allCategories.length > 0
      ? allCategories.map((c) => c.name)
      : Object.keys(salesMap);

    const merged: CategoryEntry[] = categoryNames.map((name) => ({
      category: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value: salesMap[name] ?? salesMap[name.toLowerCase()] ?? salesMap[name.toUpperCase()] ?? 0,
    }));

    // Also add any salesByCategory keys not covered by allCategories
    Object.entries(salesMap).forEach(([catName, qty]) => {
      const normalised = catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase();
      if (!merged.find((m) => m.category.toLowerCase() === normalised.toLowerCase())) {
        merged.push({ category: normalised, value: qty });
      }
    });

    // Sort by value descending
    merged.sort((a, b) => b.value - a.value);

    console.log("Category chart data:", merged);
    setCategoryPieData(merged);
  }, [stats, allCategories]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportData = () => {
    if (!stats || categoryPieData.length === 0) return;
    const totalUnits = categoryPieData.reduce((s, i) => s + i.value, 0);
    let csv = "Product Analysis Report\n";
    csv += `Export Date: ${new Date().toLocaleString()}\n`;
    csv += `Date Range: ${categoryStartDate?.toLocaleDateString() ?? "N/A"} to ${categoryEndDate?.toLocaleDateString() ?? "N/A"}\n\n`;

    csv += "SUMMARY\nMetric,Value\n";
    csv += `Total Categories,${categoryPieData.length}\n`;
    csv += `Total Units Sold,${totalUnits}\n`;
    csv += `Top Category,${categoryPieData[0]?.category ?? "N/A"}\n\n`;

    csv += "CATEGORY DISTRIBUTION\nCategory,Units Sold,Percentage\n";
    categoryPieData.forEach((item) => {
      const pct = totalUnits > 0 ? ((item.value / totalUnits) * 100).toFixed(1) : "0.0";
      csv += `${item.category},${item.value},${pct}%\n`;
    });
    csv += "\n";

    if (stats.top5BestsellersLast3Months?.length) {
      csv += "TOP 5 BESTSELLERS (3 MONTHS)\nRank,Product Name,Total Sold\n";
      stats.top5BestsellersLast3Months.forEach((item, idx) => {
        csv += `${idx + 1},${item.productName ?? "N/A"},${item.totalSold ?? 0}\n`;
      });
      csv += "\n";
    }
    if (stats.quickSellersLastWeek?.length) {
      csv += "FAST MOVING PRODUCTS (1 WEEK)\nRank,Product Name,Total Sold\n";
      stats.quickSellersLastWeek.forEach((item, idx) => {
        csv += `${idx + 1},${item.productName ?? "N/A"},${item.totalSold ?? 0}\n`;
      });
      csv += "\n";
    }
    if (stats.lowStockVariants?.length) {
      csv += "LOW STOCK PRODUCTS\nProduct,Variant,Units in Stock\n";
      stats.lowStockVariants.forEach((item) => {
        csv += `${item.product ?? "N/A"},${item.variant ?? "N/A"},${item.unitsInStock ?? 0}\n`;
      });
      csv += "\n";
    }
    if (stats.overstockVariants?.length) {
      csv += "OVERSTOCK PRODUCTS\nProduct,Variant,Units in Stock\n";
      stats.overstockVariants.forEach((item) => {
        csv += `${item.product ?? "N/A"},${item.variant ?? "N/A"},${item.unitsInStock ?? 0}\n`;
      });
      csv += "\n";
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalUnits = categoryPieData.reduce((s, i) => s + i.value, 0);
  const daysInRange =
    categoryStartDate && categoryEndDate
      ? Math.max(1, Math.ceil((categoryEndDate.getTime() - categoryStartDate.getTime()) / 86400000))
      : 30;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Analysis</h1>
        <button
          onClick={exportData}
          disabled={loading || categoryPieData.length === 0}
          className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${loading || categoryPieData.length === 0
            ? "bg-gray-400 cursor-not-allowed text-gray-600"
            : "bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white"
            }`}
        >
          {loading ? "Loading..." : "Export Data"}
        </button>
      </div>

      {/* Top 4 product lists */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Top 5 Bestseller products (3 months)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.top5BestsellersLast3Months?.length ? (
            <ul className="space-y-2">
              {stats.top5BestsellersLast3Months.map((item, idx) => (
                <li key={item.productId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 mt-2">
                    {item.image && <img src={item.image} alt={item.productName} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-medium font-bold text-green-600">{idx + 1}. {item.productName}</span>
                  </div>
                  <span className="text-medium font-bold text-green-600">{item.totalSold}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Least seller products (3 months)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.leastSellersLast3Months?.length ? (
            <ul className="space-y-2">
              {stats.leastSellersLast3Months.map((item, idx) => (
                <li key={item.productId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 mt-2">
                    {item.image && <img src={item.image} alt={item.productName} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-medium font-bold text-red-600">{idx + 1}. {item.productName}</span>
                  </div>
                  <span className="text-medium font-bold text-red-600">{item.totalSold}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Fast moving products (1 week)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.quickSellersLastWeek?.length ? (
            <ul className="space-y-3">
              {stats.quickSellersLastWeek.map((item, idx) => (
                <li key={item.productId} className="text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mt-2">
                      {item.image && <img src={item.image} alt={item.productName} className="w-8 h-8 rounded object-cover" />}
                      <span className="text-medium font-bold text-green-900">
                        {idx + 1}. {item.productName}
                        {item.variants?.length ? ` (${item.variants[0].variantName})` : ""}
                      </span>
                    </div>
                    <span className="text-medium font-bold text-green-900">{item.totalSold}</span>
                  </div>
                  {item.variants?.length ? (
                    <ul className="ml-10 mt-1 text-xs text-gray-600 space-y-1">
                      {item.variants.map((v) => (
                        <li key={v.variantId} className="flex items-center justify-between">
                          <span>- {v.variantName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Slow moving products (1 week)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.slowMoversLastWeek?.length ? (
            <ul className="space-y-3">
              {stats.slowMoversLastWeek.map((item, idx) => (
                <li key={item.productId} className="text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mt-2">
                      {item.image && <img src={item.image} alt={item.productName} className="w-8 h-8 rounded object-cover" />}
                      <span className="text-medium font-bold text-red-600">
                        {idx + 1}. {item.productName}
                        {item.variants?.length ? ` (${item.variants[0].variantName})` : ""}
                      </span>
                    </div>
                    <span className="text-medium font-bold text-red-600">{item.totalSold}</span>
                  </div>
                  {item.variants?.length ? (
                    <ul className="ml-10 mt-1 text-xs text-gray-600 space-y-1">
                      {item.variants.map((v) => (
                        <li key={v.variantId} className="flex items-center justify-between">
                          <span>- {v.variantName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>
      </div>

      {/* Stock & demand row */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card title="Low stock products (with quantity)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.lowStockVariants?.length ? (
            <ul className="space-y-2">
              {stats.lowStockVariants.map((item, idx) => (
                <li key={`${item.product}-${item.variant}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 mt-2">
                    {item.image && <img src={item.image} alt={`${item.product} ${item.variant}`} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-medium font-bold text-blue-700">{idx + 1}. {item.product} ({item.variant})</span>
                  </div>
                  <span className="text-md font-bold text-blue-700">{item.unitsInStock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Overstock products (with quantity)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.overstockVariants?.length ? (() => {
            // Group by product name, summing unitsInStock across all variants
            const productMap = stats.overstockVariants.reduce<Record<string, { total: number; image: string | null | undefined }>>(
              (acc, item) => {
                if (!acc[item.product]) {
                  acc[item.product] = { total: 0, image: item.image };
                }
                acc[item.product].total += item.unitsInStock;
                return acc;
              },
              {}
            );
            const entries = Object.entries(productMap).sort((a, b) => b[1].total - a[1].total);
            return (
              <ul className="space-y-2">
                {entries.map(([productName, { total, image }], idx) => (
                  <li key={productName} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 mt-2">
                      {image && <img src={image} alt={productName} className="w-8 h-8 rounded object-cover" />}
                      <span className="text-md font-bold text-purple-400">{idx + 1}. {productName}</span>
                    </div>
                    <span className="font-bold text-purple-400">{total} units</span>
                  </li>
                ))}
              </ul>
            );
          })() : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Top Demanding products (by last-week sales %)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.demandingProducts?.length ? (
            <ul className="space-y-2">
              {stats.demandingProducts.slice(0, 4).map((item, idx) => (
                <li key={item.productId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 mt-2">
                    {item.image && <img src={item.image} alt={item.productName} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-medium font-bold text-amber-700">{idx + 1}. {item.productName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-md text-black">Sales/Wk: <span className="font-semibold text-amber-700">{item.lastWeekSales}</span></div>
                    <div className="text-md text-black">Demand: <span className="font-semibold text-amber-700">{item.percentile}%</span></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>
      </div>

      {/* ── Category Sales Analysis ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-lg shadow">

        {/* Monthly Summary Cards */}
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Summary</h3>
        <div className="bg-blue-200 p-6 rounded-lg border mb-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Total Active Categories</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <p className="text-3xl font-bold text-blue-600">{categoryPieData.length}</p>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Total Units Sold</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <p className="text-3xl font-bold text-green-600">{totalUnits}</p>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Top Category</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <p className="text-2xl font-bold text-purple-600 capitalize">{categoryPieData[0]?.category || "N/A"}</p>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Current Month</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-orange-600">
                    {new Date().toLocaleDateString("en-US", { month: "long" })}
                  </p>
                  <p className="text-sm text-gray-600">{new Date().getFullYear()}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Category Sales Analysis</h2>

        {/* Date Range Selector */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              <FiCalendar className="inline-block mr-1" />
              Start Date:
            </label>
            <DatePicker
              selected={categoryStartDate}
              onChange={(date) => setCategoryStartDate(date)}
              selectsStart
              startDate={categoryStartDate}
              endDate={categoryEndDate}
              placeholderText="Select start date"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxDate={categoryEndDate || new Date()}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">End Date:</label>
            <DatePicker
              selected={categoryEndDate}
              onChange={(date) => setCategoryEndDate(date)}
              selectsEnd
              startDate={categoryStartDate}
              endDate={categoryEndDate}
              minDate={categoryStartDate ?? undefined}
              placeholderText="Select end date"
              className="border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxDate={new Date()}
            />
          </div>

          <div className="text-sm text-gray-500">
            {categoryStartDate && categoryEndDate && (
              <span>
                Showing data for {daysInRange} day{daysInRange !== 1 ? "s" : ""}
                {isFiltering && (
                  <span className="ml-2 text-blue-500">
                    <span className="animate-spin inline-block w-3 h-3 border-b-2 border-blue-500 rounded-full mr-1" />
                    Updating...
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Filtering indicator */}
        {isFiltering && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              <span>Updating charts with new date range...</span>
            </div>
          </div>
        )}

        {/* Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Category Distribution (Pie) — {categoryPieData.length} categor{categoryPieData.length === 1 ? "y" : "ies"}
            </h3>
            <div className="w-full h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
              ) : isFiltering ? (
                <div className="flex items-center justify-center h-full text-blue-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                    <p>Updating data...</p>
                  </div>
                </div>
              ) : categoryPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">No data available</p>
                    <p className="text-gray-400 text-sm">Category sales data will appear here once orders are placed</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
                      }
                      labelLine
                    >
                      {categoryPieData.map((_entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} units sold`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Category Sales Comparison (Bar) — {categoryPieData.length} categor{categoryPieData.length === 1 ? "y" : "ies"}
            </h3>
            <div className="w-full h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
              ) : isFiltering ? (
                <div className="flex items-center justify-center h-full text-blue-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                    <p>Updating data...</p>
                  </div>
                </div>
              ) : categoryPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">No data available</p>
                    <p className="text-gray-400 text-sm">Category distribution data will appear here once orders are placed</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {/* Use categoryPieData directly as rows — one bar per category */}
                  <BarChart data={categoryPieData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      label={{ value: "Category", position: "insideBottom", offset: -20 }}
                    />
                    <YAxis
                      label={{ value: "Units Sold", angle: -90, position: "insideLeft" }}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <Tooltip formatter={(value: number) => [`${value} units`, "Units Sold"]} />
                    <Bar dataKey="value" name="Units Sold" radius={[4, 4, 0, 0]}>
                      {categoryPieData.map((_entry, idx) => (
                        <Cell key={`bar-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Category Performance Summary Cards */}
        {!loading && categoryPieData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryPieData.map((item, idx) => (
              <div key={item.category} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">{item.category}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Units Sold:</span>
                    <span className="font-bold text-gray-800">{item.value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Share:</span>
                    <span className="font-bold text-gray-800">
                      {totalUnits > 0 ? ((item.value / totalUnits) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Avg:</span>
                    <span className="font-bold text-gray-800">
                      {(item.value / daysInRange).toFixed(1)} u/day
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductAnalysis;
