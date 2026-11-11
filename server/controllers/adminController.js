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

// Helper to convert Firestore Timestamp to ISO string
function toISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}
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
    let joinDate = toISO(userData.createdAt || userData.joinDate);

    // Fetch orders for this customer (check userId, and fallback to user_id if needed)
    let ordersSnapshot = await db.collection('orders').where('userId', '==', customerId).get();
    if (ordersSnapshot.empty) {
      const altSnapshot = await db.collection('orders').where('user_id', '==', customerId).get();
      if (!altSnapshot.empty) {
        ordersSnapshot = altSnapshot;
      }
    }

    const orders = await Promise.all(
      ordersSnapshot.docs.map(async (doc) => {
        const orderData = doc.data();
        const createdAt = toISO(orderData.createdAt || orderData.created_at);
        const updatedAt = toISO(orderData.updatedAt || orderData.updated_at);
        const placedDate = toISO(orderData.placedDate || orderData.createdAt);
        const processingDate = toISO(orderData.processingDate);
        const shippedDate = toISO(orderData.shippedDate);
        const deliveredDate = toISO(orderData.deliveredDate);
        const cancelledDate = toISO(orderData.cancelledDate);
        const returnedDate = toISO(orderData.returnedDate);

        // Robustly determine total
        let total = undefined;
        if (typeof orderData.total_amount === 'number' && !isNaN(orderData.total_amount)) {
          total = orderData.total_amount;
        } else if (typeof orderData.grandTotal === 'number' && !isNaN(orderData.grandTotal)) {
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
            if (typeof item.price === 'number' && typeof item.quantity === 'number')
              return acc + item.price * item.quantity;
            if (typeof item.unit_price === 'number' && typeof item.quantity === 'number')
              return acc + item.unit_price * item.quantity;
            return acc;
          }, 0);
          if (sum > 0) total = sum;
        }

        // Enrich items with real product images from products catalog
        let items = Array.isArray(orderData.items) ? orderData.items : [];
        items = await Promise.all(
          items.map(async (item) => {
            const productId = item.productId || item.product_id;
            let image = item.image || item.imageUrl;
            let name = item.name || item.productName;
            let variantName = item.variant_name || item.variantName || item.weight;

            if (productId && (!image || !name)) {
              try {
                const productDoc = await db.collection('products').doc(productId).get();
                if (productDoc.exists) {
                  const pData = productDoc.data();
                  if (!name) name = pData.name;
                  if (!image) {
                    image =
                      pData.images?.main ||
                      (Array.isArray(pData.images?.gallery) && pData.images.gallery[0]) ||
                      (Array.isArray(pData.images) && pData.images[0]) ||
                      pData.image ||
                      pData.imageUrl;
                  }
                }
              } catch (pErr) {
                // ignore
              }
            }

            return {
              ...item,
              productId,
              product_id: productId,
              name: name || 'Product Item',
              image: image || null,
              variant_name: variantName,
            };
          })
        );

        return {
          id: doc.id,
          ...orderData,
          items,
          createdAt,
          created_at: createdAt,
          updatedAt,
          updated_at: updatedAt,
          placedDate,
          processingDate,
          shippedDate,
          deliveredDate,
          cancelledDate,
          returnedDate,
          total: total ?? orderData.total_amount ?? 0,
          total_amount: total ?? orderData.total_amount ?? 0,
          status: (orderData.status || 'placed').toLowerCase(),
        };
      })
    );

    // Sort newest orders first
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
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
