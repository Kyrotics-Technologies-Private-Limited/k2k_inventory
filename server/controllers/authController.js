// src/controllers/authController.js
const { auth, db } = require('../firebase/firebase-config');
const { getAdminAccess } = require('../middleware/requireAdmin');

const ADMIN_COLLECTION = 'admin'; // Firestore collection name

// Sign up new admin (restricted to existing administrators only)
exports.adminSignup = async (req, res) => {
  // Reject self-promotion attempts
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden - Administrator privileges required to register admins" });
  }

  const { email, name, uid } = req.body;

  // Validate input
  if (!email || !name || !uid) {
    return res.status(400).json({ error: "Email, name, and uid are required" });
  }

  try {
    // Get user from Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (err) {
      console.error('Error getting Firebase user:', err.message);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Verify email matches
    if (userRecord.email !== email) {
      return res.status(400).json({ error: "Email mismatch" });
    }

    // Check if user is already an admin
    const existingAdmin = await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).get();
    if (existingAdmin.exists) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    const now = new Date().toISOString();

    // 1. Set custom claims for authoritative token verification
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isAdmin: true,
    });

    // 2. Save in Firestore 'admin' collection
    await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || name,
      createdAt: now,
      role: 'admin',
      isAdmin: true,
    });

    // 3. Keep Firestore 'users' collection synchronized
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || name,
        role: 'admin',
        isAdmin: true,
        updatedAt: now,
      },
      { merge: true }
    );

    return res.status(201).json({ 
      message: "Admin registered successfully", 
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({ 
      error: "Failed to create admin account",
      details: error.message
    });
  }
};


// Admin login using Firebase token (from frontend)
exports.adminLogin = async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'idToken is required' });
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error.code || error.message);
    return res.status(401).json({ error: 'Invalid or expired ID token' });
  }

  try {
    const adminData = await getAdminAccess(decodedToken);
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    return res.status(200).json({
      message: 'Login successful',
      admin: true,
      uid: decodedToken.uid,
      email: decodedToken.email || adminData.email || '',
      name: adminData.name || decodedToken.name || 'Admin',
    });
  } catch (error) {
    console.error('Error checking admin authorization:', error.message);
    return res.status(500).json({ error: 'Failed to verify administrator status' });
  }
};
