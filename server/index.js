const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// In testing mode, NEVER load server/config.env to prevent production contamination
if (process.env.APP_ENV !== 'testing' && !process.env.FIREBASE_PROJECT_ID) {
  require('dotenv').config({ path: path.join(__dirname, './config.env') });
}

const app = express();

// CORS configuration with controlled allowlist
const DEFAULT_ALLOWED_ORIGINS = [
  'https://univillage-inventory-testing.web.app',
  'https://univillage-inventory-testing.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:5567',
  'http://localhost:5568',
];

const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin header, e.g. curl, server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 8080;

// Health check endpoint (lightweight, safe for Cloud Run probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.APP_ENV || 'production',
  });
});

// Routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require("./routes/authRoutes");
const variantRoutes = require("./routes/variantRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const membershipRoutes = require("./routes/membershipRoutes");
const reportRoutes = require('./routes/reportRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

app.use('/api/products', productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/membership", membershipRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/catalog', catalogRoutes);

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

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

