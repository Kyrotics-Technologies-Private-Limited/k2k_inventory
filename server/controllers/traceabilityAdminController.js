const {
  validateProductTraceability,
  findOrphanRoots,
  repairMissingRootForProduct,
  repairStaleProductPointer,
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
