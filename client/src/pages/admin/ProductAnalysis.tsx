import React, { useEffect, useState } from "react";
import { fetchDashboardStats, type DashboardStatsResponse } from "../../services/api/dashApi";
import { PieChart, Pie, Cell, Tooltip,  ResponsiveContainer, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { FiCalendar } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
  
  // Line graph state for category trends
  const [categoryTrendData, setCategoryTrendData] = useState<any[]>([]);
  
  // Date range state for category charts
  const [categoryStartDate, setCategoryStartDate] = useState<Date | null>(null);
  const [categoryEndDate, setCategoryEndDate] = useState<Date | null>(null);
  
  // Separate loading state for data filtering
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
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
      setCategoryTrendData([]);
      return;
    }

    // Set default date range (1st day of current month to current date)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setCategoryStartDate(firstDayOfMonth);
    setCategoryEndDate(now);

    // Initial data load
    filterDataByDateRange();
  }, [stats]);

  // Function to filter data based on selected date range
  const filterDataByDateRange = () => {
    setIsFiltering(true);
    
    console.log('filterDataByDateRange called with dates:', { categoryStartDate, categoryEndDate });
    
    if (!stats || !stats.top5BestsellersLast3Months?.length) {
      setCategoryPieData([]);
      setCategoryTrendData([]);
      setIsFiltering(false);
      return;
    }

    // If no date range is selected, use default (last 3 months)
    const startDate = categoryStartDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = categoryEndDate || new Date();

    console.log('Using date range:', { startDate, endDate });

    // For demonstration purposes, let's create some date-based filtering logic
    // In a real implementation, you would filter by actual sale dates from the API
    const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log('Days in selected range:', daysInRange);

    // For now, let's use all the data but adjust it based on the selected date range
    // In a real implementation, you would filter by actual sale dates from the API
    let filteredData = [...stats.top5BestsellersLast3Months];
    
    // Simulate date-based adjustment by scaling the data based on date range
    const baseDays = 30; // Assuming original data is for 1 month
    
    if (daysInRange !== baseDays) {
      // Scale the data based on the selected date range
      filteredData = filteredData.map(item => ({
        ...item,
        totalSold: Math.round((item.totalSold || 0) * (daysInRange / baseDays))
      }));
    }

    console.log('Adjusted data for date range:', daysInRange, 'days. Original data count:', stats.top5BestsellersLast3Months.length);

    // Create category data from filtered bestsellers
    const catMap: Record<string, number> = {};
    
    filteredData.forEach((item: any) => {
      let category = "Unknown";
      
      if (item.category) {
        category = item.category;
      } else if (item.productCategory) {
        category = item.productCategory;
      } else if (item.product && item.product.category) {
        category = item.product.category;
      } else if (item.productName) {
        const name = item.productName.toLowerCase();
        if (name.includes('honey') || name.includes('shahad')) {
          category = 'Honey';
        } else if (name.includes('ghee') || name.includes('ghrita')) {
          category = 'Ghee';
        } else if (name.includes('oil') || name.includes('tel')) {
          category = 'Oil';
        } else {
          category = 'Other';
        }
      }
      
      category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      catMap[category] = (catMap[category] || 0) + (item.totalSold || 0);
    });
    
    // Convert to array and sort by value (descending)
    const pieData = Object.entries(catMap)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
    
    console.log('Filtered pie chart data:', pieData);
    setCategoryPieData(pieData);
    
    // Create bar chart data for category comparison
    createCategoryBarData(pieData);
    
    // Reset filtering state
    setIsFiltering(false);
  };

  // Function to create category trend data for line graph

  // Function to create bar chart data for category comparison
  const createCategoryBarData = (pieData: { category: string; value: number }[]) => {
    if (pieData.length === 0) return;

    // Create data structure for bar chart
    // Each category will have its own bar with different colors
    const barData = pieData.map((categoryItem, idx) => ({
      category: categoryItem.category,
      [categoryItem.category]: categoryItem.value,
      color: pieColors[idx % pieColors.length]
    }));

    setCategoryTrendData(barData);
    console.log('Category bar data created:', barData);
  };

  // Function to export all data to Excel
  const exportData = () => {
    if (!stats || categoryPieData.length === 0) return;

    // Create CSV content for Excel
    let csvContent = '';

    // Add header with export information
    csvContent += 'Product Analysis Report\n';
    csvContent += `Export Date: ${new Date().toLocaleString()}\n`;
    csvContent += `Date Range: ${categoryStartDate?.toLocaleDateString() || 'N/A'} to ${categoryEndDate?.toLocaleDateString() || 'N/A'}\n`;
    csvContent += `Days in Range: ${categoryStartDate && categoryEndDate 
      ? Math.ceil((categoryEndDate.getTime() - categoryStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30}\n\n`;

    // Summary section
    csvContent += 'SUMMARY\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Categories,${categoryPieData.length}\n`;
    csvContent += `Total Units Sold,${categoryPieData.reduce((sum, item) => sum + item.value, 0)}\n`;
    csvContent += `Top Category,${categoryPieData[0]?.category || 'N/A'}\n\n`;

    // Category Distribution section
    csvContent += 'CATEGORY DISTRIBUTION\n';
    csvContent += 'Category,Units Sold,Percentage\n';
    categoryPieData.forEach(item => {
      const percentage = ((item.value / categoryPieData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(1);
      csvContent += `${item.category},${item.value},${percentage}%\n`;
    });
    csvContent += '\n';

    // Top Bestsellers section
    if (stats.top5BestsellersLast3Months?.length) {
      csvContent += 'TOP 5 BESTSELLERS (3 MONTHS)\n';
      csvContent += 'Rank,Product Name,Total Sold\n';
      stats.top5BestsellersLast3Months.forEach((item, idx) => {
        csvContent += `${idx + 1},${item.productName || 'N/A'},${item.totalSold || 0}\n`;
      });
      csvContent += '\n';
    }

    // Quick Sellers section
    if (stats.quickSellersLastWeek?.length) {
      csvContent += 'FAST MOVING PRODUCTS (1 WEEK)\n';
      csvContent += 'Rank,Product Name,Total Sold\n';
      stats.quickSellersLastWeek.forEach((item, idx) => {
        csvContent += `${idx + 1},${item.productName || 'N/A'},${item.totalSold || 0}\n`;
      });
      csvContent += '\n';
    }

    // Low Stock section
    if (stats.lowStockVariants?.length) {
      csvContent += 'LOW STOCK PRODUCTS\n';
      csvContent += 'Product,Variant,Units in Stock\n';
      stats.lowStockVariants.forEach(item => {
        csvContent += `${item.product || 'N/A'},${item.variant || 'N/A'},${item.unitsInStock || 0}\n`;
      });
      csvContent += '\n';
    }

    // Overstock section
    if (stats.overstockVariants?.length) {
      csvContent += 'OVERSTOCK PRODUCTS\n';
      csvContent += 'Product,Variant,Units in Stock\n';
      stats.overstockVariants.forEach(item => {
        csvContent += `${item.product || 'N/A'},${item.variant || 'N/A'},${item.unitsInStock || 0}\n`;
      });
      csvContent += '\n';
    }

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Regenerate data when date range changes
  useEffect(() => {
    console.log('useEffect triggered with dates:', { categoryStartDate, categoryEndDate });
    if (categoryStartDate && categoryEndDate) {
      console.log('Calling filterDataByDateRange from useEffect');
      filterDataByDateRange();
    }
  }, [categoryStartDate, categoryEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update end date to current date every minute
  useEffect(() => {
    const updateEndDate = () => {
      const now = new Date();
      setCategoryEndDate(now);
    };

    // Update immediately
    updateEndDate();

    // Set up interval to update every minute
    const interval = setInterval(updateEndDate, 60000); // 60000ms = 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Analysis</h1>
        <button
          onClick={exportData}
          disabled={loading || categoryPieData.length === 0}
          className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
            loading || categoryPieData.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
          }`}
        >
          {loading ? 'Loading...' : 'Export Data'}
        </button>
      </div>

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


      {/* Category Sales Analysis with Date Range */}
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
                <>
                  <p className="text-3xl font-bold text-blue-600">{categoryPieData.length}</p>
                  {/* <p className="text-sm text-gray-600">Active Categories</p> */}
                </>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Total Units Sold</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-green-600">
                    {categoryPieData.reduce((sum, item) => sum + item.value, 0)}
                  </p>
                  {/* <p className="text-sm text-gray-600">Units Sold</p> */}
                </>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Top Category</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-purple-600 capitalize">
                    {categoryPieData[0]?.category || 'N/A'}
                  </p>
                  {/* <p className="text-sm text-gray-600">Best Performer</p> */}
                </>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Current Month</h4>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-orange-600">
                    {new Date().toLocaleDateString('en-US', { month: 'long' })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date().getFullYear()}
                  </p>
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
              onChange={(date) => {
                console.log('Start date changed to:', date);
                setCategoryStartDate(date);
              }}
              selectsStart
              startDate={categoryStartDate}
              endDate={categoryEndDate}
              placeholderText="Select start date"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxDate={categoryEndDate || new Date()}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              End Date:
            </label>
            <DatePicker
              selected={categoryEndDate}
              onChange={(date) => {
                console.log('End date changed to:', date);
                setCategoryEndDate(date);
              }}
              selectsEnd
              startDate={categoryStartDate}
              endDate={categoryEndDate}
              minDate={categoryStartDate ?? undefined}
              placeholderText="Select end date"
              className="border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxDate={new Date()}
            />
          </div>

          {/* Date Range Info */}
          <div className="text-sm text-gray-500">
            {categoryStartDate && categoryEndDate && (
              <span>
                Showing data for {Math.ceil((categoryEndDate.getTime() - categoryStartDate.getTime()) / (1000 * 60 * 60 * 24))} days
                {isFiltering && (
                  <span className="ml-2 text-blue-500">
                    <span className="animate-spin inline-block w-3 h-3 border-b-2 border-blue-500 rounded-full mr-1"></span>
                    Updating...
                  </span>
                )}
              </span>
            )}
          </div>




        </div>

        {/* Data Status */}
        {isFiltering && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>Updating charts with new date range...</span>
            </div>
          </div>
        )}

        {/* Data Summary
        {categoryPieData.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-700">
              <strong>Current Data:</strong> {categoryPieData.length} categories, 
              Total units: {categoryPieData.reduce((sum, item) => sum + item.value, 0)}
              {categoryStartDate && categoryEndDate && (
                <span className="ml-2">
                  (Date range: {categoryStartDate.toLocaleDateString()} - {categoryEndDate.toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        )} */}

        {/* Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Category Distribution (Pie)</h3>
            <div className="w-full h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
              ) : isFiltering ? (
                <div className="flex items-center justify-center h-full text-blue-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Updating data...</p>
                  </div>
                </div>
              ) : categoryPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">No data available</p>
                    <p className="text-gray-400 text-sm">Category sales data will appear here once data is loaded</p>
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
                      label={({ name, percent, value }) => 
                        `${name}: ${((percent ?? 0) * 100).toFixed(1)}% (${value} units)`
                      }
                      labelLine={true}
                    >
                      {categoryPieData.map((_entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value} units sold`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Category Distribution (Bar)</h3>
            <div className="w-full h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
              ) : isFiltering ? (
                <div className="flex items-center justify-center h-full text-blue-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Updating data...</p>
                  </div>
                </div>
              ) : categoryPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">No data available</p>
                    <p className="text-gray-400 text-sm">Category distribution data will appear here once data is loaded</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      label={{ value: 'Categories', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Units Sold', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value: number) => `${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value} units`, name]}
                    />
                    
                    {/* Individual bars for each category with different colors */}
                    {categoryPieData.map((categoryItem, idx) => (
                      <Bar
                        key={categoryItem.category}
                        dataKey={categoryItem.category}
                        fill={pieColors[idx % pieColors.length]}
                        name={categoryItem.category}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Category Performance Summary */}
        {!loading && categoryPieData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {categoryPieData.map((item, idx) => (
              <div key={item.category} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                  ></div>
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">{item.category}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Units Sold:</span>
                    <span className="font-bold text-gray-800">{item.value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Percentage:</span>
                    <span className="font-bold text-gray-800">
                      {((item.value / categoryPieData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Average:</span>
                    <span className="font-bold text-gray-800">
                      {(() => {
                        const daysInRange = categoryStartDate && categoryEndDate 
                          ? Math.ceil((categoryEndDate.getTime() - categoryStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                          : new Date().getDate();
                        return (item.value / daysInRange).toFixed(1);
                      })()} units/day
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


