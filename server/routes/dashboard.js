const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Dashboard API - Revenue Calculation Fix
 * 
 * CHANGED: Revenue calculation method from using order.total_amount to 
 * calculating from line items × variant prices (same as Finance Analysis)
 * 
 * This ensures consistency between Admin Dashboard and Finance Analysis pages.
 * 
 * Previous method: totalRevenue += data.total_amount
 * New method: Calculate revenue from each order item using current variant prices
 */

// Helper to check if a timestamp is from this month
function isThisMonth(timestamp) {
  const date = timestamp.toDate();
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

router.get("/stats", async (req, res) => {
  try {
    // Get date range parameters from query string
    const { startDate, endDate } = req.query;
    
    // Set default to last one month if no dates provided
    const currentDate = new Date();
    const defaultStartDate = new Date(currentDate);
    defaultStartDate.setMonth(currentDate.getMonth() - 1);
    
    // Parse dates consistently - treat as local dates, not UTC
    const startDateFilter = startDate ? new Date(startDate + 'T00:00:00') : defaultStartDate;
    const endDateFilter = endDate ? new Date(endDate + 'T23:59:59') : currentDate;
    
    // Helper function to check if a timestamp is within the date range
    function isWithinDateRange(timestamp) {
      if (!timestamp || !timestamp.toDate) return false;
      const date = timestamp.toDate();
      return date >= startDateFilter && date <= endDateFilter;
    }

    const ordersSnapshot = await db.collection("orders").get();
    const usersSnapshot = await db.collection("users").get();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let monthlyOrders = 0;

    const orderStatusCounts = {
      placed: 0,
      delivered: 0,
      cancelled: 0,
    };

    const chartData = {}; // e.g., { "2025-07-01": 1000 }

    // Sales aggregation windows
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const productSalesLast3Months = {}; // { [productId]: totalSold }
    const productSalesLastWeek = {}; // { [productId]: totalSold }

    // First, fetch all variants to calculate revenue accurately
    const productsSnapshot = await db.collection("products").get();
    const allVariants = new Map(); // variantId -> variant data
    
    // Fetch all variants from all products
    const variantFetches = productsSnapshot.docs.map(async (productDoc) => {
      const variantsSnapshot = await db.collection("products").doc(productDoc.id).collection("variants").get();
      variantsSnapshot.forEach((variantDoc) => {
        const variant = variantDoc.data();
        allVariants.set(variantDoc.id, {
          ...variant,
          productId: productDoc.id
        });
      });
    });
    await Promise.all(variantFetches);

    // Now calculate revenue using the same method as Finance Analysis
    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      const orderDate = data.createdAt || data.timestamp || null;
      const status = (data.status || "placed").toLowerCase();
      const items = Array.isArray(data.items) ? data.items : [];

      // Calculate revenue from line items (same as Finance Analysis)
      let orderRevenue = 0;
      items.forEach((item) => {
        const variantId = item.variantId || item.variant_id;
        const variant = allVariants.get(variantId);
        
        if (variant && typeof item.quantity === 'number' && typeof variant.price === 'number') {
          orderRevenue += item.quantity * variant.price;
        }
      });

      // Only count revenue for orders within the selected date range
      if (orderDate && isWithinDateRange(orderDate)) {
        totalRevenue += orderRevenue;
        monthlyRevenue += orderRevenue;
        monthlyOrders += 1;
        
        // Revenue by day (only for the selected date range)
        if (orderDate?.toDate) {
          const day = formatDate(orderDate.toDate());
          chartData[day] = (chartData[day] || 0) + orderRevenue;
        }
      }

      // Order status counts
      if (status in orderStatusCounts) {
        orderStatusCounts[status] += 1;
      }

      // Aggregate product sales for bestseller/quick seller windows
      const orderTs = orderDate;
      let orderJSDate = null;
      if (orderTs && typeof orderTs.toDate === "function") {
        orderJSDate = orderTs.toDate();
      } else if (orderTs && typeof orderTs === "string") {
        const parsed = new Date(orderTs);
        if (!isNaN(parsed.getTime())) orderJSDate = parsed;
      }

      if (orderJSDate) {
        items.forEach((item) => {
          const productId =
            item.productId || item.product_id || item.productID || (item.product && item.product.id);
          const quantity =
            typeof item.quantity === "number"
              ? item.quantity
              : typeof item.qty === "number"
              ? item.qty
              : typeof item.count === "number"
              ? item.count
              : 1;
          if (!productId) return;
          if (orderJSDate >= threeMonthsAgo) {
            productSalesLast3Months[productId] = (productSalesLast3Months[productId] || 0) + quantity;
          }
          if (orderJSDate >= oneWeekAgo) {
            productSalesLastWeek[productId] = (productSalesLastWeek[productId] || 0) + quantity;
          }
        });
      }
    });

    // Now process the variants for stock analysis (using the already fetched variants)
    let outOfStockVariants = [];
    let lowStockVariants = [];
    let overstockVariants = [];
    const productIdToName = {};
    const productIdToMainImage = {};
    const productTotalStock = {};
    const LOW_STOCK_THRESHOLD = 5;
    const OVERSTOCK_THRESHOLD = 100;
    
    // Process the already fetched variants for stock analysis
    productsSnapshot.docs.forEach((productDoc) => {
      const productData = productDoc.data();
      const productName = productData.name || productDoc.id;
      productIdToName[productDoc.id] = productName;
      try {
        productIdToMainImage[productDoc.id] =
          (productData.images && (productData.images.main || productData.images.banner)) || null;
      } catch (e) {
        productIdToMainImage[productDoc.id] = null;
      }
      
      // Get variants for this product from our allVariants map
      allVariants.forEach((variant, variantId) => {
        if (variant.productId === productDoc.id) {
          // accumulate total stock per product
          if (typeof variant.units_in_stock === 'number') {
            productTotalStock[productDoc.id] = (productTotalStock[productDoc.id] || 0) + variant.units_in_stock;
          }
          // Consider out of stock if units_in_stock is 0 or falsy
          if (variant.units_in_stock === 0 || variant.units_in_stock === undefined || variant.units_in_stock === null) {
            outOfStockVariants.push({
              product: productName,
              variant: variant.name || variant.weight || variantId || "Unnamed Variant",
              image: productIdToMainImage[productDoc.id] || null,
            });
          }

          const units = typeof variant.units_in_stock === 'number' ? variant.units_in_stock : null;
          if (units !== null && units > 0 && units <= LOW_STOCK_THRESHOLD) {
            lowStockVariants.push({
              product: productName,
              variant: variant.name || variant.weight || variantId || "Unnamed Variant",
              unitsInStock: units,
              image: productIdToMainImage[productDoc.id] || null,
            });
          }

          if (units !== null && units >= OVERSTOCK_THRESHOLD) {
            overstockVariants.push({
              product: productName,
              variant: variant.name || variant.weight || variantId || "Unnamed Variant",
              unitsInStock: units,
              image: productIdToMainImage[productDoc.id] || null,
            });
          }
        }
      });
    });


    // Filter chart data to the selected date range
    const chartArray = Object.entries(chartData)
      .map(([date, revenue]) => ({ date, revenue }))
      .filter(({ date }) => {
        const d = new Date(date);
        return d >= startDateFilter && d <= endDateFilter;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build bestseller/quick seller arrays
    const toEntries = (salesMap) =>
      Object.entries(salesMap).map(([productId, totalSold]) => ({
        productId,
        productName: productIdToName[productId] || productId,
        image: productIdToMainImage[productId] || null,
        totalSold,
      }));

    // Bestsellers: keep ONLY the most sold products (include ties), not top 5
    const best3MEntries = toEntries(productSalesLast3Months);
    const maxBest3M = best3MEntries.length
      ? Math.max(...best3MEntries.map((e) => e.totalSold))
      : 0;
    const bestsellersLast3Months = best3MEntries
      .filter((e) => e.totalSold === maxBest3M)
      .sort((a, b) => b.totalSold - a.totalSold);

    // Also provide top 5 bestsellers (independent of ties) for analysis views
    const top5BestsellersLast3Months = best3MEntries
      .slice()
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Quick sellers: keep top 5 by last week
    const quickSellersLastWeek = toEntries(productSalesLastWeek)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Least sellers: keep ONLY the least sold products (include ties), ignoring zeros if any
    const least3MEntries = best3MEntries.filter((e) => e.totalSold > 0);
    const minLeast3M = least3MEntries.length
      ? Math.min(...least3MEntries.map((e) => e.totalSold))
      : 0;
    const leastSellersLast3Months = (minLeast3M > 0
      ? least3MEntries.filter((e) => e.totalSold === minLeast3M)
      : [])
      .sort((a, b) => a.totalSold - b.totalSold);

    const slowWeekEntries = toEntries(productSalesLastWeek).filter((e) => e.totalSold > 0);
    const minSlowWeek = slowWeekEntries.length
      ? Math.min(...slowWeekEntries.map((e) => e.totalSold))
      : 0;
    const slowMoversLastWeek = (minSlowWeek > 0
      ? slowWeekEntries.filter((e) => e.totalSold === minSlowWeek)
      : [])
      .sort((a, b) => a.totalSold - b.totalSold);

    // Demanding products: percentile-based using last week's sales across ALL products
    const allProductIds = Object.keys(productIdToName);
    const salesVector = allProductIds.map((pid) => productSalesLastWeek[pid] || 0);
    const sortedSales = salesVector.slice().sort((a, b) => a - b);
    const percentileOf = (value) => {
      const countLE = sortedSales.filter((v) => v <= value).length;
      return Math.round((countLE / (sortedSales.length || 1)) * 100);
    };
    const demandingPool = allProductIds.map((productId) => {
      const sales = productSalesLastWeek[productId] || 0;
      return {
        productId,
        productName: productIdToName[productId] || productId,
        image: productIdToMainImage[productId] || null,
        lastWeekSales: sales,
        percentile: percentileOf(sales),
      };
    });
    demandingPool.sort((a, b) => b.percentile - a.percentile || b.lastWeekSales - a.lastWeekSales);
    const demandingTopK = Math.max(5, Math.ceil(demandingPool.length * 0.1));
    const demandingProducts = demandingPool.slice(0, demandingTopK);

    // Log revenue calculation for debugging
    console.log('Dashboard Revenue Calculation:');
    console.log('- Date Range:', startDateFilter.toISOString(), 'to', endDateFilter.toISOString());
    console.log('- Total Revenue (filtered):', totalRevenue);
    console.log('- Monthly Revenue:', monthlyRevenue);
    console.log('- Total Orders (filtered):', monthlyOrders);
    console.log('- Total Orders (all):', ordersSnapshot.size);
    console.log('- Chart Data Points:', chartArray.length);
    console.log('- Revenue calculation method: Line items × Variant prices');

    const response = {
      totalRevenue,
      monthlyRevenue,
      monthlyOrders,
      totalOrders: ordersSnapshot.size,
      totalCustomers: usersSnapshot.size,
      orderStatusCounts,
      revenueChart: chartArray, // for charts
      outOfStockVariants, // new field for dashboard warning
      bestsellersLast3Months,
      top5BestsellersLast3Months,
      quickSellersLastWeek,
      leastSellersLast3Months,
      slowMoversLastWeek,
      lowStockVariants,
      overstockVariants,
      demandingProducts,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

module.exports = router