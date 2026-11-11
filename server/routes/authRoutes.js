const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

// Admin Signup Route - restricted to authenticated administrators
router.post('/admin/signup', [firebaseAuth, requireAdmin], authController.adminSignup);

// Admin Login Route (token exchange & validation)
router.post('/admin/login', authController.adminLogin);

module.exports = router;
