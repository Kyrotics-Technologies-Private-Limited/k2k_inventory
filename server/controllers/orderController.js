const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const { bucket } = require('../firebase/firebase-config');
const { v4: uuidv4 } = require('uuid');
const db = admin.firestore();
const ordersCollection = db.collection('orders');
const usersCollection = db.collection('users');
const { enrichOrderLineItem } = require('../services/orderItemSnapshotService');

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
      
      const enrichedItem = await enrichOrderLineItem(
        { ...item, productId, variantId, quantity },
        variantData,
      );
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
    
    // Restock inventory for all items in the order exactly once
    if (!orderData.restocked) {
      await restockOrderItems(orderData.items);
    }

    await docRef.update({
      status: 'Cancelled',
      restocked: true,
      restockedAt: getTimestamp(),
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

    // If status is being changed to 'Cancelled' or 'Returned' and it was not previously restocked
    const isRestockStatus = ['cancelled', 'returned'].includes(status.toLowerCase());
    const wasRestockStatus = ['cancelled', 'returned'].includes((previousStatus || '').toLowerCase());
    if (isRestockStatus && !wasRestockStatus && !orderData.restocked) {
      await restockOrderItems(orderData.items);
      updateData.restocked = true;
      updateData.restockedAt = admin.firestore.FieldValue.serverTimestamp();
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
if (status.toLowerCase() === 'delivered') {
  try {
    console.log('Starting invoice generation...');
    
    // Re-fetch the order with latest updates
    const updatedDoc = await orderRef.get();
    const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };
    
    console.log('Order data retrieved:', updatedOrder.id);

    // Generate invoice PDF in memory using PDFKit
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (data) => chunks.push(data));
    const pdfDone = new Promise((resolve) => doc.on('end', resolve));

    // Generate unique invoice number
    const invoiceNumber = `K2K-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${updatedOrder.id.slice(-6)}`;
    const deliveredDate = updatedOrder.deliveredDate?.toDate?.() || new Date();
    const invoiceDate = deliveredDate.toLocaleDateString('en-GB');

    console.log('PDF instance created, invoice number:', invoiceNumber);

    // Helper function to get GST rates for variants
    const getVariantGstRates = (items) => {
      const variantGst = {};
      if (Array.isArray(items)) {
        items.forEach(item => {
          const variantId = item.variantId || item.variant_id;
          variantGst[variantId] = item.gstPercentage || 5; // Default to 5% if not specified
        });
      }
      return variantGst;
    };

    // Calculate shipping fee
    const calculatedShipping = updatedOrder.shipping_fee || 0;
    const items = Array.isArray(updatedOrder.items) ? updatedOrder.items : [];
    const variantGst = getVariantGstRates(items);

    console.log('Items count:', items.length);

    // ===== HEADER =====
    doc.fontSize(18).text("KISHAN2KITCHEN", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).text("Webel Bhavan, Monibhandar Premises, 7th Floor, Block - EP & GP,", { align: "center" });
    doc.text("Salt Lake, Sector - V, Kolkata - 700091, West Bengal", { align: "center" });
    doc.text("GSTIN: 19AAKCC1645G1ZM   FSSAI: 12822999000310", { align: "center" });
    doc.moveDown(1);

    // ===== TITLE =====
    doc.fontSize(12).text("TAX INVOICE / BILL OF SUPPLY", { align: "center" });
    doc.moveDown(1);

    console.log('Header added');

    // ===== INVOICE DETAILS =====
    doc.fontSize(10);
    doc.text(`Invoice No.: ${invoiceNumber}`);
    doc.text(`Order No.: ${updatedOrder.id}`);
    doc.text(`Date: ${invoiceDate}`);
    doc.text(`Place Of Supply: WEST BENGAL`);
    doc.moveDown(1);

    console.log('Invoice details added');

    // ===== Get customer and address information safely =====
    let customerName = "Customer";
    let billingAddress = "-";
    let shippingAddress = "-";

    // Try to get customer name from various possible fields
    if (updatedOrder.customerName) {
      customerName = updatedOrder.customerName;
    } else if (updatedOrder.username) {
      customerName = updatedOrder.username;
    }

    // Try to get address information
    if (updatedOrder.address) {
      const addr = updatedOrder.address;
      const addressParts = [
        addr.name || customerName,
        addr.appartment || addr.apartment,
        addr.address,
        addr.city,
        addr.state,
        addr.pincode
      ].filter(part => part && part.trim() !== '');
      
      billingAddress = addressParts.join(', ');
      shippingAddress = billingAddress;
    } else if (updatedOrder.billingAddress) {
      billingAddress = updatedOrder.billingAddress;
      shippingAddress = updatedOrder.shippingAddress || billingAddress;
    }

    // ===== BILL TO / SHIP TO =====
    doc.fontSize(11).text("Bill To:", { underline: true });
    doc.fontSize(9).text(billingAddress);
    doc.moveDown(0.5);

    doc.fontSize(11).text("Ship To:", { underline: true });
    doc.fontSize(9).text(shippingAddress);
    doc.moveDown(1);

    console.log('Billing/shipping information added');

    // ===== ITEMS TABLE HEADER =====
    doc.fontSize(11).text("Items:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(8).text("# | Item | HSN | Qty | Rate | Disc. | Taxable | CGST | SGST | IGST | CESS | Total");
    doc.moveDown(0.3);

    // ===== ITEMS TABLE CONTENT =====
    let itemTotal = 0;
    const isIntraState = true; // Assuming West Bengal to West Bengal (intra-state)
    
    items.forEach((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price || item.price) || 0;
      const taxableAmount = quantity * unitPrice;
      const discount = Number(item.discount) || 0;
      const taxableAfterDiscount = taxableAmount - discount;
      
      const variantId = item.variantId || item.variant_id;
      const gstRate = (variantGst[variantId] || 5) / 100; // Defaulting to 5% GST
      let cgst = 0, sgst = 0, igst = 0;

      if (isIntraState) {
        cgst = taxableAfterDiscount * (gstRate / 2);
        sgst = taxableAfterDiscount * (gstRate / 2);
      } else {
        igst = taxableAfterDiscount * gstRate;
      }

      const lineTotal = taxableAfterDiscount + cgst + sgst + igst;
      itemTotal += lineTotal;

      const itemName = item.name || item.product_name || 'Item';
      const variantName = item.variant_name || '';
      const hsn = item.hsn || 'N/A';

      doc.fontSize(8).text(
        `${index + 1} | ${itemName} ${variantName} | ${hsn} | ${quantity} | ₹${unitPrice.toFixed(2)} | ₹${discount.toFixed(2)} | ₹${taxableAfterDiscount.toFixed(2)} | ₹${cgst.toFixed(2)} | ₹${sgst.toFixed(2)} | ₹${igst.toFixed(2)} | ₹0.00 | ₹${lineTotal.toFixed(2)}`
      );
    });

    doc.moveDown(1);

    console.log('Items table added');

    // ===== TOTALS =====
    const totalAmount = Number(updatedOrder.total_amount) || itemTotal + calculatedShipping;
    
    doc.fontSize(10);
    doc.text(`Item Total: ₹${itemTotal.toFixed(2)}`);
    doc.text(`Handling Fee (Inclusive of Taxes): ₹${calculatedShipping.toFixed(2)}`);
    doc.fontSize(11).text(`Invoice Value: ₹${totalAmount.toFixed(2)}`, { underline: true });
    doc.moveDown(1);

    console.log('Totals section added');

    // ===== FOOTER =====
    doc.fontSize(9).text("Thank you for your business! This is a system-generated invoice.", { align: "center" });

    console.log('Footer added');

    doc.end();
    await pdfDone;
    const pdfBuffer = Buffer.concat(chunks);

    console.log('PDF buffer generated, size:', pdfBuffer.length);

    // Upload to Firebase Storage
    const fileName = `invoices/${updatedOrder.id}-${Date.now()}.pdf`;
    const file = bucket.file(fileName);
    const uuid = uuidv4();
    
    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: { 
        metadata: { 
          firebaseStorageDownloadTokens: uuid 
        } 
      }
    });

    console.log('PDF uploaded to Firebase Storage');

    // Public download URL
    const invoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${uuid}`;

    // Calculate total discount from all items
    const totalDiscount = items.reduce((sum, item) => {
      const discount = Number(item.discount) || 0;
      return sum + discount;
    }, 0);

    await orderRef.update({
      invoiceUrl,
      invoiceNumber,
      invoiceDate: admin.firestore.FieldValue.serverTimestamp(),
      discount: totalDiscount,
    });

    console.log('Order updated with invoice information');
    
  } catch (invoiceError) {
    console.error('Error generating invoice:', invoiceError);
    // Don't throw the error, just log it so the status update still succeeds
  }
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

    // Fetch user details if username or contact info is missing
    let username = orderData.username;
    let customerEmail = orderData.email;
    let customerPhone = orderData.phone;
    if (orderData.userId) {
      try {
        const userDoc = await usersCollection.doc(orderData.userId).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          if (!username) username = uData.name || uData.displayName || uData.email || 'Customer';
          if (!customerEmail) customerEmail = uData.email;
          if (!customerPhone) customerPhone = uData.phone || uData.phoneNumber;
        }
      } catch (uErr) {
        console.warn('Error fetching user info for admin order:', uErr.message);
      }
    }

    // Enrich items with original product images and details if missing
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
            console.warn('Error resolving product image for ' + productId + ':', pErr.message);
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

    const order = {
      id: doc.id,
      ...orderData,
      username: username || orderData.username || 'Customer',
      customerEmail: customerEmail || orderData.customerEmail,
      customerPhone: customerPhone || orderData.customerPhone,
      items,
      created_at: toISO(orderData.createdAt),
      updated_at: toISO(orderData.updatedAt),
      placedDate: toISO(orderData.placedDate || orderData.createdAt),
      processingDate: toISO(orderData.processingDate),
      shippedDate: toISO(orderData.shippedDate),
      deliveredDate: toISO(orderData.deliveredDate),
      cancelledDate: toISO(orderData.cancelledDate),
      returnedDate: toISO(orderData.returnedDate),
      invoiceDate: toISO(orderData.invoiceDate),
      status: orderData.status ? orderData.status.toLowerCase() : undefined
    };
    res.status(200).json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ message: 'Failed to get order.', error: error.message });
  }
};


// Helper to generate official K2K Tax Invoice PDF using PDFKit
const generateInvoiceBuffer = async (orderData, orderId) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (data) => chunks.push(data));
  const pdfDone = new Promise((resolve) => doc.on('end', resolve));

  const invoiceNumber = orderData.invoiceNumber || `K2K-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.slice(-6).toUpperCase()}`;
  const deliveredDate = orderData.deliveredDate?.toDate?.() || orderData.deliveredDate || orderData.createdAt?.toDate?.() || orderData.created_at || new Date();
  const invoiceDate = new Date(deliveredDate).toLocaleDateString('en-GB');

  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const calculatedShipping = Number(orderData.shipping_fee || 0);

  // ===== COMPANY HEADER =====
  doc.fontSize(18).font('Helvetica-Bold').text('KISHAN2KITCHEN', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8.5).font('Helvetica').text('Webel Bhavan, Monibhandar Premises, 7th Floor, Block - EP & GP,', { align: 'center' });
  doc.text('Salt Lake, Sector - V, Kolkata - 700091, West Bengal', { align: 'center' });
  doc.text('GSTIN: 19AAKCC1645G1ZM    FSSAI: 12822999000310', { align: 'center' });
  doc.moveDown(0.8);

  // Horizontal line
  doc.strokeColor('#d1d5db').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.6);

  // ===== TITLE =====
  doc.fontSize(12).font('Helvetica-Bold').text('TAX INVOICE / BILL OF SUPPLY', { align: 'center' });
  doc.moveDown(0.8);

  // ===== INVOICE & ORDER DETAILS =====
  const metaY = doc.y;
  doc.fontSize(9).font('Helvetica');
  doc.text(`Invoice No.: ${invoiceNumber}`, 40, metaY);
  doc.text(`Order No.: ${orderId}`, 40, metaY + 14);
  doc.text(`Date: ${invoiceDate}`, 40, metaY + 28);
  doc.text('Place Of Supply: WEST BENGAL (19)', 40, metaY + 42);

  // Bill To / Ship To
  let customerName = orderData.customerName || orderData.username || 'Customer';
  let addressText = '-';
  if (orderData.address) {
    const addr = orderData.address;
    customerName = [addr.first_name, addr.last_name].filter(Boolean).join(' ') || addr.name || customerName;
    const parts = [
      addr.appartment || addr.apartment,
      addr.street || addr.address,
      addr.city,
      addr.state,
      addr.postal_code || addr.pincode,
    ].filter(Boolean);
    addressText = parts.join(', ');
  } else if (orderData.billingAddress) {
    addressText = orderData.billingAddress;
  }

  doc.font('Helvetica-Bold').text('Bill To & Ship To:', 320, metaY);
  doc.font('Helvetica').text(customerName, 320, metaY + 14);
  doc.text(addressText, 320, metaY + 28, { width: 235 });

  doc.y = Math.max(doc.y, metaY + 65);
  doc.moveDown(0.8);

  // ===== ITEMS TABLE =====
  const startX = 40;
  const colWidths = { num: 20, item: 165, hsn: 45, qty: 30, rate: 45, disc: 40, taxable: 50, gst: 60, total: 60 };

  const tableHeaderY = doc.y;
  doc.rect(startX, tableHeaderY, 515, 20).fill('#f3f4f6');
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8);

  let curX = startX + 4;
  doc.text('#', curX, tableHeaderY + 5, { width: colWidths.num });
  curX += colWidths.num;
  doc.text('Item Description', curX, tableHeaderY + 5, { width: colWidths.item });
  curX += colWidths.item;
  doc.text('HSN', curX, tableHeaderY + 5, { width: colWidths.hsn });
  curX += colWidths.hsn;
  doc.text('Qty', curX, tableHeaderY + 5, { width: colWidths.qty, align: 'center' });
  curX += colWidths.qty;
  doc.text('Rate', curX, tableHeaderY + 5, { width: colWidths.rate, align: 'right' });
  curX += colWidths.rate;
  doc.text('Disc.', curX, tableHeaderY + 5, { width: colWidths.disc, align: 'right' });
  curX += colWidths.disc;
  doc.text('Taxable', curX, tableHeaderY + 5, { width: colWidths.taxable, align: 'right' });
  curX += colWidths.taxable;
  doc.text('GST (CGST+SGST)', curX, tableHeaderY + 5, { width: colWidths.gst, align: 'right' });
  curX += colWidths.gst;
  doc.text('Total', curX, tableHeaderY + 5, { width: colWidths.total, align: 'right' });

  doc.y = tableHeaderY + 24;

  let itemTotal = 0;
  let totalDiscount = 0;

  doc.font('Helvetica').fontSize(8).fillColor('#1f2937');

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price || item.price) || 0;
    const gross = qty * unitPrice;
    const discount = Number(item.discount) || 0;
    const taxable = Math.max(0, gross - discount);
    totalDiscount += discount;

    const gstPct = Number(item.gstPercentage || 5);
    const gstRate = gstPct / 100;
    const gstAmount = taxable * gstRate;
    const lineTotal = taxable + gstAmount;
    itemTotal += lineTotal;

    const rowY = doc.y;
    if (index % 2 === 1) {
      doc.rect(startX, rowY - 2, 515, 18).fill('#f9fafb');
      doc.fillColor('#1f2937');
    }

    let rX = startX + 4;
    doc.text(String(index + 1), rX, rowY, { width: colWidths.num });
    rX += colWidths.num;

    const itemName = `${item.name || item.productName || 'Item'} ${item.variant_name || ''}`.trim();
    doc.text(itemName, rX, rowY, { width: colWidths.item, height: 16, ellipsis: true });
    rX += colWidths.item;

    doc.text(item.hsn || 'N/A', rX, rowY, { width: colWidths.hsn });
    rX += colWidths.hsn;

    doc.text(String(qty), rX, rowY, { width: colWidths.qty, align: 'center' });
    rX += colWidths.qty;

    doc.text(`Rs. ${unitPrice.toFixed(2)}`, rX, rowY, { width: colWidths.rate, align: 'right' });
    rX += colWidths.rate;

    doc.text(discount > 0 ? `Rs. ${discount.toFixed(2)}` : '-', rX, rowY, { width: colWidths.disc, align: 'right' });
    rX += colWidths.disc;

    doc.text(`Rs. ${taxable.toFixed(2)}`, rX, rowY, { width: colWidths.taxable, align: 'right' });
    rX += colWidths.taxable;

    doc.text(`${gstPct}% (Rs. ${gstAmount.toFixed(2)})`, rX, rowY, { width: colWidths.gst, align: 'right' });
    rX += colWidths.gst;

    doc.text(`Rs. ${lineTotal.toFixed(2)}`, rX, rowY, { width: colWidths.total, align: 'right' });

    doc.y = rowY + 18;
  });

  doc.moveDown(0.6);
  doc.strokeColor('#d1d5db').lineWidth(1).moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.8);

  // ===== TOTALS =====
  const finalTotal = Number(orderData.total_amount) || (itemTotal + calculatedShipping);
  const totalsX = 330;
  doc.fontSize(9).font('Helvetica');
  doc.text('Item Total:', totalsX, doc.y, { width: 110 });
  doc.text(`Rs. ${itemTotal.toFixed(2)}`, totalsX + 110, doc.y, { width: 75, align: 'right' });
  doc.moveDown(0.3);

  if (totalDiscount > 0) {
    doc.text('Total Discount:', totalsX, doc.y, { width: 110 });
    doc.text(`- Rs. ${totalDiscount.toFixed(2)}`, totalsX + 110, doc.y, { width: 75, align: 'right' });
    doc.moveDown(0.3);
  }

  doc.text('Shipping Fee:', totalsX, doc.y, { width: 110 });
  doc.text(calculatedShipping > 0 ? `Rs. ${calculatedShipping.toFixed(2)}` : 'FREE', totalsX + 110, doc.y, { width: 75, align: 'right' });
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Invoice Value:', totalsX, doc.y, { width: 110 });
  doc.text(`Rs. ${finalTotal.toFixed(2)}`, totalsX + 110, doc.y, { width: 75, align: 'right' });
  doc.moveDown(1.5);

  // ===== FOOTER =====
  doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280');
  doc.text('Thank you for your business! This is an official computer-generated Tax Invoice / Bill of Supply.', 40, doc.y, { align: 'center' });

  doc.end();
  await pdfDone;
  return {
    pdfBuffer: Buffer.concat(chunks),
    invoiceNumber,
    invoiceDate,
    totalDiscount,
  };
};

// GET /api/orders/:orderId/invoice
exports.getOrGenerateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderDoc = await ordersCollection.doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = orderDoc.data();
    const isDirectDownload = req.query.download === 'true' || req.headers.accept?.includes('application/pdf');

    // If invoiceUrl already exists and direct download was not forced, return cached URL
    if (orderData.invoiceUrl && !isDirectDownload) {
      return res.status(200).json({
        invoiceUrl: orderData.invoiceUrl,
        invoiceNumber: orderData.invoiceNumber || `K2K-${orderId.slice(-6).toUpperCase()}`,
      });
    }

    // Generate PDF buffer
    const { pdfBuffer, invoiceNumber, totalDiscount } = await generateInvoiceBuffer(orderData, orderId);

    // Upload to Firebase Storage
    let invoiceUrl = orderData.invoiceUrl;
    try {
      const fileName = `invoices/${orderId}-${Date.now()}.pdf`;
      const file = bucket.file(fileName);
      const uuid = uuidv4();

      await file.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: uuid,
          },
        },
      });

      invoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${uuid}`;

      await ordersCollection.doc(orderId).update({
        invoiceUrl,
        invoiceNumber,
        invoiceDate: admin.firestore.FieldValue.serverTimestamp(),
        discount: totalDiscount,
      });
    } catch (storageErr) {
      console.warn('Storage upload error for invoice, will stream directly:', storageErr.message);
    }

    if (isDirectDownload || !invoiceUrl) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoiceNumber}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.status(200).json({
      invoiceUrl,
      invoiceNumber,
    });
  } catch (error) {
    console.error('Error in getOrGenerateInvoice:', error);
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
};
