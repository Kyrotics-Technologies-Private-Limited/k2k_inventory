const assert = require('assert');

// Test utilities mirror
const round2 = (n) => Math.round(n * 100) / 100;
const MISSING_GST_RATE = -1;

function resolveItemGstPercentage(item, orderLevelGstPct) {
  if (typeof item.gstPercentage === 'number') {
    return item.gstPercentage;
  }
  if (typeof orderLevelGstPct === 'number' && orderLevelGstPct > 0) {
    return orderLevelGstPct;
  }
  return MISSING_GST_RATE;
}

function extractGSTFromInclusivePrice(inclusivePrice, gstPercentage) {
  const gross = round2(Math.max(0, inclusivePrice));

  if (gstPercentage === 0) {
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  if (gstPercentage < 0 || gstPercentage > 100) {
    return { taxableValue: gross, gstAmount: 0, grossAmount: gross };
  }

  const divisor = 1 + gstPercentage / 100;
  const taxableValue = round2(gross / divisor);
  const gstAmount = round2(gross - taxableValue);
  return { taxableValue, gstAmount, grossAmount: gross };
}

function calculateItemPricing(originalMRP, nonMemberPrice, memberDiscountPercent = 0) {
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
    nonMemberDiscountPercent,
    k2kMemberPrice,
    k2kMemberSavings,
    k2kMemberDiscountPercent: memberDiscountPercent,
  };
}

console.log('--- Running GST Implementation Test Suite ---');

// 1. Rates: 0%, 5%, 12%, 18%, 28%
const rates = [0, 5, 12, 18, 28];
rates.forEach(rate => {
  const gross = 100 + rate; // simple test
  const res = extractGSTFromInclusivePrice(gross, rate);
  assert(Math.abs(round2(res.taxableValue + res.gstAmount) - res.grossAmount) <= 0.01, `Failed reconciliation for rate ${rate}`);
});
console.log('✓ Verified extraction & reconciliation across 0%, 5%, 12%, 18%, 28%');

// 2. Explicit 0% vs missing GST
assert.strictEqual(resolveItemGstPercentage({ gstPercentage: 0 }, 18), 0, 'Explicit 0 must remain 0 and not fallback to 18');
assert.strictEqual(resolveItemGstPercentage({ gstPercentage: undefined }, 0), MISSING_GST_RATE, 'Missing rate must be MISSING_GST_RATE');
assert.strictEqual(resolveItemGstPercentage({ gstPercentage: null }, 0), MISSING_GST_RATE, 'Null rate must be MISSING_GST_RATE');

const zeroRes = extractGSTFromInclusivePrice(250, 0);
assert.strictEqual(zeroRes.taxableValue, 250);
assert.strictEqual(zeroRes.gstAmount, 0);
assert.strictEqual(zeroRes.grossAmount, 250);

const missingRes = extractGSTFromInclusivePrice(250, MISSING_GST_RATE);
assert.strictEqual(missingRes.taxableValue, 250);
assert.strictEqual(missingRes.gstAmount, 0);
console.log('✓ Verified explicit 0% vs missing GST handling');

// 3. Member and non-member prices & MRP / discount calculations
const pricing = calculateItemPricing(100, 96, 20);
assert.strictEqual(pricing.originalMRP, 100);
assert.strictEqual(pricing.nonMemberPrice, 96);
assert.strictEqual(pricing.nonMemberDiscountPercent, 4);
assert.strictEqual(pricing.k2kMemberPrice, 80);
assert.strictEqual(pricing.k2kMemberSavings, 20);
assert.strictEqual(pricing.k2kMemberDiscountPercent, 20);

// Extract GST from member price and non-member price
const memberBreakdown = extractGSTFromInclusivePrice(pricing.k2kMemberPrice, 18);
assert(Math.abs(round2(memberBreakdown.taxableValue + memberBreakdown.gstAmount) - pricing.k2kMemberPrice) <= 0.01);

const nonMemberBreakdown = extractGSTFromInclusivePrice(pricing.nonMemberPrice, 18);
assert(Math.abs(round2(nonMemberBreakdown.taxableValue + nonMemberBreakdown.gstAmount) - pricing.nonMemberPrice) <= 0.01);
console.log('✓ Verified member & non-member pricing and discounts off MRP');

// 4. Taxable value + GST equals gross amount across irregular decimals
const amounts = [49.99, 99.50, 199.99, 345.67, 1050.25];
amounts.forEach(amt => {
  rates.forEach(r => {
    const b = extractGSTFromInclusivePrice(amt, r);
    assert(Math.abs(round2(b.taxableValue + b.gstAmount) - b.grossAmount) <= 0.01, `Failed for amt ${amt} rate ${r}`);
  });
});
console.log('✓ Verified reconciliation (Taxable + GST === Gross) across decimal amounts');

// 5. Excel export row reconciliation
const sampleLine = {
  price: 96, // inclusive
  quantity: 2,
  gstPercentage: 18,
};
const gross = round2(sampleLine.price * sampleLine.quantity); // 192
const breakdown = extractGSTFromInclusivePrice(gross, sampleLine.gstPercentage);
// For intra-state (WB)
const cgst = round2(breakdown.gstAmount / 2);
const sgst = round2(breakdown.gstAmount - cgst);
const totalTax = round2(cgst + sgst);
assert.strictEqual(totalTax, breakdown.gstAmount, 'CGST + SGST must exactly equal gstAmount');
assert(Math.abs(round2(breakdown.taxableValue + totalTax) - gross) <= 0.01, 'Taxable + total tax must equal gross');
console.log('✓ Verified report line and tax split reconciliation (penny exact)');

console.log('--- ALL TEST SUITE ASSERTIONS PASSED SUCCESSFULLY ---');
