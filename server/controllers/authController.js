// src/controllers/authController.js
const { auth, db } = require('../firebase/firebase-config');
const jwt = require('jsonwebtoken');

const ADMIN_COLLECTION = 'admin'; // Firestore collection name

// Sign up new admin
exports.adminSignup = async (req, res) => {
  console.log('Received signup request:', { ...req.body, password: '***' });
  
  const { email, password, name, uid } = req.body;

  // Validate input
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required" });
  }

  try {
    // Get user from Firebase
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log('Found Firebase user:', { uid: userRecord.uid });
    } catch (err) {
      console.error('Error getting Firebase user:', err);
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

    console.log('User created in Firebase:', userRecord.uid);

    // Save in Firestore 'admin' collection
    await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      createdAt: new Date().toISOString(),
      role: 'admin'
    });

    console.log('Admin record created in Firestore');
    return res.status(201).json({ 
      message: "Admin registered successfully", 
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error("Signup error:", error);
    // Send a more specific error message based on the error type
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: "Email already exists" });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: "Invalid email format" });
    } else if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: "Password should be at least 6 characters" });
    }
    return res.status(500).json({ 
      error: "Failed to create admin account",
      details: error.message
    });
  }
};

// Admin login using Firebase token (from frontend)
exports.adminLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify Firebase ID Token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if user exists in 'admin' collection
    const adminDoc = await db.collection(ADMIN_COLLECTION).doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    // Optional: create your own JWT if needed
    const customToken = jwt.sign(
      { uid: decodedToken.uid, email: decodedToken.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({ message: 'Login successful', token: customToken });
  } catch (error) {
    console.error('Error in admin login:', error);
    return res.status(401).json({ error: 'Invalid or expired ID token' });
  }
};
