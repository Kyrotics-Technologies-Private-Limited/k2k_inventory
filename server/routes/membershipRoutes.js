const express = require('express');
const router = express.Router();
const { getMembershipSettings, updateMembershipSettings } = require('../controllers/membershipController');

// GET /api/membership/settings
router.get('/settings', getMembershipSettings);

// PUT /api/membership/settings
router.put('/settings', updateMembershipSettings);

module.exports = router;