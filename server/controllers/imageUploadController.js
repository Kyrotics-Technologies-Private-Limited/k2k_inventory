const multer = require('multer');
const { bucket } = require('../firebase/firebase-config');

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
 * Handle storage errors cleanly and return appropriate HTTP response
 */
function handleStorageError(res, error, operation) {
  console.error(`Storage error during ${operation}:`, error.code || error.message);

  if (
    error.code === 'STORAGE_NOT_CONFIGURED' ||
    error.code === 'STORAGE_BUCKET_NOT_FOUND' ||
    error.code === 404 ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('bucket') ||
    error.message?.includes('ENOTFOUND') ||
    error.message?.includes('Not Found')
  ) {
    return res.status(503).json({
      error: 'Firebase Storage is unprovisioned or unavailable in this environment. Please ensure the Google Cloud Storage bucket exists.',
      code: 'STORAGE_UNAVAILABLE',
    });
  }

  return res.status(500).json({
    error: 'Image upload failed due to internal storage error',
    code: 'STORAGE_ERROR',
  });
}

/**
 * Upload buffer to Firebase Storage bucket and return accessible Firebase Storage media URL.
 * Catches makePublic error if uniform bucket-level access is enabled.
 */
async function saveAndGetUrl(fileUpload, buffer, mimetype, fileName) {
  if (!bucket || !bucket.name) {
    const err = new Error('Firebase Storage bucket is not configured or initialized');
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }

  try {
    await fileUpload.save(buffer, {
      metadata: { contentType: mimetype },
    });
    try {
      await fileUpload.makePublic();
    } catch (err) {
      // Ignore error if uniform bucket-level access is enabled
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
  } catch (err) {
    if (err.code === 404 || err.message?.includes('Not Found') || err.message?.includes('bucket')) {
      const storageErr = new Error(`Firebase Storage bucket '${bucket.name}' was not found in Google Cloud`);
      storageErr.code = 'STORAGE_BUCKET_NOT_FOUND';
      throw storageErr;
    }
    throw err;
  }
}

// Controller to upload images to Firebase Storage
const uploadGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    if (!bucket) {
      return handleStorageError(res, { code: 'STORAGE_NOT_CONFIGURED' }, 'uploadGalleryImages');
    }
    const uploadPromises = req.files.map(async (file) => {
      const fileName = `product-gallery/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      return saveAndGetUrl(fileUpload, file.buffer, file.mimetype, fileName);
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    return handleStorageError(res, error, 'uploadGalleryImages');
  }
};

// Controller to upload main image to Firebase Storage
const uploadMainImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!bucket) {
      return handleStorageError(res, { code: 'STORAGE_NOT_CONFIGURED' }, 'uploadMainImageHandler');
    }
    const fileName = `product-main/${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    const url = await saveAndGetUrl(fileUpload, req.file.buffer, req.file.mimetype, fileName);
    res.status(200).json({ url });
  } catch (error) {
    return handleStorageError(res, error, 'uploadMainImageHandler');
  }
};

// Controller to upload badge image to Firebase Storage
const uploadBadgeImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!bucket) {
      return handleStorageError(res, { code: 'STORAGE_NOT_CONFIGURED' }, 'uploadBadgeImageHandler');
    }
    const fileName = `badge-images/${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    const url = await saveAndGetUrl(fileUpload, req.file.buffer, req.file.mimetype, fileName);
    res.status(200).json({ url });
  } catch (error) {
    return handleStorageError(res, error, 'uploadBadgeImageHandler');
  }
};

// Controller to upload multiple badge images to Firebase Storage
const uploadMultipleBadgeImagesHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    if (!bucket) {
      return handleStorageError(res, { code: 'STORAGE_NOT_CONFIGURED' }, 'uploadMultipleBadgeImagesHandler');
    }
    const uploadPromises = req.files.map(async (file) => {
      const fileName = `badge-images/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      return saveAndGetUrl(fileUpload, file.buffer, file.mimetype, fileName);
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    return handleStorageError(res, error, 'uploadMultipleBadgeImagesHandler');
  }
};

// Controller to upload multiple health badge images to Firebase Storage
const uploadMultipleHealthBadgeImagesHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    if (!bucket) {
      return handleStorageError(res, { code: 'STORAGE_NOT_CONFIGURED' }, 'uploadMultipleHealthBadgeImagesHandler');
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
    return handleStorageError(res, error, 'uploadMultipleHealthBadgeImagesHandler');
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
