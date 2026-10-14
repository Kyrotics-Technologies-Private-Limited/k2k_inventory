const { db } = require('../firebase/firebase-config');
const {
  validateProductTraceability,
  findOrphanRoots,
  repairMissingRootForProduct,
  repairStaleProductPointer,
  changeProductCode,
  rebuildProductCodeRegistry,
  reconcileTraceabilityRoots,
  ISSUE,
} = require('../services/traceabilityRootService');

exports.getTraceabilityIntegrityForProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ error: 'productId required' });
    const issues = await validateProductTraceability(productId);
    res.json({ productId, issues, ok: issues.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.scanTraceabilityOrphanRoots = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const issues = await findOrphanRoots({ limit });
    res.json({ count: issues.length, issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.repairTraceabilityMissingRoot = async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId required' });
    const result = await repairMissingRootForProduct(productId);
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.code === 'DUPLICATE_TRACEABILITY_ROOT') {
      return res.status(409).json({ error: err.message, code: err.code, rootIds: err.rootIds });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.repairTraceabilityStalePointer = async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId required' });
    const result = await repairStaleProductPointer(productId);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.traceabilityIssueTypes = async (_req, res) => {
  res.json({ ISSUE });
};

exports.changeTraceabilityCode = async (req, res) => {
  try {
    const { productId, code, reason } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId required' });
    if (code === undefined || code === null || String(code).trim() === '') {
      return res.status(400).json({ error: 'code required' });
    }
    const result = await changeProductCode(productId, code, {
      changedBy: req.user?.uid || null,
      reason: reason || null,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    if (['PRODUCT_CODE_INVALID', 'PRODUCT_CODE_OUT_OF_RANGE'].includes(err.code)) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product not found', code: err.code });
    }
    if (['PRODUCT_CODE_TAKEN', 'PRODUCT_CODE_RETIRED'].includes(err.code)) {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProductCodeRegistry = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const snap = await db.collection('productCodes').limit(limit).get();
    const codes = snap.docs
      .map((d) => ({ code: d.id, ...d.data() }))
      .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));
    res.json({ count: codes.length, codes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.rebuildTraceabilityCodeRegistry = async (req, res) => {
  try {
    const dryRun = req.body?.dryRun !== false && req.query.dryRun !== 'false';
    const report = await rebuildProductCodeRegistry({ dryRun });
    res.json({ ok: true, ...report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.reconcileTraceabilityRoots = async (req, res) => {
  try {
    const dryRun = req.body?.dryRun !== false && req.query.dryRun !== 'false';
    const report = await reconcileTraceabilityRoots({ dryRun });
    res.json({ ok: true, ...report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

