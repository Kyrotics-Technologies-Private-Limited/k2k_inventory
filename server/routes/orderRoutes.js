const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  cancelOrder,
  updateOrder,
  trackOrder,
  getAllOrdersForAdmin,
  adminUpdateOrderStatus,
  adminGetOrderById,
} = require('../controllers/orderController');

// Middleware to protect routes
const auth = require('../middleware/firebaseAuth');

// All routes are protected
router.use(auth);

// Admin routes
router.get('/', getAllOrdersForAdmin);
router.get('/:orderId', adminGetOrderById);
router.patch('/:orderId/status', adminUpdateOrderStatus);

// User routes
router.post('/create', createOrder);
router.get('/', getAllOrders);// Get all orders for one user
//router.get('/:orderId', getOrderById);
router.put('/:orderId/cancel', cancelOrder);
router.put('/:orderId', updateOrder);
router.get('/:orderId/track', trackOrder);

module.exports = router;
