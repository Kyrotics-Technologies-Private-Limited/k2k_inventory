const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  uploadGallery,
  uploadGalleryImages,
  uploadMainImage,
  uploadMainImageHandler,
  uploadBadgeImage,
  uploadBadgeImageHandler,
  uploadMultipleBadgeImages,
  uploadMultipleBadgeImagesHandler,
  uploadMultipleHealthBadgeImages,
  uploadMultipleHealthBadgeImagesHandler
} = require('../controllers/imageUploadController');

const adminOnly = [firebaseAuth, requireAdmin];

// Public read routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin-only write routes
router.post('/create', adminOnly, productController.createProduct);
router.patch('/:id/status', adminOnly, productController.patchProductStatus);
router.put('/:id', adminOnly, productController.updateProduct);
router.delete('/:id', adminOnly, productController.deleteProduct);

// Admin-only image uploads
router.post('/upload-gallery', adminOnly, uploadGallery, uploadGalleryImages);
router.post('/upload-main-image', adminOnly, uploadMainImage, uploadMainImageHandler);
router.post('/upload-badge-image', adminOnly, uploadBadgeImage, uploadBadgeImageHandler);
router.post('/upload-multiple-badge-images', adminOnly, uploadMultipleBadgeImages, uploadMultipleBadgeImagesHandler);
router.post('/upload-multiple-health-badge-images', adminOnly, uploadMultipleHealthBadgeImages, uploadMultipleHealthBadgeImagesHandler);

module.exports = router;
