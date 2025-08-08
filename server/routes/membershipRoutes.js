const membershipController = require('../controllers/membershipController');
const express = require('express');
const router = express.Router();
const { getMembershipSettings, updateMembershipSettings } = require('../controllers/membershipController');

// Create membership
router.post('/', membershipController.createMembership);
// Get all memberships
router.get('/', membershipController.getMemberships);
// Buy membership
router.post('/buy', membershipController.buyMembership);
// Cancel membership
router.post('/cancel', membershipController.cancelMembership);

// GET /api/membership/settings
router.get('/settings', getMembershipSettings);

// PUT /api/membership/settings
router.put('/settings', updateMembershipSettings);
// Delete membership
router.delete('/:membershipId', membershipController.deleteMembership);
// Update membership
router.put('/:membershipId', membershipController.updateMembership);

module.exports = router;