const express = require('express');
const router = express.Router();
const variantController = require('../controllers/VariantController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

const adminOnly = [firebaseAuth, requireAdmin];

// Public read routes
router.get('/', variantController.getAllVariants);
router.get('/single/:variantId', variantController.getVariantById);
router.get('/:productId/getVariants', variantController.getProductVariants);
router.get('/:productId/getVariant/:variantId', variantController.getVariant);
router.get('/:variantId', variantController.getVariantById);

// Admin-only write routes
router.post('/:productId/createVariant', adminOnly, variantController.createVariant);
router.put('/:productId/updateVariant/:variantId', adminOnly, variantController.updateVariant);
router.delete('/:productId/deleteVariant/:variantId', adminOnly, variantController.deleteVariant);

module.exports = router;
 