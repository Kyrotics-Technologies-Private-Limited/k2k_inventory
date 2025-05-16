const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const firebaseAuth = require('../middleware/firebaseAuth'); // Ensure this path is correct

router.use(firebaseAuth);

router.get('/', addressController.getAllAddresses);
router.post('/', addressController.createAddress);
router.get('/:id', addressController.getAddressById);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.put('/:id/default', addressController.setDefaultAddress);

module.exports = router;
