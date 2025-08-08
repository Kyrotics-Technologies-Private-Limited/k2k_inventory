const admin = require('firebase-admin');
const db = admin.firestore();
const ordersCollection = db.collection('orders');
const usersCollection = db.collection('users');

// Helper
const getTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

// Helper to convert Firestore Timestamp to ISO string
function toISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  return ts;
}

// Helper function to restock inventory for order items
const restockOrderItems = async (items) => {
  if (!items || items.length === 0) return;
  
  for (const item of items) {
    const { productId, variantId, quantity } = item;
    
    if (productId && variantId && quantity) {
      const variantRef = db.collection('products').doc(productId).collection('variants').doc(variantId);
      const variantDoc = await variantRef.get();
      
      if (variantDoc.exists) {
        const variantData = variantDoc.data();
        const currentStock = variantData.units_in_stock || 0;
        const newStock = currentStock + quantity;
        
        await variantRef.update({
          units_in_stock: newStock,
          inStock: newStock > 0,
          stockStatus: newStock > 0 ? 'in_stock' : 'out_of_stock',
          updatedAt: getTimestamp(),
        });
      }
    }
  }
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      address_id,
      total_amount,
      payment_id,
      items,
      shipping_method = 'standard',
      payment_method = 'COD'
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order.' });
    }

    // Inventory update logic
    for (const item of items) {
      const { productId, variantId, quantity } = item;
      const variantRef = db.collection('products').doc(productId).collection('variants').doc(variantId);
      const variantDoc = await variantRef.get();
      if (!variantDoc.exists) {
        return res.status(404).json({ message: `Variant not found for product ${productId}` });
      }
      const variantData = variantDoc.data();
      if (!variantData.inStock || variantData.units_in_stock < quantity) {
        return res.status(400).json({ message: `Not enough stock for variant ${variantId}` });
      }
      const newStock = variantData.units_in_stock - quantity;
      await variantRef.update({
        units_in_stock: newStock,
        inStock: newStock > 0,
        stockStatus: newStock > 0 ? 'in_stock' : 'out_of_stock',
        updatedAt: getTimestamp(),
      });
    }

    const newOrder = {
      userId,
      address_id,
      total_amount,
      payment_id,
      items,
      shipping_method,
      payment_method,
      status: 'Placed',
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };

    const docRef = await ordersCollection.add(newOrder);
    res.status(201).json({ message: 'Order placed successfully.', orderId: docRef.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to place order.', error: error.message });
  }
};

// Get all orders of a user
exports.getAllOrders = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await ordersCollection.where('userId', '==', userId).get();

    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt),
        status: data.status ? data.status.toLowerCase() : undefined
      };
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get orders.', error: error.message });
  }
};

// Get order by ID
// exports.getOrderById = async (req, res) => {
//   try {
//     const userId = req.user.uid;
//     const { orderId } = req.params;

//     const doc = await ordersCollection.doc(orderId).get();

//     if (!doc.exists || doc.data().userId !== userId) {
//       return res.status(404).json({ message: 'Order not found or unauthorized.' });
//     }

//     res.status(200).json({ id: doc.id, ...doc.data() });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to get order.', error: error.message });
//   }
// };

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { orderId } = req.params;

    const docRef = ordersCollection.doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ message: 'Order not found or unauthorized.' });
    }

    const currentStatus = doc.data().status;
    if (currentStatus === 'Cancelled' || currentStatus === 'Delivered') {
      return res.status(400).json({ message: `Order cannot be cancelled. Current status: ${currentStatus}` });
    }

    const orderData = doc.data();
    
    // Restock inventory for all items in the order
    await restockOrderItems(orderData.items);

    await docRef.update({
      status: 'Cancelled',
      updatedAt: getTimestamp(),
    });

    res.status(200).json({ message: 'Order cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel order.', error: error.message });
  }
};

// Update order (limited fields like address or payment_method)
exports.updateOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { orderId } = req.params;
    const { address_id, payment_method } = req.body;

    const docRef = ordersCollection.doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ message: 'Order not found or unauthorized.' });
    }

    const updates = {
      updatedAt: getTimestamp()
    };

    if (address_id) updates.address_id = address_id;
    if (payment_method) updates.payment_method = payment_method;

    await docRef.update(updates);

    res.status(200).json({ message: 'Order updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order.', error: error.message });
  }
};

// Track order (get status)
exports.trackOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { orderId } = req.params;

    const doc = await ordersCollection.doc(orderId).get();

    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ message: 'Order not found or unauthorized.' });
    }

    const status = doc.data().status;
    res.status(200).json({ orderId: doc.id, status });
  } catch (error) {
    res.status(500).json({ message: 'Failed to track order.', error: error.message });
  }
};
// Admin - Get all orders
// server/controllers/orderController.js

// ... (other code in the file)

// Admin - Get all orders
exports.getAllOrdersForAdmin = async (req, res) => {
  try {
    const snapshot = await ordersCollection.orderBy('createdAt', 'desc').get();

    // This part is crucial. It processes each order.
    const orders = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      let username = 'N/A'; // A default name in case the user is not found

      // Fetch the user's details using the userId from the order
      if (data.userId) {
        const userDoc = await usersCollection.doc(data.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          // Use the username, or fall back to the email, or a generic placeholder
          username = userData.name || userData.email || 'Unknown User';
        }
      }

      // Return the complete order object, now with the username included
      return {
        id: doc.id,
        ...data,
        username: username, // The username is added here
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt),
        status: data.status ? data.status.toLowerCase() : undefined
      };
    }));

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching all orders for admin:', error);
    res.status(500).json({ message: 'Failed to fetch all orders.', error: error.message });
  }
};

// ... (rest of the file)

exports.adminUpdateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const orderRef = ordersCollection.doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: "Order not found" });
    }

    const orderData = orderDoc.data();
    const previousStatus = orderData.status;

    // If status is being changed to 'Cancelled' and it wasn't cancelled before
    if (status.toLowerCase() === 'cancelled' && previousStatus.toLowerCase() !== 'cancelled') {
      // Restock inventory for all items in the order
      await restockOrderItems(orderData.items);
    }

    // Update the order status
    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status", error: error.message });
  }
};

// Get order by ID (Admin)
exports.adminGetOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const doc = await ordersCollection.doc(orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const orderData = doc.data();
    const order = {
      id: doc.id,
      ...orderData,
      created_at: toISO(orderData.createdAt),
      updated_at: toISO(orderData.updatedAt),
      status: orderData.status ? orderData.status.toLowerCase() : undefined
    };
    res.status(200).json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ message: 'Failed to get order.', error: error.message });
  }
};