const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.firestore();

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

    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      const orderDate = data.createdAt || data.timestamp || null;
      const status = (data.status || "placed").toLowerCase();

      if (data.total_amount && typeof data.total_amount === "number") {
        totalRevenue += data.total_amount;

        // Revenue by day
        if (orderDate?.toDate) {
          const day = formatDate(orderDate.toDate());
          chartData[day] = (chartData[day] || 0) + data.total_amount;
        }

        // Current month filtering
        if (orderDate && isThisMonth(orderDate)) {
          monthlyRevenue += data.total_amount;
          monthlyOrders += 1;
        }
      }

      // Order status counts
      if (status in orderStatusCounts) {
        orderStatusCounts[status] += 1;
      }
    });

    const chartArray = Object.entries(chartData).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const response = {
      totalRevenue,
      monthlyRevenue,
      monthlyOrders,
      totalOrders: ordersSnapshot.size,
      totalCustomers: usersSnapshot.size,
      orderStatusCounts,
      revenueChart: chartArray, // for charts
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

module.exports = router