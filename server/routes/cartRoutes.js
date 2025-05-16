// src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/firebaseAuth');

// Apply auth middleware to all cart routes
router.use(auth);

// Cart routes
// router.get('/', cartController.getCart); // Get cart with items
// router.post('/items', cartController.addItemToCart); // Add item to cart
// router.put('/items/:id', cartController.updateCartItem); // Update item quantity
// router.delete('/items/:id', cartController.removeCartItem); // Remove single item
// router.delete('/items', cartController.clearCart); // Clear all items
// router.get('/summary', cartController.getCartSummary); // Get cart summary (total items)
router.post('/create',cartController.createCart);
router.get('/user', cartController.getUserCart);
router.get('/get', cartController.getCarts);
router.get('/:id', cartController.getCartById);
router.put('/:id', cartController.updateCart);
router.delete('/:id', cartController.deleteCart);
router.get('/:cartId/get', cartController.getCartItems);
router.post('/:cartId/items', cartController.addCartItem);
router.put('/:cartId/items/:itemId', cartController.updateCartItem);
router.delete('/:cartId/items/:itemId', cartController.removeCartItem);

module.exports = router;