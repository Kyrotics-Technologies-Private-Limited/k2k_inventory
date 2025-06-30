// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET /api/admin/users
router.get('/users', adminController.getAllUsers);

// GET /api/admin/customers/:customerId - Get customer details with order history
router.get('/customers/:customerId', adminController.getCustomerWithOrders);

module.exports = router;
