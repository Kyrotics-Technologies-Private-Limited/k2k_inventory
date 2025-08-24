import React, { useEffect, useState } from "react";
import { fetchDashboardStats, type DashboardStatsResponse } from "../../services/api/dashApi";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
  // Removed duplicate and out-of-scope useEffect and state for categoryPieData and pieColors.

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg shadow flex flex-col hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50">
    <p className="text-gray-500">{title}</p>
    <div className="mt-2">{children}</div>
  </div>
);

const ProductAnalysis: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Pie chart state
  const [categoryPieData, setCategoryPieData] = useState<{ category: string; value: number }[]>([]);
  const pieColors = ["#fbbf24", "#a855f7", "#fb923c", "#34d399", "#f472b6", "#60a5fa", "#f87171"];

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Debug logs
    console.log('Dashboard stats:', stats);
    if (stats) {
      console.log('top5BestsellersLast3Months:', stats.top5BestsellersLast3Months);
    }
    if (!stats || !stats.top5BestsellersLast3Months?.length) {
      setCategoryPieData([]);
      return;
    }
    // Fetch category info for each product (if not present)
    const fetchCategories = async () => {
      // If stats.top5BestsellersLast3Months already has category, use it
      if ((stats.top5BestsellersLast3Months[0] as any).category) {
        const catMap: Record<string, number> = {};
        (stats.top5BestsellersLast3Months as any[]).forEach((item) => {
          if (!item.category) return;
          catMap[item.category] = (catMap[item.category] || 0) + item.totalSold;
        });
        const pieData = Object.entries(catMap).map(([category, value]) => ({ category, value }));
        setCategoryPieData(pieData);
        console.log('Pie chart data (from category field):', pieData);
        return;
      }
      // Otherwise, fetch product details for each productId
      const responses = await Promise.all(
        stats.top5BestsellersLast3Months.map((item) =>
          fetch(`/api/products/${item.productId}`).then((r) => (r.ok ? r.json() : null))
        )
      );
      const catMap: Record<string, number> = {};
      stats.top5BestsellersLast3Months.forEach((item, idx) => {
        const prod = responses[idx];
        const cat = prod?.category || "Unknown";
        catMap[cat] = (catMap[cat] || 0) + item.totalSold;
      });
      const pieData = Object.entries(catMap).map(([category, value]) => ({ category, value }));
      setCategoryPieData(pieData);
      console.log('Pie chart data (from fetched product details):', pieData);
    };
    fetchCategories();
  }, [stats]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Product Analysis</h1>

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
                    <span className="text-medium font-bold text-red-700">{idx + 1}. {item.productName}</span>
                  </div>
                  <span className="text-medium font-bold text-red-700">{item.totalSold}</span>
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
                    <span className="text-medium font-bold text-yellow-700">{idx + 1}. {item.productName}</span>
                  </div>
                  <span className="text-medium font-bold text-yellow-700">{item.totalSold}</span>
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
                      <span className="text-medium font-bold text-green-900">{idx + 1}. {item.productName}{item.variants && item.variants.length ? ` (${item.variants[0].variantName})` : ""}</span>
                    </div>
                    <span className="text-medium font-bold text-green-900">{item.totalSold}</span>
                  </div>
                  {item.variants?.length ? (
                    <ul className="ml-10 mt-1 text-xs text-gray-600 space-y-1">
                      {item.variants.map(v => (
                        <li key={v.variantId} className="flex items-center justify-between">
                          <span>- {v.variantName}</span>
                          {/* <span className="font-medium">{v.totalSold}</span> */}
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
                      <span className="text-medium font-bold text-green-700">{idx + 1}. {item.productName}{item.variants && item.variants.length ? ` (${item.variants[0].variantName})` : ""}</span>
                    </div>
                    <span className="text-medium font-bold text-green-700">{item.totalSold}</span>
                  </div>
                  {item.variants?.length ? (
                    <ul className="ml-10 mt-1 text-xs text-gray-600 space-y-1">
                      {item.variants.map(v => (
                        <li key={v.variantId} className="flex items-center justify-between">
                          <span>- {v.variantName}</span>
                          {/* <span className="font-medium">{v.totalSold}</span> */}
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

      {/* Second row: Stock health + Demand */}
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
          ) : stats?.overstockVariants?.length ? (
            <ul className="space-y-2">
              {stats.overstockVariants.map((item, idx) => (
                <li key={`${item.product}-${item.variant}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 mt-2">
                    {item.image && <img src={item.image} alt={`${item.product} ${item.variant}`} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-md font-bold text-purple-700">{idx + 1}. {item.product} ({item.variant})</span>
                  </div>
                  <span className="font-bold text-purple-700">{item.unitsInStock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>

        <Card title="Top 2 Demanding products (by last-week sales %)">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : stats?.demandingProducts?.length ? (
            <ul className="space-y-2">
              {stats.demandingProducts.slice(0, 2).map((item, idx) => (
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
      <div className="bg-white p-6 rounded-lg shadow">
       {/* Pie Chart for Best Selling Product Category */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Best Selling Product Category</h2>
        <div className="w-full h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
          ) : categoryPieData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {categoryPieData.map((_entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;


