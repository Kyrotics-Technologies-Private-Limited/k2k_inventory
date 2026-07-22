const { db } = require('../firebase/firebase-config');
const {
  createProductWithTraceabilityRootTransaction,
  syncTraceabilityRootFromProduct,
  markTraceabilityRootDeletedForProduct,
} = require('../services/traceabilityRootService');
const {
  syncProductCategories,
  removeProductFromAllCategories,
} = require('../services/categoryMembershipService');
const { scheduleManifestRebuild } = require('../services/catalogManifestService');
const {
  attachStockStatus,
  attachStockStatusToMany,
  stripStockFieldsFromWrite,
} = require('../services/productStockService');

const PRODUCTS = 'products';
const CATEGORIES = 'categories';
const VALID_STATUSES = ['active', 'hidden', 'draft'];

const SERVER_OWNED_FIELDS = new Set([
  'id',
  'traceabilityDocId',
  'schemaVersion',
]);

/**
 * Resolve legacy category display fields from canonical categoryIds.
 * @deprecated category / categories — kept for backward compatibility during migration.
 */
async function resolveDeprecatedCategoryFields(categoryIds) {
  if (!categoryIds?.length) {
    return { category: undefined, categories: [] };
  }

  const names = [];
  for (const catId of categoryIds) {
    const doc = await db.collection(CATEGORIES).doc(catId).get();
    if (doc.exists) {
      names.push(doc.data().name);
    }
  }

  return {
    category: names[0],
    categories: names,
  };
}

function formatProduct(doc) {
  return { id: doc.id, ...doc.data() };
}

function stripServerOwnedFields(body) {
  const cleaned = stripStockFieldsFromWrite(body);
  for (const key of SERVER_OWNED_FIELDS) {
    delete cleaned[key];
  }
  return cleaned;
}

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const body = stripServerOwnedFields(req.body);
    const { categoryIds: inputCategoryIds, status: inputStatus, ...rest } = body;
    const categoryIds = Array.isArray(inputCategoryIds) ? inputCategoryIds : [];
    const status = inputStatus || 'active';

    if (inputStatus && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const deprecated = await resolveDeprecatedCategoryFields(categoryIds);
    const now = new Date();

    const rank = req.body.rank !== undefined && req.body.rank !== null && req.body.rank !== "" ? Number(req.body.rank) : null;
    const productData = {
      ...rest,
      categoryIds,
      status,
      rank,
      category: deprecated.category,
      categories: deprecated.categories,
      createdAt: now,
      updatedAt: now,
    };

    const productRef = db.collection(PRODUCTS).doc();
    const rootRef = db.collection('productCategory').doc();

    await createProductWithTraceabilityRootTransaction(productRef, rootRef, productData);

    if (categoryIds.length > 0) {
      try {
        await syncProductCategories(productRef.id, categoryIds);
      } catch (syncErr) {
        console.error('Category membership sync failed:', syncErr.message);
      }
    }

    try {
      await syncTraceabilityRootFromProduct(productRef.id);
    } catch (syncErr) {
      console.error('Traceability snapshot sync failed:', syncErr.message);
    }

    scheduleManifestRebuild();

    const created = await productRef.get();
    const formatted = await attachStockStatus(formatProduct(created));
    res.status(201).json(formatted);
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Products (inventory admin — returns all statuses)
exports.getAllProducts = async (req, res) => {
  try {
    const snapshot = await db.collection(PRODUCTS).get();
    const products = await attachStockStatusToMany(snapshot.docs.map(formatProduct));
    
    // Sort products by rank ascending (treating undefined/null as lowest priority, i.e., end of list)
    products.sort((a, b) => {
      const rankA = a.rank !== undefined && a.rank !== null ? a.rank : 999999;
      const rankB = b.rank !== undefined && b.rank !== null ? b.rank : 999999;
      return rankA - rankB;
    });

    res.status(200).json(products);
  } catch (error) {
    console.error('getAllProducts error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(PRODUCTS).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const body = stripServerOwnedFields(req.body);
    const { categoryIds: inputCategoryIds, status: inputStatus, ...rest } = body;
    const updates = { ...rest };

    if (req.body.rank !== undefined) {
      updates.rank = req.body.rank !== null && req.body.rank !== "" ? Number(req.body.rank) : null;
    }

    if (inputStatus !== undefined) {
      if (!VALID_STATUSES.includes(inputStatus)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      updates.status = inputStatus;
    }

    if (inputCategoryIds !== undefined) {
      if (!Array.isArray(inputCategoryIds)) {
        return res.status(400).json({ error: 'categoryIds must be an array' });
      }

      const syncResult = await syncProductCategories(id, inputCategoryIds);
      const deprecated = await resolveDeprecatedCategoryFields(syncResult.categoryIds);
      updates.categoryIds = syncResult.categoryIds;
      updates.category = deprecated.category;
      updates.categories = deprecated.categories;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updatedAt = new Date();
    await docRef.update(updates);

    try {
      await syncTraceabilityRootFromProduct(id);
    } catch (syncErr) {
      console.error('Traceability snapshot sync failed:', syncErr.message);
    }

    scheduleManifestRebuild();

    const refreshed = await docRef.get();
    const formatted = await attachStockStatus(formatProduct(refreshed));
    res.status(200).json(formatted);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('updateProduct error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Patch product visibility status
exports.patchProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const docRef = db.collection(PRODUCTS).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await docRef.update({ status, updatedAt: new Date() });
    scheduleManifestRebuild();

    const refreshed = await docRef.get();
    const formatted = await attachStockStatus(formatProduct(refreshed));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('patchProductStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await markTraceabilityRootDeletedForProduct(id);
    } catch (markErr) {
      console.error('Traceability root tombstone failed:', markErr.message);
    }
    try {
      await removeProductFromAllCategories(id);
    } catch (membershipErr) {
      console.error('Category membership cleanup failed:', membershipErr.message);
    }
    await db.collection(PRODUCTS).doc(id).delete();
    scheduleManifestRebuild();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.collection(PRODUCTS).doc(id).get();

    if (!product.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const formatted = await attachStockStatus(formatProduct(product));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
