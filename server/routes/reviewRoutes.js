const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
// Assuming auth middleware that sets req.user
const auth = require('../middleware/firebaseAuth');

router.get('/my',auth, reviewController.getCurrentUserReview);
router.post('/create',auth, reviewController.createReview);
router.put('/:id',auth, reviewController.updateOwnReview);
router.get('/product/:productId', reviewController.getProductReviews);
router.delete('/:id',auth, reviewController.deleteOwnReview);

module.exports = router;