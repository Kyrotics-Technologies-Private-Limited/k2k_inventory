const membershipController = require('../controllers/membershipController');
const express = require('express');
const router = express.Router();

// Create membership
router.post('/', membershipController.createMembership);

// Get all memberships
router.get('/', membershipController.getMemberships);

// Get a single membership by ID
router.get('/:membershipId', membershipController.getMembership);

// Update membership
router.put('/:membershipId', membershipController.updateMembership);

// Delete membership
router.delete('/:membershipId', membershipController.deleteMembership);

// Buy membership (for a user)
router.post('/buy', membershipController.buyMembership);

// Cancel membership (for a user)
router.post('/cancel', membershipController.cancelMembership);

// Get user's active memberships
router.get('/user/:userId', membershipController.getUserMemberships);

module.exports = router;