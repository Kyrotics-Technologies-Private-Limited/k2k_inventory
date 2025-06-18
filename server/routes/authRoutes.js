// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Admin Signup Route
router.post('/admin/signup', authController.adminSignup);

// Admin Login Route (token-based)
router.post('/admin/login', authController.adminLogin);

module.exports = router;
