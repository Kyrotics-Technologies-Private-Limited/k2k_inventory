// server/middleware/requireAdmin.js
const { db } = require('../firebase/firebase-config');

async function getAdminAccess({ uid, isAdmin, role }) {
  if (isAdmin === true || role === 'admin') return {};

  const doc = await db.collection('admin').doc(uid).get();
  const data = doc.exists ? doc.data() : null;
  return data?.isAdmin === true || data?.role === 'admin' ? data : null;
}

/**
 * Requires firebaseAuth to run first — attaches req.user.
 * Verifies admin privileges:
 * 1. Checks Firebase Auth custom claims: req.user.isAdmin === true || req.user.role === 'admin'
 * 2. Fallback: Checks the Firestore 'admin' document for an explicit admin role.
 * Returns 401 if unauthenticated, 403 if unauthorized.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }

    if (await getAdminAccess(req.user)) {
      req.user.isAdmin = true;
      return next();
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
module.exports.getAdminAccess = getAdminAccess;

