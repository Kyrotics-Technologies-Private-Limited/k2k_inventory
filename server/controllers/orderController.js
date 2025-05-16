const admin = require('firebase-admin');
const db = admin.firestore();
const ordersCollection = db.collection('orders');

const getTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

module.exports = {
  // Create a new order
  createOrder: async (req, res) => {
    try {
      const userId = req.user.uid;
      const {
        address_id,
        total_amount,
        payment_id,
        items
      } = req.body;

      // Validate required fields
      if (!address_id || !total_amount || !payment_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const orderRef = ordersCollection.doc();
      const orderId = orderRef.id;
      const batch = db.batch();

      // Create order document
      const orderData = {
        id: orderId,
        user_id: userId,
        address_id,
        total_amount,
        status: 'pending', // initial status
        payment_id,
        created_at: new Date(),
        updated_at: new Date()
      };

      batch.set(orderRef, orderData);

      // Add order items as subcollection
      const orderItemsCollection = orderRef.collection('order-items');
      items.forEach(item => {
        const itemRef = orderItemsCollection.doc();
        batch.set(itemRef, {
          id: itemRef.id,
          order_id: orderId,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          created_at: new Date(),
        });
      });

      // Commit the batch
      await batch.commit();

      res.status(201).json({
        id: orderId,
        ...orderData,
        items
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  },

  // Get user's orders
  getOrders: async (req, res) => {
    try {
      const userId = req.user.uid;
      const snapshot = await ordersCollection
        .where('user_id', '==', userId)
        .orderBy('created_at', 'desc')
        .get();

      const orders = [];
      for (const doc of snapshot.docs) {
        const order = doc.data();
        const itemsSnapshot = await doc.ref.collection('order-items').get();
        order.items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
        orders.push(order);
      }

      res.status(200).json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  // Get single order
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.uid;

      const orderDoc = await ordersCollection.doc(id).get();
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderDoc.data();
      

      const itemsSnapshot = await orderDoc.ref.collection('order-items').get();
      order.items = itemsSnapshot.docs.map(doc => doc.data());

      res.status(200).json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  },

  // Cancel order
  cancelOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.uid;

      const orderRef = ordersCollection.doc(id);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderDoc.data();
      

      // Only allow cancellation if order is pending
      if (order.status !== 'pending') {
        return res.status(400).json({ 
          error: `Order cannot be cancelled in its current state (${order.status})` 
        });
      }

      await orderRef.update({
        status: 'cancelled',
        updated_at: getTimestamp()
      });

      res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  },

  // Get order tracking (simplified)
  getTracking: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.uid;

      const orderDoc = await ordersCollection.doc(id).get();
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderDoc.data();
     

      // This would come from a shipping service in a real app
      const trackingInfo = {
        status: order.status,
        estimated_delivery: null, // Would calculate based on status
        tracking_number: `TRK-${id.slice(0, 8).toUpperCase()}`,
        history: [
          {
            status: 'ordered',
            timestamp: order.created_at
          }
        ]
      };

      if (order.status !== 'pending') {
        trackingInfo.history.push({
          status: order.status,
          timestamp: order.updated_at
        });
      }

      res.status(200).json(trackingInfo);
    } catch (error) {
      console.error('Error fetching tracking:', error);
      res.status(500).json({ error: 'Failed to fetch tracking' });
    }
  },

  // Admin - Get all orders
  getAllOrders: async (req, res) => {
    try {
      // In a real app, you'd add admin role verification here
      const snapshot = await ordersCollection
        .orderBy('created_at', 'desc')
        .get();

      const orders = [];
      for (const doc of snapshot.docs) {
        const order = doc.data();
        const itemsSnapshot = await doc.ref.collection('order-items').get();
        order.items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
        orders.push(order);
      }

      res.status(200).json(orders);
    } catch (error) {
      console.error('Error fetching all orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  // Admin - Update order status
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const orderRef = ordersCollection.doc(id);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await orderRef.update({
        status,
        updated_at: getTimestamp()
      });

      res.status(200).json({ message: 'Order status updated' });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
};