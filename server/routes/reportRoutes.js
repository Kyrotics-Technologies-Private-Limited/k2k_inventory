const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/firebaseAuth');

// Protected routes - only accessible by admin
router.use(protect);
router.use(restrictTo('admin'));

// Get all invoice reports
router.get('/invoices', reportController.getInvoiceReports);

module.exports = router;
