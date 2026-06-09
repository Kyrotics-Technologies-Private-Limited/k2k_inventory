const { db } = require('../firebase/firebase-config');

/**
 * Requires firebaseAuth to run first — attaches req.user.uid.
 * Checks users/{uid}.isAdmin === true.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Forbidden - User not found' });
    }

    if (userDoc.data().isAdmin !== true) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = requireAdmin;
