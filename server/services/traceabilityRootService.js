const { db, FieldValue } = require('../firebase/firebase-config');
const {
  COLLECTION_PRODUCTS,
  COLLECTION_TRACEABILITY_ROOTS,
  ENTITY_TYPE_TRACEABILITY_ROOT,
  PRODUCT_SCHEMA_VERSION,
  TRACEABILITY_ROOT_SCHEMA_VERSION,
} = require('../constants/traceabilityConstants');

function deriveCategoryIdsFromStoredProduct(p) {
  if (!p || typeof p !== 'object') return [];
  if (Array.isArray(p.categoryIds) && p.categoryIds.length > 0) return p.categoryIds;
  if (p.categoryId) return [p.categoryId];
  return [];
}

async function getNextProductCategoryId() {
  const snapshot = await db.collection(COLLECTION_TRACEABILITY_ROOTS)
    .orderBy('productCategoryId', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return '001';
  }

  const lastId = snapshot.docs[0].data().productCategoryId;
  if (!lastId) return '001';

  const nextNumber = parseInt(lastId, 10) + 1;
  return nextNumber.toString().padStart(3, '0');
}

function buildSnapshotFields(productData) {
  const name = productData && typeof productData.name === 'string' ? productData.name : '';
  const mainImg =
    productData && productData.images && typeof productData.images.main === 'string'
      ? productData.images.main
      : '';
  const details =
    productData && typeof productData.shortDescription === 'string' && productData.shortDescription
      ? productData.shortDescription
      : productData && typeof productData.description === 'string'
        ? productData.description
        : '';
  const description =
    productData && typeof productData.description === 'string' ? productData.description : '';

  return {
    // Keys for Traceability UI compatibility
    productName: name,
    productImage: mainImg,
    productDetails: details,
    description: description,
    categoryIds: deriveCategoryIdsFromStoredProduct(productData),
  };
}

/**
 * Payload for a new traceability root (server-owned; Firestore auto IDs only).
 */
function buildNewTraceabilityRootDocument(productId, productData, productCategoryId) {
  const ts = FieldValue.serverTimestamp();
  const snaps = buildSnapshotFields(productData);
  return {
    ...snaps,
    productId,
    productCategoryId,
    entityType: ENTITY_TYPE_TRACEABILITY_ROOT,
    schemaVersion: TRACEABILITY_ROOT_SCHEMA_VERSION,
    deletedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Partial update for snapshot sync (does not touch lineage-only fields clients may add later).
 */
function buildSnapshotSyncUpdate(productData) {
  return {
    ...buildSnapshotFields(productData),
    schemaVersion: TRACEABILITY_ROOT_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * @returns {Promise<{ traceabilityDocId: string }>}
 */
async function ensureTraceabilityRoot(productId) {
  const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
  const preProduct = await productRef.get();
  if (!preProduct.exists) {
    const e = new Error('PRODUCT_NOT_FOUND');
    e.code = 'PRODUCT_NOT_FOUND';
    throw e;
  }

  const existingByQuery = await db
    .collection(COLLECTION_TRACEABILITY_ROOTS)
    .where('productId', '==', productId)
    .limit(10)
    .get();

  if (existingByQuery.size > 1) {
    const e = new Error('DUPLICATE_TRACEABILITY_ROOT');
    e.code = 'DUPLICATE_TRACEABILITY_ROOT';
    e.rootIds = existingByQuery.docs.map((d) => d.id);
    throw e;
  }

  const adoptCandidate = existingByQuery.size === 1 ? existingByQuery.docs[0].ref : null;

  const traceabilityDocId = await db.runTransaction(async (t) => {
    const pSnap = await t.get(productRef);
    if (!pSnap.exists) {
      throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
    }
    const pdata = pSnap.data() || {};
    const currentTid = typeof pdata.traceabilityDocId === 'string' ? pdata.traceabilityDocId : '';

    if (currentTid) {
      const rootRef = db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(currentTid);
      const rSnap = await t.get(rootRef);
      if (rSnap.exists) {
        const rd = rSnap.data() || {};
        const rid = rd.productId;
        if (rid === productId) {
          // Check if productCategoryId is missing on either document
          const existingCatId = pdata.productCategoryId || rd.productCategoryId;
          if (!existingCatId) {
            const newCatId = await getNextProductCategoryId();
            t.update(rootRef, {
              productCategoryId: newCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
            t.update(productRef, {
              productCategoryId: newCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else if (!pdata.productCategoryId || !rd.productCategoryId) {
            // Sync if one is missing
            t.update(rootRef, {
              productCategoryId: existingCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
            t.update(productRef, {
              productCategoryId: existingCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          return currentTid;
        }
        if (rid === undefined || rid === null || rid === '') {
          const productCategoryId = pdata.productCategoryId || (await getNextProductCategoryId());
          t.set(
            rootRef,
            {
              productId,
              productCategoryId,
              ...buildSnapshotFields(pdata),
              entityType: ENTITY_TYPE_TRACEABILITY_ROOT,
              schemaVersion: TRACEABILITY_ROOT_SCHEMA_VERSION,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          t.update(productRef, {
            traceabilityDocId: currentTid,
            productCategoryId,
            schemaVersion: PRODUCT_SCHEMA_VERSION,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return currentTid;
        }
      }
    }

    if (adoptCandidate) {
      const rSnap = await t.get(adoptCandidate);
      if (rSnap.exists) {
        const rd = rSnap.data() || {};
        const rid = rd.productId;
        if (!rid || rid === productId) {
          const productCategoryId = pdata.productCategoryId || rd.productCategoryId || (await getNextProductCategoryId());
          t.set(
            adoptCandidate,
            {
              productId,
              productCategoryId,
              ...buildSnapshotFields(pdata),
              entityType: rd.entityType || ENTITY_TYPE_TRACEABILITY_ROOT,
              schemaVersion: TRACEABILITY_ROOT_SCHEMA_VERSION,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          t.update(productRef, {
            traceabilityDocId: adoptCandidate.id,
            productCategoryId,
            schemaVersion: PRODUCT_SCHEMA_VERSION,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return adoptCandidate.id;
        }
      }
    }

    const newRootRef = db.collection(COLLECTION_TRACEABILITY_ROOTS).doc();
    const productCategoryId = await getNextProductCategoryId();
    t.set(newRootRef, buildNewTraceabilityRootDocument(productId, pdata, productCategoryId));
    t.update(productRef, {
      traceabilityDocId: newRootRef.id,
      productCategoryId,
      schemaVersion: PRODUCT_SCHEMA_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return newRootRef.id;
  });

  return { traceabilityDocId };
}

/**
 * Atomic inventory product + traceability root create (prevents disconnected products).
 * @param {FirebaseFirestore.DocumentReference} productRef
 * @param {FirebaseFirestore.DocumentReference} rootRef
 * @param {object} productPayload — fields to persist on `products` (excluding id)
 */
async function createProductWithTraceabilityRootTransaction(productRef, rootRef, productPayload) {
  const productId = productRef.id;
  const productCategoryId = await getNextProductCategoryId();
  const rootBody = buildNewTraceabilityRootDocument(productId, productPayload, productCategoryId);

  await db.runTransaction(async (t) => {
    t.set(productRef, {
      ...productPayload,
      traceabilityDocId: rootRef.id,
      productCategoryId,
      schemaVersion: PRODUCT_SCHEMA_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
    });
    t.set(rootRef, rootBody);
  });
}

/**
 * Syncs snapshot + categoryIds on the linked root when inventory product changes.
 */
async function syncTraceabilityRootFromProduct(productId) {
  const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
  const pSnap = await productRef.get();
  if (!pSnap.exists) {
    const e = new Error('PRODUCT_NOT_FOUND');
    e.code = 'PRODUCT_NOT_FOUND';
    throw e;
  }
  const pdata = pSnap.data() || {};
  let tid = typeof pdata.traceabilityDocId === 'string' ? pdata.traceabilityDocId : '';
  if (!tid) {
    await ensureTraceabilityRoot(productId);
    const again = await productRef.get();
    tid = again.data().traceabilityDocId;
  }
  if (!tid) return { traceabilityDocId: null, synced: false };

  const rootRef = db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(tid);
  await rootRef.set(buildSnapshotSyncUpdate(pdata), { merge: true });
  return { traceabilityDocId: tid, synced: true };
}

// --- Integrity ---

const ISSUE = {
  PRODUCT_MISSING_ROOT: 'PRODUCT_MISSING_ROOT',
  MISMATCH_LINK: 'MISMATCH_LINK',
  DUPLICATE_ROOT: 'DUPLICATE_ROOT',
  ORPHAN_ROOT: 'ORPHAN_ROOT',
  STALE_PRODUCT_POINTER: 'STALE_PRODUCT_POINTER',
};

async function validateProductTraceability(productId) {
  const issues = [];
  const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
  const pSnap = await productRef.get();
  if (!pSnap.exists) {
    issues.push({ type: 'PRODUCT_MISSING', productId });
    return issues;
  }
  const p = pSnap.data() || {};
  const tid = typeof p.traceabilityDocId === 'string' ? p.traceabilityDocId : '';

  const roots = await db
    .collection(COLLECTION_TRACEABILITY_ROOTS)
    .where('productId', '==', productId)
    .limit(25)
    .get();

  if (roots.size > 1) {
    issues.push({
      type: ISSUE.DUPLICATE_ROOT,
      productId,
      rootIds: roots.docs.map((d) => d.id),
    });
  }

  if (!tid) {
    issues.push({ type: ISSUE.PRODUCT_MISSING_ROOT, productId });
    if (roots.size === 1) {
      issues.push({
        type: 'ADOPTABLE_ROOT_EXISTS',
        productId,
        suggestedRootId: roots.docs[0].id,
        note: 'Run ensureTraceabilityRoot or repair/missing-root to link',
      });
    }
  } else {
    const rootSnap = await db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(tid).get();
    if (!rootSnap.exists) {
      issues.push({ type: ISSUE.STALE_PRODUCT_POINTER, productId, traceabilityDocId: tid });
    } else {
      const r = rootSnap.data() || {};
      if (r.productId && r.productId !== productId) {
        issues.push({
          type: ISSUE.MISMATCH_LINK,
          productId,
          traceabilityDocId: tid,
          rootProductId: r.productId,
        });
      }
      if (!r.productId && r.entityType === ENTITY_TYPE_TRACEABILITY_ROOT) {
        issues.push({
          type: ISSUE.MISMATCH_LINK,
          productId,
          traceabilityDocId: tid,
          rootProductId: null,
          note: 'legacy_root_missing_productId',
        });
      }
    }
  }

  return issues;
}

/**
 * Scan roots that claim a productId but product doc is missing (dead link / cleanup candidates).
 */
async function findOrphanRoots({ limit = 200 } = {}) {
  const issues = [];
  const snap = await db.collection(COLLECTION_TRACEABILITY_ROOTS).limit(limit).get();
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const pid = d.productId;
    if (!pid || typeof pid !== 'string') continue;
    const p = await db.collection(COLLECTION_PRODUCTS).doc(pid).get();
    if (!p.exists) {
      issues.push({
        type: ISSUE.ORPHAN_ROOT,
        rootId: doc.id,
        productId: pid,
      });
    }
  }
  return issues;
}

/**
 * Admin-safe: ensure link exists (idempotent).
 */
async function repairMissingRootForProduct(productId) {
  return ensureTraceabilityRoot(productId);
}

/**
 * Admin-safe: stale pointer (root doc missing). Creates a new root and links.
 */
async function repairStaleProductPointer(productId) {
  const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
  const pSnap = await productRef.get();
  if (!pSnap.exists) {
    const e = new Error('PRODUCT_NOT_FOUND');
    e.code = 'PRODUCT_NOT_FOUND';
    throw e;
  }
  const tid = pSnap.data().traceabilityDocId;
  if (tid) {
    const r = await db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(tid).get();
    if (r.exists) return { traceabilityDocId: tid, repaired: false };
  }
  await productRef.update({ traceabilityDocId: FieldValue.delete() });
  return { ...(await ensureTraceabilityRoot(productId)), repaired: true };
}

/**
 * Marks traceability root when inventory product is removed (soft-delete friendly).
 */
async function markTraceabilityRootDeletedForProduct(productId) {
  const pSnap = await db.collection(COLLECTION_PRODUCTS).doc(productId).get();
  if (!pSnap.exists) return { ok: false };
  const tid = pSnap.data().traceabilityDocId;
  if (!tid) return { ok: true, skipped: true };
  const rootRef = db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(tid);
  await rootRef.set(
    {
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true, traceabilityDocId: tid };
}

module.exports = {
  deriveCategoryIdsFromStoredProduct,
  buildSnapshotFields,
  buildNewTraceabilityRootDocument,
  ensureTraceabilityRoot,
  createProductWithTraceabilityRootTransaction,
  syncTraceabilityRootFromProduct,
  validateProductTraceability,
  findOrphanRoots,
  repairMissingRootForProduct,
  repairStaleProductPointer,
  markTraceabilityRootDeletedForProduct,
  ISSUE,
};
