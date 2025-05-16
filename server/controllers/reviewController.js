const { db } = require('../firebase/firebase-config');

exports.createReview = async (req, res) => {
    try {
      const { rating, comment, productId } = req.body;
      const userId = req.user.uid; // changed from req.user.id
  
      if (!rating || !comment || !productId) {
        return res.status(400).json({ error: "All fields are required: rating, comment, productId, userId." });
      }
  
      const review = {
        rating,
        comment,
        productId,
        userId, // now valid
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
  
      const docRef = await db.collection('reviews').add(review);
      res.status(201).json({ id: docRef.id, ...review });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

exports.getProductReviews = async (req, res) => {
	try {
		const { productId } = req.params;
		const snapshot = await db.collection('reviews').where('productId', '==', productId).get();
		let reviews = [];
		snapshot.forEach(doc => { reviews.push({ id: doc.id, ...doc.data() }); });
		res.status(200).json(reviews);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

exports.updateOwnReview = async (req, res) => {
	try {
		const { id } = req.params;
		const { rating, comment } = req.body;
		const reviewRef = await db.collection('reviews').doc(id);
		const reviewSnapshot = await reviewRef.get();
		if (!reviewSnapshot.exists) {
			return res.status(404).json({ error: "Review not found" });
		}
		const reviewData = reviewSnapshot.data();
		if (reviewData.userId !== req.user.uid) { // changed from req.user.id
			return res.status(403).json({ error: "Unauthorized" });
		}
		const updatedReview = {
			rating: rating ?? reviewData.rating,
			comment: comment ?? reviewData.comment,
			updatedAt: new Date().toISOString()
		};
		await reviewRef.update(updatedReview);
		res.status(200).json({ id, ...reviewData, ...updatedReview });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

exports.deleteOwnReview = async (req, res) => {
	try {
		const { id } = req.params;
		const reviewRef = db.collection('reviews').doc(id);
		const reviewSnapshot = await reviewRef.get();
		if (!reviewSnapshot.exists) {
			return res.status(404).json({ error: "Review not found" });
		}
		const reviewData = reviewSnapshot.data();
		if (reviewData.userId !== req.user.uid) { // changed from req.user.id
			return res.status(403).json({ error: "Unauthorized" });
		}
		await reviewRef.delete();
		res.status(200).json({ message: "Review deleted successfully." });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

exports.getCurrentUserReview = async (req, res) => {
	try {
		const userId = req.user.uid; // changed from req.user.id
		const snapshot = await db.collection('reviews').where('userId', '==', userId).get();
		let reviews = [];
		snapshot.forEach(doc => { reviews.push({ id: doc.id, ...doc.data() }); });
		res.status(200).json(reviews);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};