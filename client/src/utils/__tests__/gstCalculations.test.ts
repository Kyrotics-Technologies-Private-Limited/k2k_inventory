/**
 * Unit tests for GST Calculation Utilities
 *
 * Covers:
 *  - extractGSTFromInclusivePrice at 0%, 5%, 12%, 18%, 28%
 *  - MISSING_GST_RATE sentinel handling
 *  - Taxable value + GST amount === gross amount reconciliation
 *  - calculateInclusiveGSTBreakdown (backward-compat alias)
 *  - calculateItemPricing (member & non-member, discounts off MRP)
 *  - calculatePriceWithMembershipDiscount deprecation note (GST-exclusive path)
 */

import { describe, it, expect } from 'vitest';
import {
  MISSING_GST_RATE,
  extractGSTFromInclusivePrice,
  calculateInclusiveGSTBreakdown,
  calculatePriceIncludingGST,
  calculateGSTAmount,
  calculateBasePrice,
  calculateItemPricing,
  calculatePriceWithMembershipDiscount,
  splitGST,
} from '../gstCalculations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// extractGSTFromInclusivePrice
// ---------------------------------------------------------------------------

describe('extractGSTFromInclusivePrice', () => {
  it('returns gross as taxable with gstAmount=0 for 0% (zero-rated)', () => {
    const result = extractGSTFromInclusivePrice(100, 0);
    expect(result.taxableValue).toBe(100);
    expect(result.gstAmount).toBe(0);
    expect(result.grossAmount).toBe(100);
  });

  it('correctly extracts at 5%', () => {
    // gross = ₹105 → taxable = 100, gst = 5
    const result = extractGSTFromInclusivePrice(105, 5);
    expect(result.taxableValue).toBe(100);
    expect(result.gstAmount).toBe(5);
    expect(result.grossAmount).toBe(105);
    // reconciliation
    expect(round2(result.taxableValue + result.gstAmount)).toBe(result.grossAmount);
  });

  it('correctly extracts at 12%', () => {
    // gross = ₹112 → taxable ≈ 100, gst ≈ 12
    const result = extractGSTFromInclusivePrice(112, 12);
    expect(result.taxableValue).toBe(100);
    expect(result.gstAmount).toBe(12);
    expect(result.grossAmount).toBe(112);
    expect(round2(result.taxableValue + result.gstAmount)).toBe(result.grossAmount);
  });

  it('correctly extracts at 18%', () => {
    // gross = ₹118 → taxable = 100, gst = 18
    const result = extractGSTFromInclusivePrice(118, 18);
    expect(result.taxableValue).toBe(100);
    expect(result.gstAmount).toBe(18);
    expect(result.grossAmount).toBe(118);
    expect(round2(result.taxableValue + result.gstAmount)).toBe(result.grossAmount);
  });

  it('correctly extracts at 28%', () => {
    // gross = ₹128 → taxable = 100, gst = 28
    const result = extractGSTFromInclusivePrice(128, 28);
    expect(result.taxableValue).toBe(100);
    expect(result.gstAmount).toBe(28);
    expect(result.grossAmount).toBe(128);
    expect(round2(result.taxableValue + result.gstAmount)).toBe(result.grossAmount);
  });

  it('handles non-round amounts at 18% and reconciles within ₹0.01', () => {
    // gross = ₹96 (non-member price), gst = 18%
    // taxable = 96 / 1.18 = 81.3559...  → rounded 81.36
    // gst = 96 - 81.36 = 14.64
    const result = extractGSTFromInclusivePrice(96, 18);
    expect(result.taxableValue).toBeCloseTo(81.36, 2);
    expect(result.gstAmount).toBeCloseTo(14.64, 2);
    expect(result.grossAmount).toBe(96);
    const reconciledGross = round2(result.taxableValue + result.gstAmount);
    expect(Math.abs(reconciledGross - result.grossAmount)).toBeLessThanOrEqual(0.01);
  });

  it('handles ₹0 gross', () => {
    const result = extractGSTFromInclusivePrice(0, 18);
    expect(result.taxableValue).toBe(0);
    expect(result.gstAmount).toBe(0);
    expect(result.grossAmount).toBe(0);
  });

  it('handles negative gross (coerces to 0)', () => {
    const result = extractGSTFromInclusivePrice(-50, 18);
    expect(result.taxableValue).toBe(0);
    expect(result.gstAmount).toBe(0);
    expect(result.grossAmount).toBe(0);
  });

  it('treats MISSING_GST_RATE sentinel as invalid — returns gross as taxable, gstAmount=0', () => {
    const result = extractGSTFromInclusivePrice(118, MISSING_GST_RATE);
    expect(result.taxableValue).toBe(118);
    expect(result.gstAmount).toBe(0);
    expect(result.grossAmount).toBe(118);
  });

  it('treats any negative rate as invalid (not 0% exempt)', () => {
    const result = extractGSTFromInclusivePrice(100, -5);
    expect(result.gstAmount).toBe(0);
    expect(result.taxableValue).toBe(100);
  });

  it('treats rate > 100 as invalid', () => {
    const result = extractGSTFromInclusivePrice(100, 150);
    expect(result.gstAmount).toBe(0);
    expect(result.taxableValue).toBe(100);
  });

  it('correctly extracts for a multi-unit line (qty × unit price)', () => {
    // 3 units × ₹118 = ₹354 gross at 18%
    const lineGross = 3 * 118;
    const result = extractGSTFromInclusivePrice(lineGross, 18);
    expect(result.taxableValue).toBe(300);
    expect(result.gstAmount).toBe(54);
    expect(result.grossAmount).toBe(354);
    expect(round2(result.taxableValue + result.gstAmount)).toBe(result.grossAmount);
  });
});

// ---------------------------------------------------------------------------
// MISSING_GST_RATE sentinel identity
// ---------------------------------------------------------------------------

describe('MISSING_GST_RATE sentinel', () => {
  it('is -1', () => {
    expect(MISSING_GST_RATE).toBe(-1);
  });

  it('is distinct from 0', () => {
    expect(MISSING_GST_RATE).not.toBe(0);
  });

  it('is distinct from 18', () => {
    expect(MISSING_GST_RATE).not.toBe(18);
  });
});

// ---------------------------------------------------------------------------
// calculateInclusiveGSTBreakdown (backward-compat alias)
// ---------------------------------------------------------------------------

describe('calculateInclusiveGSTBreakdown', () => {
  it('returns 0% correctly (zero-rated: gstAmount=0)', () => {
    // gstPercentage <= 0 branch → gstAmount = 0
    const result = calculateInclusiveGSTBreakdown(100, 0);
    expect(result.basePrice).toBe(100);
    expect(result.gstAmount).toBe(0);
    expect(result.totalPrice).toBe(100);
  });

  it('extracts at 18% with rounding', () => {
    const result = calculateInclusiveGSTBreakdown(118, 18);
    expect(result.basePrice).toBe(100);
    expect(result.gstAmount).toBe(18);
    expect(result.totalPrice).toBe(118);
  });

  it('extracts at 5%', () => {
    const result = calculateInclusiveGSTBreakdown(105, 5);
    expect(result.basePrice).toBe(100);
    expect(result.gstAmount).toBe(5);
    expect(result.totalPrice).toBe(105);
  });

  it('returns zeros for 0 price', () => {
    const result = calculateInclusiveGSTBreakdown(0, 18);
    expect(result.gstAmount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateItemPricing — member & non-member pricing off GST-inclusive MRP
// ---------------------------------------------------------------------------

describe('calculateItemPricing', () => {
  it('non-member 4% off MRP', () => {
    // MRP = ₹100 (inclusive), non-member price = ₹96 → 4% discount
    const result = calculateItemPricing(100, 96);
    expect(result.originalMRP).toBe(100);
    expect(result.nonMemberPrice).toBe(96);
    expect(result.nonMemberDiscountPercent).toBe(4);
    // no member discount passed → member price = non-member price
    expect(result.k2kMemberPrice).toBe(96);
  });

  it('KP member 20% off MRP', () => {
    // MRP = ₹100, member gets 20% off → member pays ₹80
    const result = calculateItemPricing(100, 96, 20);
    expect(result.k2kMemberPrice).toBe(80);
    expect(result.k2kMemberSavings).toBe(20);
    expect(result.k2kMemberDiscountPercent).toBe(20);
  });

  it('member price is GST-inclusive (no GST added on top)', () => {
    // At 18%, ₹80 inclusive → taxable = 67.80, gst = 12.20.
    // calculateItemPricing must not add any GST — it returns the inclusive price as-is.
    const result = calculateItemPricing(100, 96, 20);
    expect(result.k2kMemberPrice).toBe(80);
    // Verify extraction works on the resulting member price.
    const breakdown = extractGSTFromInclusivePrice(result.k2kMemberPrice, 18);
    expect(round2(breakdown.taxableValue + breakdown.gstAmount)).toBe(result.k2kMemberPrice);
  });

  it('0% member discount → member price equals non-member price', () => {
    const result = calculateItemPricing(100, 96, 0);
    expect(result.k2kMemberPrice).toBe(96);
  });

  it('safeMRP guard: uses max(originalMRP, nonMemberPrice)', () => {
    // If originalMRP was accidentally set lower than price, safeMRP = price.
    const result = calculateItemPricing(90, 96);
    expect(result.originalMRP).toBe(96);
    expect(result.nonMemberDiscountPercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MRP and discount semantics
// ---------------------------------------------------------------------------

describe('MRP and discount semantics', () => {
  it('discount % is off MRP (inclusive), not off a base price', () => {
    // MRP ₹100, price ₹80 → 20% off MRP
    const result = calculateItemPricing(100, 80);
    expect(result.nonMemberDiscountPercent).toBe(20);
    expect(result.nonMemberSavings).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// GST-exclusive helpers (for completeness / non-inclusive contexts)
// ---------------------------------------------------------------------------

describe('calculatePriceIncludingGST (exclusive input)', () => {
  it('adds GST to exclusive base at 18%', () => {
    expect(calculatePriceIncludingGST(100, 18)).toBe(118);
  });

  it('returns base when gstPercentage is 0', () => {
    expect(calculatePriceIncludingGST(100, 0)).toBe(100);
  });

  it('returns base when basePrice is 0', () => {
    expect(calculatePriceIncludingGST(0, 18)).toBe(0);
  });
});

describe('calculateGSTAmount (exclusive input)', () => {
  it('returns 18 for base=100, rate=18', () => {
    expect(calculateGSTAmount(100, 18)).toBe(18);
  });

  it('returns 0 for rate=0 (zero-rated)', () => {
    expect(calculateGSTAmount(100, 0)).toBe(0);
  });

  it('returns 0 for negative rate', () => {
    expect(calculateGSTAmount(100, -5)).toBe(0);
  });
});

describe('calculateBasePrice', () => {
  it('extracts base from inclusive at 18%', () => {
    expect(calculateBasePrice(118, 18)).toBeCloseTo(100, 5);
  });

  it('returns inclusive price unchanged at 0%', () => {
    expect(calculateBasePrice(100, 0)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Deprecated: calculatePriceWithMembershipDiscount
// ---------------------------------------------------------------------------

describe('calculatePriceWithMembershipDiscount (deprecated, GST-exclusive path)', () => {
  it('applies discount then GST on exclusive base', () => {
    // base = 100 exclusive, 20% member discount → 80 exclusive, 18% GST → 94.40
    const result = calculatePriceWithMembershipDiscount(100, 18, 20);
    expect(result.discountedPrice).toBe(80);
    expect(result.gstAmount).toBeCloseTo(14.4, 2);
    expect(result.finalPrice).toBeCloseTo(94.4, 2);
    expect(result.savings).toBe(20);
  });

  it('returns base unchanged for basePrice=0', () => {
    const result = calculatePriceWithMembershipDiscount(0, 18, 10);
    expect(result.finalPrice).toBe(0);
    expect(result.gstAmount).toBe(0);
  });

  it('no membership discount → only GST added', () => {
    const result = calculatePriceWithMembershipDiscount(100, 18);
    expect(result.discountAmount).toBe(0);
    expect(result.finalPrice).toBeCloseTo(118, 2);
  });
});

// ---------------------------------------------------------------------------
// Reconciliation tests — taxable + GST === gross across all standard rates
// ---------------------------------------------------------------------------

describe('splitGST helper', () => {
  it('splits intra-state GST into CGST and SGST with exact penny reconciliation', () => {
    // 29.29 / 2 -> 14.65 CGST and 14.64 SGST
    const split = splitGST(29.29, true);
    expect(split.cgst).toBe(14.65);
    expect(split.sgst).toBe(14.64);
    expect(split.igst).toBe(0);
    expect(round2(split.cgst + split.sgst)).toBe(29.29);
  });

  it('assigns entire GST to IGST for inter-state', () => {
    const split = splitGST(29.29, false);
    expect(split.cgst).toBe(0);
    expect(split.sgst).toBe(0);
    expect(split.igst).toBe(29.29);
  });

  it('handles 0 GST amount', () => {
    const split = splitGST(0, true);
    expect(split.cgst).toBe(0);
    expect(split.sgst).toBe(0);
    expect(split.igst).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Reconciliation tests — taxable + GST === gross across all standard rates
// ---------------------------------------------------------------------------

describe('Reconciliation: taxable + gstAmount === grossAmount (all standard rates)', () => {
  const rates = [0, 5, 12, 18, 28];
  const testAmounts = [50, 96, 100, 118, 500, 1234.56];

  rates.forEach((rate) => {
    testAmounts.forEach((gross) => {
      it(`rate=${rate}%, gross=₹${gross}`, () => {
        const { taxableValue, gstAmount, grossAmount } = extractGSTFromInclusivePrice(gross, rate);
        const reconstructed = round2(taxableValue + gstAmount);
        expect(Math.abs(reconstructed - grossAmount)).toBeLessThanOrEqual(0.01);
      });
    });
  });
});


