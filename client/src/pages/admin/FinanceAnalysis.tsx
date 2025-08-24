import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import { orderApi } from "../../services/api/orderApi";
import type { Order } from "../../types/order";
import { FiCalendar, FiDownload } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CartesianGrid, Line, ResponsiveContainer, LineChart, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from "recharts";
import { PieChart, Pie, Legend } from "recharts";


interface Variant {
  id: string;
  productId: string;
  weight: string;
  price: number;
  units_in_stock: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: {
    amount: number;
    currency: "INR";
  };
  images: {
    main: string;
    gallery: string[];
    banner: string;
  };
}

interface RevenueDataPoint {
  period: string;
  revenue: number;
  growth?: number;
  date: Date;
}

const FinanceAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [revenueByCategory, setRevenueByCategory] = useState<Record<string, number>>({});
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  
  // Revenue Growth Trend states
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar'>('line');
  // Chart type for Revenue by Category (bar or pie)
  const [] = useState<'bar' | 'pie'>('bar');
  // Removed unused selectedCategory and selectedProduct state
  
  // const [] = useNavigate();

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      try {
        // Fetch all necessary data
        const [products, variants, orders] = await Promise.all([
          productApi.getAllProducts(),
          variantApi.getVariants(),
          orderApi.getAllOrdersForAdmin()
        ]);

        // Set orders and products state for UI display
        setOrders(orders);
        setProducts(products);
        setVariants(variants);

        console.log('Debug - Products:', products);
        console.log('Debug - Variants:', variants);
        console.log('Debug - Orders:', orders);
        
        // Log detailed structure of first order if available
        if (orders.length > 0) {
          console.log('Debug - First order structure:', orders[0]);
          if (orders[0].items) {
            console.log('Debug - First order items:', orders[0].items);
            // Log the first item in detail
            if (orders[0].items.length > 0) {
              console.log('Debug - First item structure:', orders[0].items[0]);
              console.log('Debug - First item keys:', Object.keys(orders[0].items[0]));
            }
          }
        }

        // Validate that we have the required data
        if (!products || products.length === 0) {
          console.warn('No products found');
          setTotalRevenue(0);
          setAverageOrderValue(0);
          setRevenueByCategory({});
          setTotalInventoryValue(0);
          return;
        }
        if (!variants || variants.length === 0) {
          console.warn('No variants found');
          setTotalRevenue(0);
          setAverageOrderValue(0);
          setRevenueByCategory({});
          setTotalInventoryValue(0);
          return;
        }
        if (!orders || orders.length === 0) {
          console.warn('No orders found');
          setTotalRevenue(0);
          setAverageOrderValue(0);
          setRevenueByCategory({});
          // Still calculate inventory value even without orders
        }

        // Calculate Total Revenue (Sales Turnover)
        // Sum of all sales (Quantity × Selling Price)
        const revenue = orders.reduce((total: number, order: Order) => {
          if (!order.items) return total;
          const orderRevenue = order.items.reduce((itemTotal: number, item: any) => {
            // Handle both field name formats: productId/product_id and variantId/variant_id
            const productId = item.productId || item.product_id;
            const variantId = item.variantId || item.variant_id;
            
            if (!productId || !variantId) {
              console.warn(`Missing productId or variantId in item:`, item);
              return itemTotal;
            }
            
            // We need to get the price from the variant data
            const variant = variants.find(v => v.id === variantId);
            if (!variant) {
              console.warn(`Variant not found for item:`, item);
              return itemTotal;
            }
            const itemPrice = variant.price;
            return itemTotal + (item.quantity * itemPrice);
          }, 0);
          return total + orderRevenue;
        }, 0);
        setTotalRevenue(revenue);

        // Calculate Average Order Value (AOV)
        // AOV = Total Revenue / Number of Orders
        const aov = orders.length > 0 ? revenue / orders.length : 0;
        setAverageOrderValue(aov);

        // Calculate Revenue by Category
        // Revenue (per category) = ∑(Selling Price of product × Quantity Sold)
        const categoryRevenue: Record<string, number> = {};
        orders.forEach((order: Order) => {
          if (!order.items) return;
          order.items.forEach((item: any) => {
            // Handle both field name formats: productId/product_id and variantId/variant_id
            const productId = item.productId || item.product_id;
            const variantId = item.variantId || item.variant_id;
            
            if (!productId || !variantId) {
              console.warn(`Missing productId or variantId in item:`, item);
              return;
            }
            
            const product = products.find((p: Product) => p.id === productId);
            if (product) {
              const category = product.category;
              const variant = variants.find(v => v.id === variantId);
              if (variant) {
                const itemPrice = variant.price;
                const itemRevenue = item.quantity * itemPrice;
                categoryRevenue[category] = (categoryRevenue[category] || 0) + itemRevenue;
              }
            }
          });
        });
        setRevenueByCategory(categoryRevenue);

        // Calculate Total Inventory Value (Selling)
        // Total Inventory Value = ∑(Selling Price × Units in Stock)
        const inventoryValue = variants.reduce((total: number, variant: Variant) => {
          return total + (variant.price * variant.units_in_stock);
        }, 0);
        setTotalInventoryValue(inventoryValue);

      } catch (error: any) {
        console.error('Error fetching financial data:', error);
        // Log more details about the error
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  // Calculate revenue trends when orders change
  useEffect(() => {
    if (orders.length > 0) {
      const trends = calculateRevenueTrends(
        orders,
        variants
      );
      setRevenueTrendData(trends);
      // Set default date range (last 1 month)
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      setStartDate(oneMonthAgo);
      setEndDate(now);
    }
  }, [orders, variants]);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Helper function to calculate revenue trends, now grouping by day
  const calculateRevenueTrends = (
    orders: Order[],
    variants: any[],
    filterCategory?: string,
    filterProduct?: string
  ) => {
    if (!orders || orders.length === 0) return [];

    const revenueMap = new Map<string, number>();

    // Group orders by time interval
  orders.forEach(order => {
      if (!order.created_at) return;
      const orderDate = new Date(order.created_at);
      // Use daily interval: YYYY-MM-DD
      const periodKey = orderDate.toISOString().split('T')[0];

      let orderRevenue = 0;
      if (order.items) {
        order.items.forEach((item: any) => {
          const productId = item.productId || item.product_id;
          const variantId = item.variantId || item.variant_id;
          if (filterProduct && productId !== filterProduct) return;
          if (filterCategory) {
            const product = products.find((p: Product) => p.id === productId);
            if (!product || product.category !== filterCategory) return;
          }
          const variant = variants.find(v => v.id === variantId);
          if (variant) {
            orderRevenue += (item.quantity * variant.price);
          }
        });
      }

      revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + orderRevenue);
    });

    // Convert to array and sort by date
    const revenueData: RevenueDataPoint[] = Array.from(revenueMap.entries()).map(([period, revenue]) => {
      const date = new Date(period);
      return { period, revenue, date };
    });

    // Sort by date
    revenueData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate growth percentages
    revenueData.forEach((dataPoint, index) => {
      if (index > 0) {
        const previousRevenue = revenueData[index - 1].revenue;
        if (previousRevenue > 0) {
          dataPoint.growth = ((dataPoint.revenue - previousRevenue) / previousRevenue) * 100;
        }
      }
    });

    return revenueData;
  };

  // Function to filter data by date range
  const filterDataByDateRange = (data: RevenueDataPoint[], start: Date | null, end: Date | null) => {
    if (!start || !end) {
      // If no date range is selected, show last 1 month by default
      const oneMonthAgo = new Date();
      const now = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return data.filter(item => {
        const itemDate = item.date;
        return itemDate >= oneMonthAgo && itemDate <= now;
      });
    }
    // Compare by full date (not just year/month)
    const startTime = new Date(start.setHours(0,0,0,0)).getTime();
    const endTime = new Date(end.setHours(23,59,59,999)).getTime();
    return data.filter(item => {
      const itemTime = new Date(item.date.setHours(0,0,0,0)).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
  };

  // Export to Excel function
  const handleExportExcel = () => {
    const filteredData = filterDataByDateRange(revenueTrendData, startDate, endDate);
    
    if (filteredData.length === 0) {
      alert('No data to export for the selected date range');
      return;
    }

    const exportData = filteredData.map((dataPoint) => ({
      'Period': dataPoint.period,
      'Revenue (₹)': dataPoint.revenue,
      'Growth %': dataPoint.growth !== undefined ? `${dataPoint.growth >= 0 ? '+' : ''}${dataPoint.growth.toFixed(1)}%` : '—',
      'Date': dataPoint.date.toLocaleDateString(),
      'Revenue Formatted': new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(dataPoint.revenue)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Trends");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const fileName = `revenue_trends_${startDate?.toISOString().slice(0, 10)}_to_${endDate?.toISOString().slice(0, 10)}.xlsx`;
    saveAs(data, fileName);
  };

  // Simple chart rendering function
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Analysis</h1>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: '180px' }}>
          <p className="text-gray-500">Total Revenue</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-green-600">
              {loading ? "Loading..." : formatCurrency(totalRevenue)}
            </p>
            {!loading && (
              <p className="text-sm text-gray-400 mt-2">
                Total sales from all orders
              </p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: '180px' }}>
          <p className="text-gray-500">Average Order Value (AOV)</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {loading ? "Loading..." : formatCurrency(averageOrderValue)}
            </p>
            {!loading && (
              <p className="text-sm text-gray-400 mt-2">
                Average amount per order
              </p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: '180px' }}>
          <p className="text-gray-500">Revenue by Category</p>
          <div className="mt-1 flex-1">
            {loading ? (
              <p className="text-2xl font-bold mt-1 text-purple-600">Loading...</p>
            ) : Object.keys(revenueByCategory).length > 0 ? (
              <div className="mt-2 space-y-2">
                {Object.entries(revenueByCategory).slice(0, 3).map(([category, revenue]) => {
                  const categoryProduct = products.find((p: Product) => p.category === category);
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {categoryProduct?.images?.main && (
                          <img 
                            src={categoryProduct.images.main} 
                            alt={category}
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="capitalize text-purple-700 font-medium">{category}</span>
                      </div>
                      <span className="font-semibold text-purple-600">{formatCurrency(revenue)}</span>
                    </div>
                  );
                })}
                {Object.keys(revenueByCategory).length > 3 && (
                  <div className="text-purple-500 italic text-sm pt-1">+{Object.keys(revenueByCategory).length - 3} more</div>
                )}
              </div>
            ) : (
              <p className="text-purple-400 text-sm mt-2">No revenue data available</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between" style={{ minHeight: '180px' }}>
          <p className="text-gray-500">Total Inventory Value</p>
          <div className="mt-1 flex-1">
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {loading ? "Loading..." : formatCurrency(totalInventoryValue)}
            </p>
            {!loading && (
              <p className="text-sm text-gray-400 mt-2">
                Current stock value
              </p>
            )}
          </div>
        </div>
      </div>

      {/* No Data Message */}
      {!loading && orders.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-600">No Orders Found</h2>
          <p className="text-gray-500">There are no orders in the system yet. Financial metrics will appear here once orders are created.</p>
        </div>
      )}
<div className="bg-white p-6 rounded-lg shadow mb-6">
  <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
      <div className="w-full h-[300px] flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(revenueByCategory).map(([category, revenue]) => ({ category, revenue }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" label={{ value: 'Category', position: 'insideBottom', offset: -5 }} />
              <YAxis tickFormatter={(value: number) => `₹${value}`} />
              <Tooltip formatter={(value: number) => `₹${value}`} />
              <Legend />
              <Bar dataKey="revenue">
                {Object.entries(revenueByCategory).map(([category]) => {
                  let fill = '#a855f7'; // default purple
                  if (category.toLowerCase() === 'honey') fill = '#fbbf24';
                  else if (category.toLowerCase() === 'ghee') fill = '#fb923c';
                  else if (category.toLowerCase() === 'oils' || category.toLowerCase() === 'oil') fill = '#a855f7'; // purple
                  return <Cell key={category} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(revenueByCategory).map(([category, revenue]) => ({ name: category, value: revenue }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {Object.entries(revenueByCategory).map(([category]) => {
                  let fill = '#a855f7'; // default purple
                  if (category.toLowerCase() === 'honey') fill = '#fbbf24';
                  else if (category.toLowerCase() === 'ghee') fill = '#fb923c';
                  else if (category.toLowerCase() === 'oils' || category.toLowerCase() === 'oil') fill = '#a855f7'; // purple
                  return <Cell key={category} fill={fill} />;
                })}
              </Pie>
              <Tooltip formatter={(value: number) => `₹${value}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
  </div>
      {/* Error Message */}
      {!loading && totalRevenue === 0 && orders.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Unable to Load Data</h2>
          <p className="text-gray-500">Please check the browser console for detailed error information. Make sure you have:</p>
          <ul className="text-gray-500 mt-2 list-disc list-inside">
            <li>Products in your database</li>
            <li>Variants for those products</li>
            <li>Orders with items</li>
            <li>Proper authentication</li>
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue Growth Trend</h2>
        
        {/* Filters and Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Date Inputs */}
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
              <label className="text-sm font-medium text-gray-700">
                End Date:
              </label>
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

            

            {/* Export Button */}
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

        {/* Revenue Trend Data */}
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
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Today's Revenue</p>
                <p className="text-lg font-bold text-blue-800">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const todayRevenue = filterDataByDateRange(revenueTrendData, startDate, endDate)
                      .filter(item => {
                        const itemDate = new Date(item.date);
                        itemDate.setHours(0, 0, 0, 0);
                        return itemDate.getTime() === today.getTime();
                      })
                      .reduce((sum, item) => sum + item.revenue, 0);
                    
                    return formatCurrency(todayRevenue);
                  })()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Period Revenue</p>
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(
                    filterDataByDateRange(revenueTrendData, startDate, endDate)
                      .reduce((sum, item) => sum + item.revenue, 0)
                  )}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">Avg. Revenue/Period</p>
                <p className="text-lg font-bold text-purple-800">
                  {(() => {
                    const filteredData = filterDataByDateRange(revenueTrendData, startDate, endDate);
                    if (filteredData.length === 0) return '—';
                    const total = filteredData.reduce((sum, item) => sum + item.revenue, 0);
                    return formatCurrency(total / filteredData.length);
                  })()}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">Growth Trend</p>
                <p className="text-lg font-bold text-orange-800">
                  {(() => {
                    const filteredData = filterDataByDateRange(revenueTrendData, startDate, endDate);
                    if (filteredData.length < 2) return '—';
                    const firstRevenue = filteredData[0].revenue;
                    const lastRevenue = filteredData[filteredData.length - 1].revenue;
                    if (firstRevenue === 0) return '—';
                    const growth = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
                    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
                  })()}
                </p>
              </div>
            </div>
            
            {filterDataByDateRange(revenueTrendData, startDate, endDate).length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center ring-1 ring-gray-200">
                <p className="text-gray-500 text-lg">
                  No revenue data found for the selected date range
                </p>
                <button
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                        Period
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                        Revenue
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                        Growth %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filterDataByDateRange(revenueTrendData, startDate, endDate).map((dataPoint, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dataPoint.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(dataPoint.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {dataPoint.growth !== undefined ? (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              dataPoint.growth >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {dataPoint.growth >= 0 ? '+' : ''}{dataPoint.growth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        
        
        <div id="revenue-chart" className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Growth Trend</h2>
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Chart Type:</label>
            <select
              value={selectedChartType}
              onChange={e => setSelectedChartType(e.target.value as 'line' | 'bar')}
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
                // Always use the same filtered data for both table and chart
                const filteredChartData = filterDataByDateRange(revenueTrendData, startDate, endDate);
                if (filteredChartData.length === 0) {
                  return <div className="flex items-center justify-center h-full text-gray-400">No data for selected range</div>;
                }
                if (selectedChartType === 'bar') {
                  return (
                    <BarChart data={filteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                      <YAxis tickFormatter={(value: number) => `₹${value}`} label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: number) => `₹${value}`} />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  );
                }
                // For line chart, show dots for all points, and a message if only one point
                if (filteredChartData.length === 1) {
                  return (
                    <LineChart data={filteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                      <YAxis tickFormatter={(value: number) => `₹${value}`} label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: number) => `₹${value}`} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 6, fill: '#3b82f6' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  );
                }
                return (
                  <LineChart data={filteredChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(value: number) => `₹${value}`} label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => `₹${value}`} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
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


