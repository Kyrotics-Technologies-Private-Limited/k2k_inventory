const multer = require('multer');
const { bucket } = require('../firebase/firebase-config');
const path = require('path');

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle multiple file uploads (gallery)
const uploadGallery = upload.array('gallery', 10); // up to 10 images

// Controller to upload images to Firebase Storage
const uploadGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploadPromises = req.files.map(async (file) => {
      const fileName = `product-gallery/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      await fileUpload.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      // Make the file public and get the public URL
      await fileUpload.makePublic();
      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return url;
    });
    const urls = await Promise.all(uploadPromises);
    res.status(200).json({ urls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadGallery, uploadGalleryImages };
