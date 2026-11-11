// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const traceabilityAdminController = require('../controllers/traceabilityAdminController');
const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');

// All admin routes require authenticated administrator access
router.use([firebaseAuth, requireAdmin]);

// GET /api/admin/users
router.get('/users', adminController.getAllUsers);

// GET /api/admin/customers/:customerId - Get customer details with order history
router.get('/customers/:customerId', adminController.getCustomerWithOrders);

// Traceability integrity (Inventory ↔ productCategory roots)
router.get('/traceability/issue-types', traceabilityAdminController.traceabilityIssueTypes);
router.get(
  '/traceability/integrity/:productId',
  traceabilityAdminController.getTraceabilityIntegrityForProduct
);
router.get(
  '/traceability/orphan-roots',
  traceabilityAdminController.scanTraceabilityOrphanRoots
);
router.post(
  '/traceability/repair/missing-root',
  traceabilityAdminController.repairTraceabilityMissingRoot
);
router.post(
  '/traceability/repair/stale-pointer',
  traceabilityAdminController.repairTraceabilityStalePointer
);

// Traceability product code management (permanent code registry + reconcile)
router.get(
  '/traceability/codes',
  traceabilityAdminController.getProductCodeRegistry
);
router.post(
  '/traceability/change-code',
  traceabilityAdminController.changeTraceabilityCode
);
router.post(
  '/traceability/rebuild-code-registry',
  traceabilityAdminController.rebuildTraceabilityCodeRegistry
);
router.post(
  '/traceability/reconcile',
  traceabilityAdminController.reconcileTraceabilityRoots
);

module.exports = router;

