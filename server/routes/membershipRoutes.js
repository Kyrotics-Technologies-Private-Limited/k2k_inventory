const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

const adminOnly = [firebaseAuth, requireAdmin];

// Public read routes
router.get('/', membershipController.getMemberships);
router.get('/:membershipId', membershipController.getMembership);

// Admin-only membership tier management
router.post('/', adminOnly, membershipController.createMembership);
router.put('/:membershipId', adminOnly, membershipController.updateMembership);
router.delete('/:membershipId', adminOnly, membershipController.deleteMembership);

// Authenticated user operations
router.post('/buy', firebaseAuth, membershipController.buyMembership);
router.post('/cancel', firebaseAuth, membershipController.cancelMembership);
router.get('/user/:userId', firebaseAuth, membershipController.getUserMemberships);

module.exports = router;
