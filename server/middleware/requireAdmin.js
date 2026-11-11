// server/middleware/requireAdmin.js
const { db } = require('../firebase/firebase-config');

/**
 * Requires firebaseAuth to run first — attaches req.user.
 * Verifies admin privileges:
 * 1. Checks Firebase Auth custom claims: req.user.isAdmin === true || req.user.role === 'admin'
 * 2. Fallback: Checks Firestore 'admin' collection (doc id = uid) or 'users' collection (doc id = uid)
 * Returns 401 if unauthenticated, 403 if unauthorized.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }

    // 1. Authoritative Firebase custom claims check (fastest, cryptographically verified)
    if (req.user.isAdmin === true || req.user.role === 'admin') {
      req.user.isAdmin = true;
      return next();
    }

    // 2. Server-controlled Firestore 'admin' collection check (only accessible to backend)
    try {
      const adminDoc = await db.collection('admin').doc(uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        if (adminData.role === 'admin' || adminData.isAdmin === true) {
          req.user.isAdmin = true;
          return next();
        }
      }
    } catch (err) {
      console.warn('Checking admin collection warning:', err.message);
    }

    // Note: 'users' collection is intentionally NOT checked here to prevent
    // privilege escalation via client-writable user profile documents.
    return res.status(403).json({ error: 'Forbidden - Administrator privileges required' });
  } catch (error) {
    console.error('Error verifying administrator authorization:', error.message);
    return res.status(500).json({ error: 'Internal server authorization error' });
  }
};

module.exports = requireAdmin;

