const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const { uploadGallery, uploadGalleryImages, uploadMainImage, uploadMainImageHandler, uploadBadgeImage, uploadBadgeImageHandler, uploadMultipleBadgeImages, uploadMultipleBadgeImagesHandler } = require('../controllers/imageUploadController');

// Create a new product
router.post('/create', productController.createProduct);

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Update product
router.put('/:id', productController.updateProduct);

// Delete product
router.delete('/:id', productController.deleteProduct);

// Upload gallery images
router.post('/upload-gallery', uploadGallery, uploadGalleryImages);

// Upload main image
router.post('/upload-main-image', uploadMainImage, uploadMainImageHandler);

// Upload badge image
router.post('/upload-badge-image', uploadBadgeImage, uploadBadgeImageHandler);

// Upload multiple badge images
router.post('/upload-multiple-badge-images', uploadMultipleBadgeImages, uploadMultipleBadgeImagesHandler);

module.exports = router;