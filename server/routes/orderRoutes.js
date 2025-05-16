const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/firebaseAuth');

// Apply auth middleware to all order routes
router.use(auth);

router.post('/create', orderController.createOrder);

// Admin routes (add admin middleware if needed)
router.get('/getAllOrders', orderController.getAllOrders);
router.get('/getOrder/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);

// User routes
router.get('/', orderController.getOrders);
router.put('/:id/cancel', orderController.cancelOrderById);
router.get('/:id/tracking', orderController.getTracking);


module.exports = router;