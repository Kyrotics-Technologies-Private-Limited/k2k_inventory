const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

router.get('/manifest', catalogController.getManifest);
router.post('/manifest/rebuild', [firebaseAuth, requireAdmin], catalogController.rebuildManifest);

module.exports = router;
