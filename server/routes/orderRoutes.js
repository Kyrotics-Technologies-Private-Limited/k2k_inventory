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
  getOrGenerateInvoice,
} = require('../controllers/orderController');

const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

// All order routes require authentication
router.use(firebaseAuth);

// Admin routes - strictly restricted to administrators
router.get('/', requireAdmin, getAllOrdersForAdmin);
router.get('/:orderId/invoice', requireAdmin, getOrGenerateInvoice);
router.get('/:orderId', requireAdmin, adminGetOrderById);
router.patch('/:orderId/status', requireAdmin, adminUpdateOrderStatus);

// User routes - authenticated customer operations
router.post('/create', createOrder);
router.get('/my-orders', getAllOrders);
router.put('/:orderId/cancel', cancelOrder);
router.put('/:orderId', updateOrder);
router.get('/:orderId/track', trackOrder);

module.exports = router;
