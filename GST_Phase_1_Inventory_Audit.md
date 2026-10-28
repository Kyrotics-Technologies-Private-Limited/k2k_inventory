# GST Phase 1 — Inventory GST Alignment Audit

## 1) Executive Summary
Audit only. No code changes made. Inventory uses MRP/off-MRP model with GST stored per variant; reports add GST on top (GST-exclusive/addition). Storefront expects GST-inclusive.

## 2) Verified Current Behavior
- client/src/types/variant.ts:1-15 - price, originalPrice, memberPrice, discounts, gstPercentage
- client/src/utils/gstCalculations.ts:14-150 - mixed models; calculatePriceWithMembershipDiscount adds GST
- client/src/components/admin/variants/AddVariantForm.tsx:69-132 - discounts off originalPrice, GST default 18%
- client/src/components/admin/variants/EditVariantModal.tsx:97-158 - same
- server/controllers/VariantController.js:4-131 - passthrough
- server/controllers/reportController.js:80-142 - adds GST, defaults to 18% if missing/zero, WB heuristic
- client/src/pages/admin/Reports.tsx:89-228 - displays taxable, GST split, invoice value

## 3) Findings Unverified
- Price semantics need production data check

## 4) Proposed Changes (No Implementation)
- Reports: extract tax from inclusive prices, fix 0% and place of supply
- Utils: add inclusive extraction helpers

## 5) Risks and Storefront Dependencies
- Storefront alignment required; no historical data rewrite

## 6) Test Cases and Acceptance Criteria
- 0/5/12/18/28%, member/non-member, discounts, missing vs 0%, reconciliation

## 7) Final GO / NO-GO Recommendation
GO - proceed after data check and storefront coordination
