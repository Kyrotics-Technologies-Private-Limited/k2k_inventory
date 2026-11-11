const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

// Protected admin routes
router.use([firebaseAuth, requireAdmin]);

// Get all invoice reports
router.get('/invoices', reportController.getInvoiceReports);

module.exports = router;
