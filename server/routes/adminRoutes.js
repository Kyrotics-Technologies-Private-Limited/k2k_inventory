// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET /api/admin/users
router.get('/users', adminController.getAllUsers);

module.exports = router;
