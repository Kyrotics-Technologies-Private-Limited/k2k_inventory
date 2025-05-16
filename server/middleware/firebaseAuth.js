// src/middleware/auth.js
const { admin } = require('../firebase/firebase-config');

// Middleware to verify Firebase ID token
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user to request - using uid to match Firestore convention
    req.user = {
      uid: decodedToken.uid,  // Changed from id to uid
      email: decodedToken.email || '',
    };
    
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = auth;