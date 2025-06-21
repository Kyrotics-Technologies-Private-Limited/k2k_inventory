// server/controllers/adminController.js
const { auth, db } = require('../firebase/firebase-config');

// Fetch all users from Firestore 'users' collection
exports.getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users from Firestore:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
};
