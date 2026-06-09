const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

const admin = [firebaseAuth, requireAdmin];

// Static paths before parameterized routes
router.put('/reorder', admin, categoryController.reorderCategories);

router.get('/by-slug/:slug/products', categoryController.getCategoryProductsBySlug);
router.get('/by-slug/:slug', categoryController.getCategoryBySlug);

router.get('/', categoryController.getAllCategories);
router.post('/', admin, categoryController.createCategory);

router.put('/:id/products/reorder', admin, categoryController.reorderCategoryProducts);
router.post('/:id/products', admin, categoryController.assignProduct);
router.patch('/:id/products/:productId', admin, categoryController.updateMembership);
router.delete('/:id/products/:productId', admin, categoryController.removeProduct);
router.get('/:id/products', categoryController.getCategoryProducts);

router.get('/:id', categoryController.getCategoryById);
router.put('/:id', admin, categoryController.updateCategory);
router.delete('/:id', admin, categoryController.deleteCategory);

module.exports = router;
