// controllers/userController.js
/*const { db, auth } = require("../firebase/firebase-config");

// 📌 Register a new user
const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // 1️⃣ Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone,
    });

    // 2️⃣ Create user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      phone,
      is_admin: false,
      is_kishanparivar_member: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      kishanparivar_start_date: null,
      kishanparivar_end_date: null,
    });

    res.status(201).json({
      message: "User registered successfully",
      uid: userRecord.uid,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 Login a user (via Firebase ID token verification)
const loginUser = async (req, res) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // 1️⃣ Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2️⃣ Get user details from Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found in Firestore" });
    }

    const userData = userDoc.data();

    res.status(200).json({
      message: "User logged in successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = {
  registerUser,
  loginUser,
};*/


/*const { db } = require("../firebase/firebase-config");

const registerUser = async (req, res) => {
  const { uid, phone, token } = req.body;

  if (!uid || !phone || !token) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    // This is how you set a document using firebase-admin
    await db.collection("users").doc(uid).set({
      uid,
      phone,
      token,
      createdAt: new Date(),
    });

    return res.status(201).json({ message: "User saved to Firestore" });
  } catch (error) {
    console.error(" Firestore Save Error:", error);
    return res.status(500).json({ message: "Error saving user", error: error.message });
  }
};

module.exports = { registerUser };*/


/*const { db } = require("../firebase/firebase-config");

const userController = {
  /**
   * Register a new user with basic information
   
  async registerUser(req, res) {
    const { uid, phone, token } = req.body;

    if (!uid || !phone || !token) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: uid, phone, and token are all required" 
      });
    }

    try {
      // Create new user document with basic info
      await db.collection("users").doc(uid).set({
        uid,
        phone,
        notificationTokens: [token], // Store as array for multiple devices
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        profileComplete: false // Flag to indicate if profile needs completion
      });

      return res.status(201).json({ 
        success: true,
        message: "User registered successfully",
        data: { uid }
      });
    } catch (error) {
      console.error("User registration error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error registering user",
        error: error.message 
      });
    }
  },

  /**
   * Get complete user profile
   
  async getUserProfile(req, res) {
    try {
      const userId = req.params.userId;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid user ID format' 
        });
      }

      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }
      
      res.json({
        success: true,
        data: doc.data()
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  },

  /**
   * Create or update user profile with additional details
   
  async saveUserProfile(req, res) {
    try {
      const userId = req.params.userId;
      const userData = req.body;
      
      // Validate required fields
      if (!userData.name || !userData.email) {
        return res.status(400).json({ 
          success: false,
          error: 'Name and email are required fields' 
        });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }
      
      // Prepare update data
      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        profileComplete: true
      };

      const userRef = db.collection('users').doc(userId);
      await userRef.set(updateData, { merge: true });
      
      res.json({ 
        success: true,
        message: 'Profile saved successfully',
        data: updateData
      });
    } catch (error) {
      console.error('Error saving user profile:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  },

  /**
   * Update just the profile picture URL
   
  async updateProfilePicture(req, res) {
    try {
      const userId = req.params.userId;
      const { profilePictureUrl } = req.body;
      
      if (!profilePictureUrl) {
        return res.status(400).json({ 
          success: false,
          error: 'Profile picture URL is required' 
        });
      }

      // Validate URL format
      try {
        new URL(profilePictureUrl);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format for profile picture'
        });
      }
      
      const userRef = db.collection('users').doc(userId);
      await userRef.update({ 
        profilePicture: profilePictureUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({ 
        success: true,
        message: 'Profile picture updated successfully',
        data: { profilePictureUrl }
      });
    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }
};

module.exports = userController;*/


/*const { db,admin } = require("../firebase/firebase-config");

const userController = {
  /**
   * Register a new user with basic information
   
  async registerUser(req, res) {
    const { uid, phone, token } = req.body;

    if (!uid || !phone || !token) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: uid, phone, and token are all required" 
      });
    }

    try {
      await db.collection("users").doc(uid).set({
        uid,
        phone,
        notificationTokens: [token],
        createdAt: new Date(),
        isActive: true,
        profileComplete: false
      });

      return res.status(201).json({ 
        success: true,
        message: "User registered successfully",
        data: { uid }
      });
    } catch (error) {
      console.error("User registration error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error registering user",
        error: error.message 
      });
    }
  },

  /**
   * Get complete user profile using UID
   
  async getUserProfile(req, res) {
    try {
      const uid = req.params.userId;

      if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid UID format' 
        });
      }

      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      return res.json({
        success: true,
        data: doc.data()
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  },

  /**
   * Create or update user profile using UID
   
  async saveUserProfile(req, res) {
    try {
      const uid = req.params.userId;
      const userData = req.body;

      if (!userData.name || !userData.email) {
        return res.status(400).json({ 
          success: false,
          error: 'Name and email are required fields' 
        });
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        profileComplete: true
      };

      const userRef = db.collection('users').doc(uid);
      await userRef.set(updateData, { merge: true });

      res.json({ 
        success: true,
        message: 'Profile saved successfully',
        data: updateData
      });
    } catch (error) {
      console.error('Error saving user profile:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  },

  /**
   * Update profile picture using UID
   
  async updateProfilePicture(req, res) {
    try {
      const uid = req.params.userId;
      const { profilePictureUrl } = req.body;

      if (!profilePictureUrl) {
        return res.status(400).json({ 
          success: false,
          error: 'Profile picture URL is required' 
        });
      }

      try {
        new URL(profilePictureUrl);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format for profile picture'
        });
      }

      const userRef = db.collection('users').doc(uid);
      await userRef.update({ 
        profilePicture: profilePictureUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ 
        success: true,
        message: 'Profile picture updated successfully',
        data: { profilePictureUrl }
      });
    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }
};

module.exports = userController;*/


// const { db } = require("../firebase/firebase-config");

// // Save or update user by Firebase UID
// exports.createOrUpdateUser = async (req, res) => {
//   try {
//     const { name, phone } = req.body;
//     const { uid, email } = req.user; // from verified Firebase token

//     if (!name || !phone) {
//       return res.status(400).json({ error: "Name and phone are required" });
//     }

//     const userRef = db.collection("users").doc(uid); // Use Firebase UID
//     await userRef.set(
//       {
//         uid,
//         name,
//         email,
//         phone,
//         updatedAt: new Date(),
//       },
//       { merge: true }
//     );

//     return res.status(200).json({ message: "User saved successfully" });
//   } catch (err) {
//     console.error("Error saving user:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// // Get user by Firebase UID
// exports.getUser = async (req, res) => {
//   try {
//     const { uid } = req.user;

//     const userDoc = await db.collection("users").doc(uid).get();

//     if (!userDoc.exists) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     return res.status(200).json({ user: userDoc.data() });
//   } catch (err) {
//     console.error("Error fetching user:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// // Delete user by Firebase UID
// exports.deleteUser = async (req, res) => {
//   try {
//     const { uid } = req.user;

//     await db.collection("users").doc(uid).delete();

//     return res.status(200).json({ message: "User deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting user:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };


const { db } = require("../firebase/firebase-config");

// Create or update user by Firebase UID
exports.createOrUpdateUser = async (req, res) => {
  try {
    const { name, phone, email} = req.body;
    const { uid } = req.user; // from verified Firebase token
    
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }
    
    // Validate phone number
    if (!phone.startsWith('+')) {
      return res.status(400).json({ error: "Phone number must include country code (e.g. +1...)" });
    }
    
    // Validate UID
    if (!uid || typeof uid !== 'string') {
      return res.status(401).json({ error: "Invalid authentication" });
    }

    // Create or update the user document
    const userRef = db.collection("users").doc(uid);
    
    // Add server timestamp for better tracking
    await userRef.set(
      {
        uid,
        name,
        email: email || null, // Handle possible null from Firebase
        phone,
        updatedAt: new Date(),
        createdAt: userRef.get().exists ? userRef.get().data().createdAt : new Date(),
      },
      { merge: true }
    );
    
    return res.status(200).json({ 
      message: "User saved successfully",
      user: {
        uid,
        name,
        email: email || null,
        phone
      }
    });
  } catch (err) {
    console.error("Error saving user:", err);
    return res.status(500).json({ error: "Server error", details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// Get user by Firebase UID
exports.getUser = async (req, res) => {
  try {
    const { uid } = req.user;
    
    if (!uid) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Filter out sensitive fields if needed
    const userData = userDoc.data();
    
    return res.status(200).json({ 
      user: {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      } 
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ error: "Server error", details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// Check if a user exists
exports.checkUserExists = async (req, res) => {
  try {
    const { uid } = req.user;
    
    if (!uid) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userDoc = await db.collection("users").doc(uid).get();
    
    return res.status(200).json({ 
      exists: userDoc.exists,
      user: userDoc.exists ? {
        uid: userDoc.data().uid,
        name: userDoc.data().name || null,
        email: userDoc.data().email || null
      } : null
    });
  } catch (err) {
    console.error("Error checking user:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete user by Firebase UID
exports.deleteUser = async (req, res) => {
  try {
    const { uid } = req.user;
    
    if (!uid) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check if user exists
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await db.collection("users").doc(uid).delete();
    
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: "Server error", details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};