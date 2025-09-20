const admin = require('firebase-admin');
const db = admin.firestore();
const ordersCollection = db.collection('orders');
const usersCollection = db.collection('users');
const addressesCollection = db.collection('addresses');

// Helper to normalize Firestore Timestamp → ISO string
function toISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

exports.getInvoiceReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query with date filtering
    let query = ordersCollection.orderBy('createdAt', 'desc');
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      
      query = ordersCollection
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc');
    }
    
    const snapshot = await query.get();

    const allInvoiceRows = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const statusLower = (data.status || '').toString().toLowerCase();
      if (statusLower !== 'delivered') {
        continue;
      }

      // customer name
      let customerName = 'Unknown Customer';
      if (data.userId) {
        try {
          const userDoc = await usersCollection.doc(data.userId).get();
          if (userDoc.exists) {
            const u = userDoc.data();
            customerName = u.name || u.email || customerName;
          }
        } catch {}
      }

      // place (state) from address - check embedded address first, then fallback to address_id
      let place = 'Unknown';
      
      // First try to get state from embedded address in order document
      if (data.address && data.address.state) {
        place = data.address.state;
      } else if (data.address_id) {
        // Fallback to fetching from addresses collection
        try {
          const addr = await addressesCollection.doc(data.address_id).get();
          if (addr.exists) {
            place = addr.data().state || place;
          }
        } catch {}
      }

      // Map item level details for reporting
      const items = Array.isArray(data.items) ? data.items : [];
      // console.log('Items:', items);
      
      // Calculate order-level totals
      const totalTaxableValue = items.reduce((sum, item) => {
        const price = Number(item.unit_price ?? item.price ?? 0);
        const quantity = Number(item.quantity ?? 0);
        return sum + (price * quantity);
      }, 0);

      const tax = Number(data.tax ?? 0);
      const shipping = Number(data.shipping_fee ?? 0);
      const orderDiscount = Number(data.discount ?? 0);
      const gstIncludingPrice = Number(data.gstIncludingSubtotal ?? (totalTaxableValue + tax));
      const gstPercentage = totalTaxableValue > 0
        ? Math.round(((tax / totalTaxableValue) * 100) * 100) / 100 // round to 2 decimals
        : 0;

        // console.log('GST gstIncludingPrice:', gstIncludingPrice);
        // console.log(' totalTaxableValue:', totalTaxableValue);

      // Create a separate row for each item
      items.forEach((item, index) => {
        const itemPrice = Number(item.unit_price ?? item.price ?? 0);
        const itemQuantity = Number(item.quantity ?? 0);
        const itemDiscount = Number(item.kp_discount_amount ?? item.discount ?? 0);
        const itemTaxableValue = itemPrice * itemQuantity;
        
        // Calculate CGST and SGST (typically half of GST each)
        // Get GST percentage from item data - handle both string and number types
        let effectiveGstPercentage = 0;
        if (item.gstPercentage) {
          effectiveGstPercentage = Number(item.gstPercentage);
        } else if (gstPercentage) {
          effectiveGstPercentage = gstPercentage;
        }
        
        // If still no GST percentage found, try to calculate from existing tax data
        if (effectiveGstPercentage === 0 && tax > 0 && totalTaxableValue > 0) {
          effectiveGstPercentage = Math.round(((tax / totalTaxableValue) * 100) * 100) / 100;
        }
        
        // Default to 18% GST if still no percentage found (common GST rate in India)
        if (effectiveGstPercentage === 0) {
          effectiveGstPercentage = 18;
        }
        
        const itemGstAmount = (itemTaxableValue * effectiveGstPercentage) / 100;
        const cgst = itemGstAmount / 2;
        const sgst = itemGstAmount / 2;
        
        // Debug logging for each item
        console.log(`Item ${index + 1} GST calculation:`, {
          itemName: item.name,
          itemGstPercentage: item.gstPercentage,
          effectiveGstPercentage: effectiveGstPercentage,
          itemTaxableValue,
          itemGstAmount,
          cgst,
          sgst
        });

        // Get Kishanparivar discount percentage - check if user is a member
        const kishanparivarDiscount = Number(data.kp_discount_percentage || item.kp_discount_percentage || 0);

        allInvoiceRows.push({
          orderId: doc.id,
          customerName,
          invoiceNumber: data.invoiceNumber || `K2K-${doc.id.slice(-6)}`,
          invoiceDate: toISO(data.invoiceDate) || toISO(data.deliveredDate) || toISO(data.createdAt),
          place,
          productName: item.name || item.product_name || 'Item',
          variantName: item.variant_name || item.variantName || item.variantId || item.variant_id || '-',
          price: itemPrice,
          quantity: itemQuantity,
          itemDiscount: itemDiscount,
          itemTaxableValue: itemTaxableValue,
          orderDiscount: orderDiscount, // Total order discount
          kishanparivarDiscount: kishanparivarDiscount, // Kishanparivar member discount percentage
          gstPercentage: effectiveGstPercentage,
          cgst: cgst,
          sgst: sgst,
          cessRate: 0, // Assuming 0 for now, can be derived from items if needed
          invoiceValue: data.total_amount ?? gstIncludingPrice,
          invoiceUrl: data.invoiceUrl || null,
          itemIndex: index, // To distinguish between items in the same order
        });
      });
    }

    const filtered = allInvoiceRows;
    // console.log('Filtered invoice rows:', filtered);

    res.status(200).json(filtered);
  } catch (error) {
    console.error('Error getting invoice reports:', error);
    res.status(500).json({ message: 'Error fetching invoice reports', error: error.message });
  }
};
