const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/firebaseAuth');

// Protected routes
router.use(auth);

// Get all invoice reports
router.get('/invoices', reportController.getInvoiceReports);

module.exports = router;