const express = require('express');
const router = express.Router();
const variantController = require('../controllers/VariantController');

// Get all variants (across all products)
router.get('/', variantController.getAllVariants);

// Create a new variant for a product
router.post('/:productId/createVariant', variantController.createVariant);

// Get all variants for a product
router.get('/:productId/getVariants', variantController.getProductVariants);

// Get a specific variant
router.get('/:productId/getVariant/:variantId', variantController.getVariant);

// Update a variant
router.put('/:productId/updateVariant/:variantId', variantController.updateVariant);

// Delete a variant
router.delete('/:productId/deleteVariant/:variantId', variantController.deleteVariant);

module.exports = router; 