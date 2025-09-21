const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const { bucket } = require('../firebase/firebase-config');
const { v4: uuidv4 } = require('uuid');
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

    // Inventory update logic and fetch variant details
    const enrichedItems = [];
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
      
      // Enrich item with variant data including discount and GST
      const enrichedItem = {
        ...item,
        productId,
        variantId,
        quantity,
        price: variantData.price || 0,
        discount: variantData.discount || 0,
        gstPercentage: variantData.gstPercentage || 0,
        variant_name: variantData.weight || variantData.name || 'Variant',
        unit_price: variantData.price || 0,
      };
      enrichedItems.push(enrichedItem);
      
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
      items: enrichedItems,
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

    // Create status-specific timestamp field name
    const getStatusTimestampField = (status) => {
      const statusLower = status.toLowerCase();
      switch (statusLower) {
        case 'placed':
          return 'placedDate';
        case 'processing':
          return 'processingDate';
        case 'shipped':
          return 'shippedDate';
        case 'delivered':
          return 'deliveredDate';
        case 'cancelled':
          return 'cancelledDate';
        case 'returned':
          return 'returnedDate';
        
        default:
          return `${statusLower}Date`;
      }
    };

    // Prepare update object with status and timestamp
    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add status-specific timestamp
    const timestampField = getStatusTimestampField(status);
    updateData[timestampField] = admin.firestore.FieldValue.serverTimestamp();

    // Update the order status with status-specific timestamp
    await orderRef.update(updateData);

    // If delivered, generate invoice PDF, upload to Firebase Storage, and save URL
   // If delivered, generate invoice PDF, upload to Firebase Storage, and save URL
if (status.toLowerCase() === 'delivered') {
  // Re-fetch the order with latest updates
  const updatedDoc = await orderRef.get();
  const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };

  // Generate invoice PDF in memory
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (data) => chunks.push(data));
  const pdfDone = new Promise((resolve) => doc.on('end', resolve));

  // Generate unique invoice number
  const invoiceNumber = `K2K-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${uuidv4().split('-')[0].toUpperCase()}`;

  // ===== HEADER =====
  doc.fontSize(18).text("KISHAN2KITCHEN", { align: "center", bold: true });
  doc.moveDown(0.3);
  doc.fontSize(10).text("Webel Bhavan, Monibhandar Premises, 7th Floor, Block - EP & GP,", { align: "center" });
  doc.text("Salt Lake, Sector - V, Kolkata - 700091, West Bengal", { align: "center" });
  doc.text("GSTIN: 19AAKCC1645G1ZM   FSSAI: 12822999000310", { align: "center" });
  doc.moveDown(1);

  // ===== TITLE =====
  doc.fontSize(14).text("TAX INVOICE / BILL OF SUPPLY", { align: "center" });
  doc.moveDown(1);

  // ===== INVOICE DETAILS =====
  const deliveredDate = updatedOrder.deliveredDate?.toDate?.() || new Date();
  doc.fontSize(11);
  doc.text(`Invoice No: ${invoiceNumber}`);
  doc.text(`Order ID: ${updatedOrder.id}`);
  doc.text(`User ID: ${updatedOrder.userId || ""}`);
  doc.text(`Date: ${deliveredDate.toISOString().split("T")[0]}`);
  doc.text(`Place Of Supply: WEST BENGAL (19)`);
  doc.moveDown(1);

  // ===== BILL TO / SHIP TO =====
  doc.fontSize(12).text("Bill To:", { underline: true });
  doc.fontSize(10).text(updatedOrder.customerName || "Customer");
  doc.text(updatedOrder.billingAddress || "-");
  doc.moveDown(0.5);

  doc.fontSize(12).text("Ship To:", { underline: true });
  doc.fontSize(10).text(updatedOrder.customerName || "Customer");
  doc.text(updatedOrder.shippingAddress || "-");
  doc.moveDown(1);

  // ===== ITEM TABLE =====
  doc.fontSize(12).text("Items:", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text("Name / Variant / Qty / HSN / Rate / Disc. / Taxable / CGST / SGST / CESS / Total");
  doc.moveDown(0.3);

  const items = Array.isArray(updatedOrder.items) ? updatedOrder.items : [];
  let subtotal = 0;
  items.forEach((item, idx) => {
    const name = item.name || item.product_name || "Item";
    const variant = item.variant_name || "-";
    const qty = item.quantity || 0;
    const hsn = item.hsn || "-";
    const rate = item.unit_price || item.price || 0;
    const discount = item.discount || 0;
    const taxable = qty * rate - discount;
    const cgst = item.cgst || 0;
    const sgst = item.sgst || 0;
    const cess = item.cess || 0;
    const total = taxable + cgst + sgst + cess;

    subtotal += total;

    doc.text(`${idx + 1}) ${name} / ${variant} / ${qty} / ${hsn} / ₹${rate.toFixed(2)} / ₹${discount.toFixed(2)} / ₹${taxable.toFixed(2)} / ₹${cgst.toFixed(2)} / ₹${sgst.toFixed(2)} / ₹${cess.toFixed(2)} / ₹${total.toFixed(2)}`);
  });

  doc.moveDown();

  // ===== TOTALS =====
  const tax = updatedOrder.tax ?? 0;
  const shipping = updatedOrder.shipping_fee ?? 0;
  const grandTotal = subtotal + Number(tax) + Number(shipping);

  doc.fontSize(11).text(`Subtotal: ₹${subtotal.toFixed(2)}`);
  doc.text(`Tax: ₹${Number(tax).toFixed(2)}`);
  doc.text(`Shipping: ₹${Number(shipping).toFixed(2)}`);
  doc.fontSize(12).text(`Total Invoice Value: ₹${grandTotal.toFixed(2)}`, { underline: true });
  doc.moveDown(1);

  // ===== FOOTER =====
  doc.fontSize(9).text("Thank you for shopping with KISHAN2KITCHEN!", { align: "center" });

  doc.end();
  await pdfDone;
  const pdfBuffer = Buffer.concat(chunks);

  // Upload to Firebase Storage
  const fileName = `invoices/${updatedOrder.id}-${Date.now()}.pdf`;
  const file = bucket.file(fileName);
  const uuid = uuidv4();
  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: { metadata: { firebaseStorageDownloadTokens: uuid } }
  });

  // Public download URL
  const invoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${uuid}`;

  // Calculate total discount from all items
  const totalDiscount = items.reduce((sum, item) => {
    const discount = item.discount || 0;
    return sum + discount;
  }, 0);

  await orderRef.update({
    invoiceUrl,
    invoiceNumber,
    invoiceDate: admin.firestore.FieldValue.serverTimestamp(),
    discount: totalDiscount,
  });
}


    res.status(200).json({ 
      message: "Order status updated successfully",
      statusUpdated: status,
      timestampField: timestampField
    });
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