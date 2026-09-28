const multer = require('multer');
const { bucket } = require('../firebase/firebase-config');
const path = require('path');

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle multiple file uploads (gallery)
const uploadGallery = upload.array('gallery', 10); // up to 10 images

// Middleware to handle single main image upload
const uploadMainImage = upload.single('mainImage');

// Middleware to handle single badge image upload
const uploadBadgeImage = upload.single('badgeImage');

// Middleware to handle multiple badge image uploads
const uploadMultipleBadgeImages = upload.array('badgeImages', 10); // up to 10 badge images

// Middleware to handle multiple health badge image uploads
const uploadMultipleHealthBadgeImages = upload.array('healthBadgeImages', 10); // up to 10 health badge images

/**
 * Upload buffer to Firebase Storage bucket and return accessible Firebase Storage media URL.
 * Catches makePublic error if uniform bucket-level access is enabled.
 */
async function saveAndGetUrl(fileUpload, buffer, mimetype, fileName) {
  await fileUpload.save(buffer, {
    metadata: { contentType: mimetype },
  });
  try {
    await fileUpload.makePublic();
  } catch (err) {
    // Ignore error if uniform bucket-level access is enabled
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
}

// Controller to upload images to Firebase Storage
const uploadGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploadPromises = req.files.map(async (file) => {
      const fileName = `product-gallery/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      return saveAndGetUrl(fileUpload, file.buffer, file.mimetype, fileName);
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    console.error('uploadGalleryImages error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller to upload main image to Firebase Storage
const uploadMainImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileName = `product-main/${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    const url = await saveAndGetUrl(fileUpload, req.file.buffer, req.file.mimetype, fileName);
    res.status(200).json({ url });
  } catch (error) {
    console.error('uploadMainImageHandler error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller to upload badge image to Firebase Storage
const uploadBadgeImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileName = `badge-images/${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    const url = await saveAndGetUrl(fileUpload, req.file.buffer, req.file.mimetype, fileName);
    res.status(200).json({ url });
  } catch (error) {
    console.error('uploadBadgeImageHandler error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller to upload multiple badge images to Firebase Storage
const uploadMultipleBadgeImagesHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploadPromises = req.files.map(async (file) => {
      const fileName = `badge-images/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      return saveAndGetUrl(fileUpload, file.buffer, file.mimetype, fileName);
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    console.error('uploadMultipleBadgeImagesHandler error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller to upload multiple health badge images to Firebase Storage
const uploadMultipleHealthBadgeImagesHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const baseTimestamp = Date.now();
    const uploadPromises = req.files.map(async (file, index) => {
      const fileName = `health-badges/${baseTimestamp + index}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      return saveAndGetUrl(fileUpload, file.buffer, file.mimetype, fileName);
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    console.error('uploadMultipleHealthBadgeImagesHandler error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadGallery,
  uploadGalleryImages,
  uploadMainImage,
  uploadMainImageHandler,
  uploadBadgeImage,
  uploadBadgeImageHandler,
  uploadMultipleBadgeImages,
  uploadMultipleBadgeImagesHandler,
  uploadMultipleHealthBadgeImages,
  uploadMultipleHealthBadgeImagesHandler,
};
