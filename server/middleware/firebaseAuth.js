// server/middleware/firebaseAuth.js
const { admin } = require('../firebase/firebase-config');

/**
 * Middleware to verify Firebase ID tokens.
 * Extracts token from 'Authorization: Bearer <idToken>'
 * Attaches verified user to req.user:
 * { uid, email, role, isAdmin, claims }
 */
const firebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1]?.trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized - Malformed authorization header' });
    }

    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach verified user identity to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: decodedToken.role || null,
      isAdmin: Boolean(decodedToken.isAdmin === true || decodedToken.role === 'admin'),
      claims: decodedToken,
    };

    next();
  } catch (error) {
    // Redact token details in logs
    console.error('Auth verification failed:', error.code || error.message);
    res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
  }
};

module.exports = firebaseAuth;
