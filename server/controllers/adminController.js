// server/controllers/adminController.js
const { auth, db } = require('../firebase/firebase-config');

// Fetch all users from Firestore 'users' collection
exports.getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to ISO string if present
      let joinDate = data.createdAt || data.joinDate || null;
      if (joinDate && typeof joinDate.toDate === 'function') {
        joinDate = joinDate.toDate().toISOString();
      } else if (typeof joinDate === 'string') {
        // already a string, do nothing
      } else if (joinDate instanceof Date) {
        joinDate = joinDate.toISOString();
      } else {
        joinDate = null;
      }
      return {
        id: doc.id,
        ...data,
        joinDate, // always a string or null
      };
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users from Firestore:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
};

// Get customer details with order history
exports.getCustomerWithOrders = async (req, res) => {
  const { customerId } = req.params;
  try {
    // Fetch customer data
    const userDoc = await db.collection('users').doc(customerId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const userData = userDoc.data();
    let joinDate = userData.createdAt || userData.joinDate || null;
    if (joinDate && typeof joinDate.toDate === 'function') {
      joinDate = joinDate.toDate().toISOString();
    } else if (typeof joinDate === 'string') {
      // already a string, do nothing
    } else if (joinDate instanceof Date) {
      joinDate = joinDate.toISOString();
    } else {
      joinDate = null;
    }
    // Fetch orders for this customer
    const ordersSnapshot = await db.collection('orders').where('userId', '==', customerId).get();
    const orders = ordersSnapshot.docs.map(doc => {
      const orderData = doc.data();
      let createdAt = orderData.createdAt || null;
      if (createdAt && typeof createdAt.toDate === 'function') {
        createdAt = createdAt.toDate().toISOString();
      } else if (typeof createdAt === 'string') {
        // already a string, do nothing
      } else if (createdAt instanceof Date) {
        createdAt = createdAt.toISOString();
      } else {
        createdAt = null;
      }
      // Robustly determine total (prefer grandTotal, then total, then amount, then totalAmount, then sum of items)
      let total = undefined;
      if (typeof orderData.grandTotal === 'number' && !isNaN(orderData.grandTotal)) {
        total = orderData.grandTotal;
      } else if (typeof orderData.total === 'number' && !isNaN(orderData.total)) {
        total = orderData.total;
      } else if (typeof orderData.amount === 'number' && !isNaN(orderData.amount)) {
        total = orderData.amount;
      } else if (typeof orderData.totalAmount === 'number' && !isNaN(orderData.totalAmount)) {
        total = orderData.totalAmount;
      } else if (Array.isArray(orderData.items)) {
        const sum = orderData.items.reduce((acc, item) => {
          if (typeof item.total === 'number' && !isNaN(item.total)) return acc + item.total;
          if (typeof item.price === 'number' && typeof item.quantity === 'number') return acc + (item.price * item.quantity);
          return acc;
        }, 0);
        if (sum > 0) total = sum;
      }
      return { id: doc.id, ...orderData, createdAt, total };
    });
    res.json({
      customer: { id: userDoc.id, ...userData, joinDate },
      orders,
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: 'Failed to fetch customer details', details: error.message });
  }
};
