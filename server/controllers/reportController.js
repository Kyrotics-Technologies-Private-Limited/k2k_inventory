const admin = require('firebase-admin');
const db = admin.firestore();
const ordersCollection = db.collection('orders');
const usersCollection = db.collection('users');
const addressesCollection = db.collection('addresses');

// ---------------------------------------------------------------------------
// GST helpers (server-side mirror of client/src/utils/gstCalculations.ts)
// ---------------------------------------------------------------------------

/**
 * Sentinel meaning "the item has no GST rate recorded."
 * Distinguishes "missing" from explicit 0%.
 */
const MISSING_GST_RATE = -1;

/** Round to 2 decimal places (half-up). */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve the effective GST percentage for a line item.
 *
 * Priority:
 *   1. item.gstPercentage — explicit rate snapshotted onto the order line item
 *   2. order-level back-calculated rate from stored tax / taxable amounts
 *   3. MISSING_GST_RATE sentinel (caller must handle; never default to 18%)
 *
 * Explicit 0 (zero-rated / exempt) is preserved as 0.
 *
 * @param {object} item              - Order line item
 * @param {number} orderLevelGstPct  - Back-calculated from order.tax / subtotal
 * @returns {number} GST rate (0–100) or MISSING_GST_RATE (-1)
 */
function resolveItemGstPercentage(item, orderLevelGstPct) {
  // item.gstPercentage must be an explicit number — including 0.
  // typeof check prevents treating null / undefined as 0.
  if (typeof item.gstPercentage === 'number') {
    return item.gstPercentage; // preserves explicit 0
  }

  // Try order-level back-calculated rate (only valid when > 0).
  if (typeof orderLevelGstPct === 'number' && orderLevelGstPct > 0) {
    return orderLevelGstPct;
  }

  // No rate available — caller must not assume 0 or 18.
  return MISSING_GST_RATE;
}

/**
 * Extract taxable value and GST amount from a GST-inclusive gross amount.
 *
 * Invariant: taxableValue + gstAmount === grossAmount (within ±0.01 due to rounding).
 * The report must display rounded figures throughout to reconcile.
 *
 * @param {number} inclusivePrice  - GST-inclusive gross amount
 * @param {number} gstPercentage   - Resolved rate (0–100); must NOT be MISSING_GST_RATE
 * @returns {{ taxableValue: number, gstAmount: number, grossAmount: number }}
 */
function extractGSTFromInclusivePrice(inclusivePrice, gstPercentage) {
  const gross = round2(Math.max(0, inclusivePrice));

  if (gstPercentage === 0) {
    // Zero-rated / exempt: full amount is taxable, no GST component.
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  if (gstPercentage < 0 || gstPercentage > 100) {
    // Invalid / sentinel — caller should not reach here but guard defensively.
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  const divisor = 1 + gstPercentage / 100;
  const taxableValue = round2(gross / divisor);
  const gstAmount = round2(gross - taxableValue);
  return { taxableValue, gstAmount, grossAmount: gross };
}

// ---------------------------------------------------------------------------
// Place-of-supply note
// ---------------------------------------------------------------------------
//
// LIMITATION: The CGST/SGST vs IGST split below is based on a heuristic that
// checks whether the delivery state is "West Bengal" (the assumed supplier
// state).  This is NOT a reliable place-of-supply determination:
//   • The supplier's registered state may change.
//   • Address data may be absent, incomplete, or mis-spelled.
//   • Inter-state vs intra-state classification requires verified supplier &
//     recipient GST registrations.
//
// Phase 1 preserves this heuristic unchanged but documents its limitations.
// A proper solution requires integrating verified GST registration data for
// both supplier and recipient — this is deferred to a future phase.
//
// Until then, CGST/SGST figures should be treated as approximate for display
// purposes only and not used for official GST filings without human review.

// ---------------------------------------------------------------------------
// Helper to normalize Firestore Timestamp → ISO string
// ---------------------------------------------------------------------------

function toISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

exports.getInvoiceReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query with date filtering
    let query = ordersCollection.orderBy('createdAt', 'desc');

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

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

      // ── Customer name ──────────────────────────────────────────────────
      let customerName = 'Unknown Customer';
      if (data.userId) {
        try {
          const userDoc = await usersCollection.doc(data.userId).get();
          if (userDoc.exists) {
            const u = userDoc.data();
            customerName = u.name || u.email || customerName;
          }
        } catch (_) {}
      }

      // ── Place (state) from delivery address ────────────────────────────
      // Used for the CGST/SGST vs IGST heuristic (see limitation note above).
      let place = 'Unknown';
      if (data.address && data.address.state) {
        place = data.address.state;
      } else if (data.address_id) {
        try {
          const addr = await addressesCollection.doc(data.address_id).get();
          if (addr.exists) {
            place = addr.data().state || place;
          }
        } catch (_) {}
      }

      // ── Order-level stored totals ───────────────────────────────────────
      const items = Array.isArray(data.items) ? data.items : [];
      const storedTax = Number(data.tax ?? 0);
      const shipping = Number(data.shipping_fee ?? 0);
      const orderDiscount = Number(data.discount ?? 0);

      // Back-calculate an order-level GST % from stored tax / subtotal as a
      // last-resort fallback (only valid when both values are positive).
      // This is used only when an item has no explicit gstPercentage.
      const storedSubtotal = items.reduce((sum, item) => {
        const price = Number(item.unit_price ?? item.price ?? 0);
        const qty = Number(item.quantity ?? 0);
        return sum + price * qty;
      }, 0);
      const orderLevelGstPct =
        storedSubtotal > 0 && storedTax > 0
          ? round2((storedTax / storedSubtotal) * 100)
          : 0;

      // ── Per-item rows ──────────────────────────────────────────────────
      items.forEach((item, index) => {
        // The unit_price / price stored on the order line item is the
        // GST-INCLUSIVE selling price (non-member or member price as charged).
        const itemPrice = Number(item.unit_price ?? item.price ?? 0);
        const itemQuantity = Number(item.quantity ?? 0);
        const itemDiscount = Number(item.kp_discount_amount ?? item.discount ?? 0);

        // Gross line value (GST-inclusive).
        const itemGrossValue = round2(itemPrice * itemQuantity);

        // Resolve GST rate — explicit 0% is preserved; missing stays as sentinel.
        const effectiveGstPercentage = resolveItemGstPercentage(item, orderLevelGstPct);
        const hasMissingRate = effectiveGstPercentage === MISSING_GST_RATE;

        // Extract taxable value and GST from the inclusive gross amount.
        // If the rate is missing we cannot split correctly; surface it with a
        // note field so the admin can review rather than silently defaulting.
        let taxableValue, itemGstAmount;
        if (hasMissingRate) {
          // Rate unknown — flag gross as taxable, GST = 0, needs review.
          taxableValue = itemGrossValue;
          itemGstAmount = 0;
        } else {
          const breakdown = extractGSTFromInclusivePrice(itemGrossValue, effectiveGstPercentage);
          taxableValue = breakdown.taxableValue;
          itemGstAmount = breakdown.gstAmount;
        }

        // ── Place-of-supply heuristic (see limitation note above) ─────────
        // Supplier state assumed to be West Bengal; intra-state → CGST+SGST,
        // inter-state → IGST.  These figures are approximate.
        const isIntraState = place.toLowerCase().includes('west bengal');

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (!hasMissingRate && itemGstAmount > 0) {
          if (isIntraState) {
            cgst = round2(itemGstAmount / 2);
            sgst = round2(itemGstAmount - cgst);
            igst = 0;
          } else {
            cgst = 0;
            sgst = 0;
            igst = itemGstAmount;
          }
        }

        const kishanparivarDiscount = Number(
          data.kp_discount_percentage ?? item.kp_discount_percentage ?? 0
        );

        allInvoiceRows.push({
          orderId: doc.id,
          customerName,
          invoiceNumber: data.invoiceNumber || `K2K-${doc.id.slice(-6)}`,
          invoiceDate:
            toISO(data.invoiceDate) || toISO(data.deliveredDate) || toISO(data.createdAt),
          place,
          productName: item.name || item.product_name || 'Item',
          variantName:
            item.variant_name || item.variantName || item.variantId || item.variant_id || '-',
          // price is the GST-inclusive unit selling price stored on the order.
          price: itemPrice,
          quantity: itemQuantity,
          itemDiscount,
          // itemTaxableValue is extracted from the inclusive gross (not price × qty treated as exclusive).
          itemTaxableValue: taxableValue,
          // itemGrossValue is the GST-inclusive line total (taxableValue + gstAmount).
          itemGrossValue,
          orderDiscount,
          kishanparivarDiscount,
          gstPercentage: hasMissingRate ? null : effectiveGstPercentage,
          // null gstPercentage signals the admin that this item needs a rate review.
          gstMissing: hasMissingRate,
          cgst,
          sgst,
          igst,
          cessRate: 0,
          invoiceValue: data.total_amount ?? Number(data.gstIncludingSubtotal ?? 0),
          invoiceUrl: data.invoiceUrl || null,
          itemIndex: index,
        });
      });
    }

    res.status(200).json(allInvoiceRows);
  } catch (error) {
    console.error('Error getting invoice reports:', error);
    res.status(500).json({ message: 'Error fetching invoice reports', error: error.message });
  }
};
