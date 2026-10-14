// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const traceabilityAdminController = require('../controllers/traceabilityAdminController');
const firebaseAuth = require('../middleware/firebaseAuth');

// GET /api/admin/users
router.get('/users', adminController.getAllUsers);

// GET /api/admin/customers/:customerId - Get customer details with order history
router.get('/customers/:customerId', adminController.getCustomerWithOrders);

// Traceability integrity (Inventory ↔ productCategory roots); Bearer token required
router.get('/traceability/issue-types', firebaseAuth, traceabilityAdminController.traceabilityIssueTypes);
router.get(
  '/traceability/integrity/:productId',
  firebaseAuth,
  traceabilityAdminController.getTraceabilityIntegrityForProduct
);
router.get(
  '/traceability/orphan-roots',
  firebaseAuth,
  traceabilityAdminController.scanTraceabilityOrphanRoots
);
router.post(
  '/traceability/repair/missing-root',
  firebaseAuth,
  traceabilityAdminController.repairTraceabilityMissingRoot
);
router.post(
  '/traceability/repair/stale-pointer',
  firebaseAuth,
  traceabilityAdminController.repairTraceabilityStalePointer
);

// Traceability product code management (permanent code registry + reconcile)
router.get(
  '/traceability/codes',
  firebaseAuth,
  traceabilityAdminController.getProductCodeRegistry
);
router.post(
  '/traceability/change-code',
  firebaseAuth,
  traceabilityAdminController.changeTraceabilityCode
);
router.post(
  '/traceability/rebuild-code-registry',
  firebaseAuth,
  traceabilityAdminController.rebuildTraceabilityCodeRegistry
);
router.post(
  '/traceability/reconcile',
  firebaseAuth,
  traceabilityAdminController.reconcileTraceabilityRoots
);

module.exports = router;
