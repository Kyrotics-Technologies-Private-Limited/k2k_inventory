const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');

// Create a new category
router.post('/create', categoryController.createCategory);

// Get all categories
router.get('/', categoryController.getAllCategories);

// Update category
router.put('/:id', categoryController.updateCategory);

// Delete category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
