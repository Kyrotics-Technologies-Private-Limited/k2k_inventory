/**
 * GST Calculation Utilities
 * 
 * This file contains utility functions for calculating GST (Goods and Services Tax)
 * based on the formula: Price Including GST = Base Price + ((Base Price × GST Rate) / 100)
 */

/**
 * Calculate the price including GST
 * @param basePrice - The base price (after discount if applicable)
 * @param gstPercentage - The GST percentage (e.g., 18 for 18%)
 * @returns The final price including GST
 */
export const calculatePriceIncludingGST = (basePrice: number, gstPercentage: number): number => {
  if (basePrice <= 0 || gstPercentage < 0) {
    return basePrice;
  }
  
  const gstAmount = (basePrice * gstPercentage) / 100;
  return basePrice + gstAmount;
};

/**
 * Calculate the GST amount
 * @param basePrice - The base price (after discount if applicable)
 * @param gstPercentage - The GST percentage (e.g., 18 for 18%)
 * @returns The GST amount
 */
export const calculateGSTAmount = (basePrice: number, gstPercentage: number): number => {
  if (basePrice <= 0 || gstPercentage < 0) {
    return 0;
  }
  
  return (basePrice * gstPercentage) / 100;
};

/**
 * Calculate the base price from a price including GST
 * @param priceIncludingGST - The price that includes GST
 * @param gstPercentage - The GST percentage (e.g., 18 for 18%)
 * @returns The base price (excluding GST)
 */
export const calculateBasePrice = (priceIncludingGST: number, gstPercentage: number): number => {
  if (priceIncludingGST <= 0 || gstPercentage < 0) {
    return priceIncludingGST;
  }
  
  return priceIncludingGST / (1 + gstPercentage / 100);
};

/**
 * Calculate tax breakdown for a GST-inclusive price
 * @param priceIncludingGST - The final price that already includes GST
 * @param gstPercentage - GST rate (e.g. 18%)
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
  const basePrice = priceIncludingGST / (1 + gstPercentage / 100);
  const gstAmount = priceIncludingGST - basePrice;
  return {
    basePrice,
    gstAmount,
    totalPrice: priceIncludingGST,
  };
};


/**
 * Format price with proper currency symbol and decimal places
 * @param price - The price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  return `₹${price.toFixed(2)}`;
};

/**
 * Common GST rates in India
 */
export const GST_RATES = {
  ZERO: 0,
  FIVE: 5,
  TWELVE: 12,
  EIGHTEEN: 18,
  TWENTY_EIGHT: 28
} as const;

/**
 * GST rate options for dropdown
 */
export const GST_RATE_OPTIONS = [
  { value: 0, label: '0% (Exempt)' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' }
];

/**
 * Calculate price with membership discount applied first, then GST
 * @param basePrice - The original base price
 * @param gstPercentage - The GST percentage
 * @param membershipDiscountPercentage - The membership discount percentage (0-100)
 * @returns Object with all price breakdowns
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
      savings: 0
    };
  }

  // Calculate membership discount
  const discountAmount = (basePrice * membershipDiscountPercentage) / 100;
  const discountedPrice = basePrice - discountAmount;

  // Calculate GST on the discounted price
  const gstAmount = (discountedPrice * gstPercentage) / 100;
  const finalPrice = discountedPrice + gstAmount;

  // Calculate total savings
  const savings = discountAmount;

  return {
    originalPrice: basePrice,
    discountedPrice: discountedPrice,
    discountAmount: discountAmount,
    gstAmount: gstAmount,
    finalPrice: finalPrice,
    savings: savings
  };
};

/**
 * Check if user is a Kishan Parivar member
 * @param membershipType - The membership type string
 * @returns boolean indicating if user is Kishan Parivar member
 */
export const isKishanParivarMember = (membershipType: string): boolean => {
  if (!membershipType) return false;
  const lower = membershipType.toLowerCase();
  return lower.includes('kishan') || 
         lower.includes('parivar') ||
         lower.includes('k2k');
};

export const isK2KMember = (membershipType: string): boolean => {
  return isKishanParivarMember(membershipType);
};

/**
 * Calculate pricing for non-members and K2K members strictly off Original MRP
 * @param originalMRP - Base Original MRP of item (e.g. ₹100)
 * @param nonMemberPrice - Selling price for regular non-members (e.g. ₹96 = 4% off MRP)
 * @param memberDiscountPercent - Discount % for K2K members calculated off Original MRP (e.g. 20% off MRP = ₹80)
 */
export const calculateItemPricing = (
  originalMRP: number,
  nonMemberPrice: number,
  memberDiscountPercent: number = 0
) => {
  const safeMRP = Math.max(originalMRP, nonMemberPrice, 0);
  const nonMemberSavings = safeMRP > 0 ? safeMRP - nonMemberPrice : 0;
  const nonMemberDiscountPercent = safeMRP > 0 ? Math.round((nonMemberSavings / safeMRP) * 100) : 0;

  const k2kMemberPrice = safeMRP > 0 && memberDiscountPercent > 0
    ? Math.round(safeMRP * (1 - memberDiscountPercent / 100))
    : nonMemberPrice;

  const k2kMemberSavings = safeMRP > 0 ? safeMRP - k2kMemberPrice : 0;

  return {
    originalMRP: safeMRP,
    nonMemberPrice,
    nonMemberDiscountPercent,
    k2kMemberPrice,
    k2kMemberSavings,
    k2kMemberDiscountPercent: memberDiscountPercent,
  };
};

/**
 * Format price with membership discount breakdown
 * @param priceBreakdown - The price breakdown object
 * @param showBreakdown - Whether to show detailed breakdown
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

/**
 * Get membership discount percentage for Kishan Parivar members
 * @param membershipType - The membership type
 * @param discountPercentage - The discount percentage from membership
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
