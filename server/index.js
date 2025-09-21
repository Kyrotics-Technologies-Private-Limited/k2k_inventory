const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './config.env' }); // ✅ Correct usage

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5567;

// Routes
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require("./routes/cartRoutes");
const authRoutes = require("./routes/authRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
const variantRoutes = require("./routes/variantRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboard");
const membershipRoutes = require("./routes/membershipRoutes");
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/products', productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/membership", membershipRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin/reports', reportRoutes);


app.get("/", (req, res) => {
  res.send("k2k inventory API");
});

// Test endpoint for debugging
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    routes: [
      "/api/products",
      "/api/variants", 
      "/api/orders",
      "/api/dashboard"
    ]
  });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
