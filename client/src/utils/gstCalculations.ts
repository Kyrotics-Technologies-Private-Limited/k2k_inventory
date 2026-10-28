/**
 * GST Calculation Utilities
 *
 * Pricing model: `price`, `originalPrice` (MRP), and `memberPrice` stored on
 * product variants are all GST-INCLUSIVE amounts. Discounts and MRP retain
 * their business meaning (% off inclusive MRP). GST must never be added a
 * second time to an inclusive price.
 *
 * To extract taxable value and GST component from an inclusive amount use
 * `extractGSTFromInclusivePrice` / `calculateInclusiveGSTBreakdown`.
 *
 * Sentinel: `MISSING_GST_RATE` (= -1) distinguishes "rate not set" from
 * explicit 0%.  Callers must handle it explicitly; never silently treat it
 * as 0 % or 18 %.
 */

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/** Round to 2 decimal places (half-up). */
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Sentinel for missing GST rate
// ---------------------------------------------------------------------------

/**
 * Sentinel value meaning "the variant has no GST rate recorded at all."
 * Distinct from `0`, which is a valid explicit zero-rated rate.
 * Callers that receive this value must surface a warning rather than
 * silently treating the item as 0% or 18% GST.
 */
export const MISSING_GST_RATE = -1 as const;

// ---------------------------------------------------------------------------
// Core inclusive-price helpers  (primary API for reports and exports)
// ---------------------------------------------------------------------------

/**
 * Extract the GST-exclusive taxable value and GST component from a
 * GST-inclusive gross amount.
 *
 * @param inclusivePrice - Gross amount that already contains GST (e.g. ₹118)
 * @param gstPercentage  - GST rate (0–100).  Pass `0` for zero-rated / exempt
 *                         items.  Do NOT pass `MISSING_GST_RATE` here; resolve
 *                         the rate before calling this function.
 * @returns Object with `taxableValue`, `gstAmount`, and `grossAmount`,
 *          all rounded to 2 dp.
 *
 * Invariant: `taxableValue + gstAmount === grossAmount` (within ±₹0.01 due
 * to rounding; the report must display rounded figures throughout to reconcile).
 */
export const extractGSTFromInclusivePrice = (
  inclusivePrice: number,
  gstPercentage: number
): { taxableValue: number; gstAmount: number; grossAmount: number } => {
  const gross = round2(Math.max(0, inclusivePrice));

  // Explicit 0%: zero-rated / exempt — full amount is taxable, no GST component.
  if (gstPercentage === 0) {
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  // Invalid rate (includes MISSING_GST_RATE sentinel -1 and >100).
  // Return gross as taxable with no GST so the caller can surface the issue.
  if (gstPercentage < 0 || gstPercentage > 100) {
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  // Standard inclusive extraction:  taxable = gross / (1 + rate/100)
  const divisor = 1 + gstPercentage / 100;
  const taxableValue = round2(gross / divisor);
  const gstAmount = round2(gross - taxableValue);
  return { taxableValue, gstAmount, grossAmount: gross };
};

/**
 * Calculate tax breakdown for a GST-inclusive price.
 * Alias kept for backward compatibility; prefer `extractGSTFromInclusivePrice`
 * for new callers (it also returns a rounded `grossAmount`).
 *
 * Returns `gstAmount = 0` for zero-rated items (gstPercentage === 0) and for
 * invalid / negative rates.  Callers that need to distinguish "0%" from
 * "missing rate" should check for `MISSING_GST_RATE` before calling.
 */
export const calculateInclusiveGSTBreakdown = (
  priceIncludingGST: number,
  gstPercentage: number
) => {
  if (priceIncludingGST <= 0 || gstPercentage <= 0) {
    return {
      basePrice: priceIncludingGST,
      gstAmount: 0,
      totalPrice: priceIncludingGST,
    };
  }
  const basePrice = round2(priceIncludingGST / (1 + gstPercentage / 100));
  const gstAmount = round2(priceIncludingGST - basePrice);
  return {
    basePrice,
    gstAmount,
    totalPrice: round2(priceIncludingGST),
  };
};

/**
 * Split GST amount into CGST/SGST (for intra-state) or IGST (for inter-state).
 * Guarantees exact penny reconciliation: cgst + sgst === gstAmount.
 */
export const splitGST = (
  gstAmount: number,
  isIntraState: boolean
): { cgst: number; sgst: number; igst: number } => {
  const roundedGst = round2(gstAmount);
  if (roundedGst <= 0) {
    return { cgst: 0, sgst: 0, igst: 0 };
  }
  if (isIntraState) {
    const cgst = round2(roundedGst / 2);
    const sgst = round2(roundedGst - cgst);
    return { cgst, sgst, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: roundedGst };
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format price with proper currency symbol and decimal places.
 * @param price - The price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  return `\u20B9${price.toFixed(2)}`;
};

// ---------------------------------------------------------------------------
// GST rate constants
// ---------------------------------------------------------------------------

/**
 * Common GST rates in India.
 */
export const GST_RATES = {
  ZERO: 0,
  FIVE: 5,
  TWELVE: 12,
  EIGHTEEN: 18,
  TWENTY_EIGHT: 28,
} as const;

/**
 * GST rate options for dropdown.
 */
export const GST_RATE_OPTIONS = [
  { value: 0, label: '0% (Exempt)' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

// ---------------------------------------------------------------------------
// Pricing helpers (GST-exclusive inputs — use only where confirmed exclusive)
// ---------------------------------------------------------------------------

/**
 * Calculate the price including GST given a GST-EXCLUSIVE base price.
 * Only use when the input is confirmed to be GST-exclusive.
 */
export const calculatePriceIncludingGST = (basePrice: number, gstPercentage: number): number => {
  if (basePrice <= 0 || gstPercentage < 0) {
    return basePrice;
  }
  const gstAmount = (basePrice * gstPercentage) / 100;
  return basePrice + gstAmount;
};

/**
 * Calculate the GST amount from a GST-EXCLUSIVE base price.
 * Only use when the input is confirmed to be GST-exclusive.
 */
export const calculateGSTAmount = (basePrice: number, gstPercentage: number): number => {
  if (basePrice <= 0 || gstPercentage < 0) {
    return 0;
  }
  return (basePrice * gstPercentage) / 100;
};

/**
 * Extract the GST-exclusive base price from a GST-inclusive price.
 */
export const calculateBasePrice = (priceIncludingGST: number, gstPercentage: number): number => {
  if (priceIncludingGST <= 0 || gstPercentage < 0) {
    return priceIncludingGST;
  }
  return priceIncludingGST / (1 + gstPercentage / 100);
};

// ---------------------------------------------------------------------------
// Variant pricing helpers  (all prices are GST-inclusive)
// ---------------------------------------------------------------------------

/**
 * Calculate pricing for non-members and K2K members strictly off the
 * GST-inclusive Original MRP.
 *
 * @param originalMRP          - GST-inclusive MRP (e.g. ₹100)
 * @param nonMemberPrice       - GST-inclusive selling price for regular
 *                               non-members (e.g. ₹96 = 4% off MRP)
 * @param memberDiscountPercent - Discount % for K2K members calculated off MRP
 *                               (e.g. 20 → member pays ₹80 inclusive of GST)
 */
export const calculateItemPricing = (
  originalMRP: number,
  nonMemberPrice: number,
  memberDiscountPercent: number = 0
) => {
  const safeMRP = Math.max(originalMRP, nonMemberPrice, 0);
  const nonMemberSavings = safeMRP > 0 ? safeMRP - nonMemberPrice : 0;
  const nonMemberDiscountPercent =
    safeMRP > 0 ? Math.round((nonMemberSavings / safeMRP) * 100) : 0;

  const k2kMemberPrice =
    safeMRP > 0 && memberDiscountPercent > 0
      ? Math.round(safeMRP * (1 - memberDiscountPercent / 100))
      : nonMemberPrice;

  const k2kMemberSavings = safeMRP > 0 ? safeMRP - k2kMemberPrice : 0;

  return {
    originalMRP: safeMRP,
    nonMemberPrice,
    nonMemberSavings,
    nonMemberDiscountPercent,
    k2kMemberPrice,
    k2kMemberSavings,
    k2kMemberDiscountPercent: memberDiscountPercent,
  };
};

// ---------------------------------------------------------------------------
// Membership helpers
// ---------------------------------------------------------------------------

/**
 * Check if user is a Kishan Parivar member.
 * @param membershipType - The membership type string
 * @returns boolean indicating if user is Kishan Parivar member
 */
export const isKishanParivarMember = (membershipType: string): boolean => {
  if (!membershipType) return false;
  const lower = membershipType.toLowerCase();
  return lower.includes('kishan') || lower.includes('parivar') || lower.includes('k2k');
};

export const isK2KMember = (membershipType: string): boolean => {
  return isKishanParivarMember(membershipType);
};

/**
 * Get membership discount percentage for Kishan Parivar members.
 * @param membershipType      - The membership type
 * @param discountPercentage  - The discount percentage from membership
 * @returns The applicable discount percentage
 */
export const getKishanParivarDiscount = (
  membershipType: string,
  discountPercentage: number
): number => {
  if (isK2KMember(membershipType)) {
    return discountPercentage;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// Deprecated: calculatePriceWithMembershipDiscount
// ---------------------------------------------------------------------------

/**
 * @deprecated This function assumes a GST-EXCLUSIVE `basePrice` and adds GST
 * on top.  K2K variant prices (`price`, `memberPrice`) are GST-INCLUSIVE —
 * calling this function with those prices would double-count GST.
 *
 * Use `extractGSTFromInclusivePrice` to break down an inclusive member price,
 * or `calculateItemPricing` to compute GST-inclusive member pricing off MRP.
 */
export const calculatePriceWithMembershipDiscount = (
  basePrice: number,
  gstPercentage: number,
  membershipDiscountPercentage: number = 0
) => {
  if (basePrice <= 0) {
    return {
      originalPrice: basePrice,
      discountedPrice: basePrice,
      discountAmount: 0,
      gstAmount: 0,
      finalPrice: basePrice,
      savings: 0,
    };
  }

  // Apply membership discount to the (exclusive) base price.
  const discountAmount = (basePrice * membershipDiscountPercentage) / 100;
  const discountedPrice = basePrice - discountAmount;

  // GST on the discounted exclusive price.
  const gstAmount = (discountedPrice * gstPercentage) / 100;
  const finalPrice = discountedPrice + gstAmount;

  return {
    originalPrice: basePrice,
    discountedPrice,
    discountAmount,
    gstAmount,
    finalPrice,
    savings: discountAmount,
  };
};

/**
 * Format price with membership discount breakdown.
 * @param priceBreakdown - The price breakdown object
 * @param showBreakdown  - Whether to show detailed breakdown
 * @returns Formatted price string with breakdown
 */
export const formatPriceWithMembershipDiscount = (
  priceBreakdown: ReturnType<typeof calculatePriceWithMembershipDiscount>,
  showBreakdown: boolean = true
): string => {
  if (!showBreakdown) {
    return formatPrice(priceBreakdown.finalPrice);
  }

  if (priceBreakdown.savings > 0) {
    return `${formatPrice(priceBreakdown.finalPrice)} (Member Price)`;
  }

  return formatPrice(priceBreakdown.finalPrice);
};
