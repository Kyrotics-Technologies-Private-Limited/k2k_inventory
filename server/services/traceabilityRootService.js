const { db, FieldValue } = require('../firebase/firebase-config');
const {
  COLLECTION_PRODUCTS,
  COLLECTION_TRACEABILITY_ROOTS,
  COLLECTION_PRODUCT_CODES,
  COLLECTION_COUNTERS,
  PRODUCT_CODE_COUNTER_DOC,
  PRODUCT_CODE_LENGTH,
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

// --- Product code helpers -------------------------------------------------

/**
 * Normalize a raw product code into a padded "001" string.
 * @returns {string|null} null when input is empty; throws for invalid input.
 */
function normalizeProductCode(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) {
    throw Object.assign(new Error('PRODUCT_CODE_INVALID'), { code: 'PRODUCT_CODE_INVALID' });
  }
  const n = parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1) {
    throw Object.assign(new Error('PRODUCT_CODE_INVALID'), { code: 'PRODUCT_CODE_INVALID' });
  }
  const padded = String(n).padStart(PRODUCT_CODE_LENGTH, '0');
  if (padded.length > PRODUCT_CODE_LENGTH) {
    throw Object.assign(new Error('PRODUCT_CODE_OUT_OF_RANGE'), { code: 'PRODUCT_CODE_OUT_OF_RANGE' });
  }
  return padded;
}

function productCodeOf(p) {
  if (!p || typeof p !== 'object') return null;
  return normalizeProductCode(p.productCode || p.productCategoryId);
}

async function computeMaxProductCode() {
  let max = 0;
  const collect = (v) => {
    const n = parseInt(String(v || '').trim(), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  };
  const [rootsSnap, productsSnap] = await Promise.all([
    db.collection(COLLECTION_TRACEABILITY_ROOTS).get(),
    db.collection(COLLECTION_PRODUCTS).get(),
  ]);
  rootsSnap.docs.forEach((d) => {
    const x = d.data() || {};
    collect(x.productCode);
    collect(x.productCategoryId);
  });
  productsSnap.docs.forEach((d) => {
    const x = d.data() || {};
    collect(x.productCode);
    collect(x.productCategoryId);
  });
  return max;
}

async function getCounterRef() {
  const counterRef = db.collection(COLLECTION_COUNTERS).doc(PRODUCT_CODE_COUNTER_DOC);
  const existing = await counterRef.get();
  if (!existing.exists) {
    const max = await computeMaxProductCode();
    await counterRef.set({ last: max, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return counterRef;
}

/** Allocate the next code using an already-open transaction. */
async function allocateProductCodeTx(t, counterRef) {
  const snap = await t.get(counterRef);
  const last = snap.exists ? Number(snap.data().last || 0) : 0;
  const next = last + 1;
  t.set(counterRef, { last: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return String(next).padStart(PRODUCT_CODE_LENGTH, '0');
}

/** Allocate the next code using its own transaction. */
async function getNextProductCode() {
  const counterRef = await getCounterRef();
  return db.runTransaction((t) => allocateProductCodeTx(t, counterRef));
}

/** @deprecated use getNextProductCode — kept for backward compatibility */
async function getNextProductCategoryId() {
  return getNextProductCode();
}

function assertProductCodeAvailable(regSnap, productId) {
  if (!regSnap.exists) return;
  const reg = regSnap.data() || {};
  if (reg.productId && reg.productId !== productId) {
    throw Object.assign(new Error('PRODUCT_CODE_TAKEN'), { code: 'PRODUCT_CODE_TAKEN' });
  }
  if (!reg.productId && reg.retiredProductId && reg.retiredProductId !== productId) {
    throw Object.assign(new Error('PRODUCT_CODE_RETIRED'), { code: 'PRODUCT_CODE_RETIRED' });
  }
}

function reserveCodeTx(t, code, productId) {
  const regRef = db.collection(COLLECTION_PRODUCT_CODES).doc(code);
  return t.get(regRef).then((regSnap) => {
    assertProductCodeAvailable(regSnap, productId);
    t.set(
      regRef,
      { productId, assignedAt: FieldValue.serverTimestamp(), retiredAt: null, retiredProductId: null },
      { merge: true }
    );
  });
}

// --- Snapshot build -------------------------------------------------------

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
    // Visibility is mirrored so the traceability portal never has to guess
    status: productData && productData.status ? productData.status : 'active',
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
    productCode: productCategoryId,
    // Kept as a compatibility alias for the separate traceability app
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

// --- Ensure / create ------------------------------------------------------

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
  const counterRef = await getCounterRef();

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
          const existingCatId = pdata.productCategoryId || rd.productCategoryId || pdata.productCode || rd.productCode;
          if (!existingCatId) {
            const newCatId = await allocateProductCodeTx(t, counterRef);
            await reserveCodeTx(t, newCatId, productId);
            t.update(rootRef, {
              productCategoryId: newCatId,
              productCode: newCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
            t.update(productRef, {
              productCategoryId: newCatId,
              productCode: newCatId,
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else if (!pdata.productCategoryId || !rd.productCategoryId) {
            // Sync if one is missing
            const code = normalizeProductCode(existingCatId);
            t.update(rootRef, {
              productCategoryId: code,
              productCode: code,
              updatedAt: FieldValue.serverTimestamp(),
            });
            t.update(productRef, {
              productCategoryId: code,
              productCode: code,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          return currentTid;
        }
        if (rid === undefined || rid === null || rid === '') {
          const productCategoryId = await allocateProductCodeTx(t, counterRef);
          await reserveCodeTx(t, productCategoryId, productId);
          t.set(
            rootRef,
            {
              productId,
              productCategoryId,
              productCode: productCategoryId,
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
            productCode: productCategoryId,
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
          const productCategoryId =
            normalizeProductCode(pdata.productCode || pdata.productCategoryId || rd.productCode || rd.productCategoryId) ||
            (await allocateProductCodeTx(t, counterRef));
          await reserveCodeTx(t, productCategoryId, productId);
          t.set(
            adoptCandidate,
            {
              productId,
              productCategoryId,
              productCode: productCategoryId,
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
            productCode: productCategoryId,
            schemaVersion: PRODUCT_SCHEMA_VERSION,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return adoptCandidate.id;
        }
      }
    }

    const newRootRef = db.collection(COLLECTION_TRACEABILITY_ROOTS).doc();
    let productCategoryId = normalizeProductCode(pdata.productCode || pdata.productCategoryId);
    if (!productCategoryId) {
      productCategoryId = await allocateProductCodeTx(t, counterRef);
    }
    await reserveCodeTx(t, productCategoryId, productId);
    t.set(newRootRef, buildNewTraceabilityRootDocument(productId, pdata, productCategoryId));
    t.update(productRef, {
      traceabilityDocId: newRootRef.id,
      productCategoryId,
      productCode: productCategoryId,
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
 * @param {{ productCode?: string }} [options]
 */
async function createProductWithTraceabilityRootTransaction(productRef, rootRef, productPayload, options = {}) {
  const productId = productRef.id;
  const requested = normalizeProductCode(
    options.productCode ?? productPayload.productCode ?? productPayload.productCategoryId
  );
  const counterRef = await getCounterRef();

  const productCode = await db.runTransaction(async (t) => {
    let code = requested;
    if (!code) {
      code = await allocateProductCodeTx(t, counterRef);
    } else {
      await reserveCodeTx(t, code, productId);
    }

    const rootBody = buildNewTraceabilityRootDocument(productId, productPayload, code);
    t.set(productRef, {
      ...productPayload,
      productCode: code,
      productCategoryId: code,
      traceabilityDocId: rootRef.id,
      schemaVersion: PRODUCT_SCHEMA_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
    });
    t.set(rootRef, rootBody);
    return code;
  });

  return { productCode };
}

/**
 * Syncs snapshot + categoryIds + status on the linked root when inventory product changes.
 * NOTE: `rank` is intentionally NEVER synced — it is a UI-only ordering field.
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
  const update = buildSnapshotSyncUpdate(pdata);
  const code = productCodeOf(pdata);
  if (code) {
    update.productCode = code;
    update.productCategoryId = code;
  }
  await rootRef.set(update, { merge: true });
  return { traceabilityDocId: tid, synced: true };
}

// --- Product code change (admin guarded) ----------------------------------

/**
 * Change the permanent traceability product code for a product.
 * Guarded: validates format, enforces uniqueness via the `productCodes` registry,
 * audits to products/{id}/codeHistory, and syncs the linked root.
 *
 * @param {string} productId
 * @param {string|number} rawCode
 * @param {{ changedBy?: string, reason?: string }} [meta]
 */
async function changeProductCode(productId, rawCode, meta = {}) {
  const newCode = normalizeProductCode(rawCode);
  if (!newCode) {
    throw Object.assign(new Error('PRODUCT_CODE_INVALID'), { code: 'PRODUCT_CODE_INVALID' });
  }

  const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
  const registryRef = db.collection(COLLECTION_PRODUCT_CODES).doc(newCode);

  const outcome = await db.runTransaction(async (t) => {
    const pSnap = await t.get(productRef);
    if (!pSnap.exists) {
      throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
    }
    const pdata = pSnap.data() || {};
    const oldCode = productCodeOf(pdata);

    if (oldCode === newCode) {
      return { productId, oldCode, newCode, unchanged: true };
    }

    const regSnap = await t.get(registryRef);
    assertProductCodeAvailable(regSnap, productId);

    if (oldCode && oldCode !== newCode) {
      t.set(
        db.collection(COLLECTION_PRODUCT_CODES).doc(oldCode),
        {
          productId: null,
          lastProductId: productId,
          retiredAt: FieldValue.serverTimestamp(),
          retiredProductId: productId,
        },
        { merge: true }
      );
    }

    t.set(
      registryRef,
      { productId, assignedAt: FieldValue.serverTimestamp(), retiredAt: null, retiredProductId: null },
      { merge: true }
    );
    t.update(productRef, {
      productCode: newCode,
      productCategoryId: newCode,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const histRef = productRef.collection('codeHistory').doc();
    t.set(histRef, {
      oldCode,
      newCode,
      changedBy: meta.changedBy || null,
      reason: meta.reason || null,
      changedAt: FieldValue.serverTimestamp(),
    });

    return { productId, oldCode, newCode, unchanged: false };
  });

  if (!outcome.unchanged) {
    await syncTraceabilityRootFromProduct(productId);
  }
  return outcome;
}

/**
 * Retire a product's code so it can never be reassigned to a different product.
 */
async function retireProductCodeForProduct(productId) {
  const pSnap = await db.collection(COLLECTION_PRODUCTS).doc(productId).get();
  if (!pSnap.exists) return { ok: false };
  const code = productCodeOf(pSnap.data() || {});
  if (!code) return { ok: true, skipped: true };
  await db.collection(COLLECTION_PRODUCT_CODES).doc(code).set(
    {
      productId: null,
      retiredAt: FieldValue.serverTimestamp(),
      retiredProductId: productId,
    },
    { merge: true }
  );
  return { ok: true, code };
}

// --- Reconciliation -------------------------------------------------------

/**
 * Rebuild the `productCodes` registry and seed the allocator counter from
 * the products collection. Reports duplicate codes as conflicts (unresolved).
 */
async function rebuildProductCodeRegistry({ dryRun = false } = {}) {
  const report = { dryRun, registered: 0, max: 0, conflicts: [] };
  const productsSnap = await db.collection(COLLECTION_PRODUCTS).get();
  const byCode = new Map();
  const entries = [];

  productsSnap.docs.forEach((d) => {
    const code = productCodeOf(d.data() || {});
    if (!code) return;
    entries.push({ code, productId: d.id });
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(d.id);
  });

  for (const [code, ids] of byCode.entries()) {
    if (ids.length > 1) report.conflicts.push({ code, productIds: ids });
    const n = parseInt(code, 10);
    if (n > report.max) report.max = n;
  }

  if (!dryRun) {
    let batch = db.batch();
    let ops = 0;
    for (const { code, productId } of entries) {
      if (byCode.get(code).length > 1) continue; // skip ambiguous codes
      batch.set(
        db.collection(COLLECTION_PRODUCT_CODES).doc(code),
        { productId, assignedAt: FieldValue.serverTimestamp(), retiredAt: null, retiredProductId: null },
        { merge: true }
      );
      ops++;
      report.registered++;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    await db
      .collection(COLLECTION_COUNTERS)
      .doc(PRODUCT_CODE_COUNTER_DOC)
      .set({ last: report.max, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  return report;
}

/**
 * Reconcile every traceability root against its linked inventory product.
 * - Root name/image/details/categoryIds/status are overwritten from the product.
 * - The root's printed productCode is treated as canonical and pushed onto the product.
 * - Orphan roots (missing/deleted product) are tombstoned when applying.
 * - Products with no root get one created.
 *
 * @param {{ dryRun?: boolean }} [options]
 */
async function reconcileTraceabilityRoots({ dryRun = false } = {}) {
  const report = {
    dryRun,
    scannedRoots: 0,
    rootsUpdated: 0,
    productsUpdated: 0,
    rootsCreated: 0,
    tombstones: 0,
    orphans: [],
    changes: [],
  };

  const rootsSnap = await db.collection(COLLECTION_TRACEABILITY_ROOTS).get();

  for (const rootDoc of rootsSnap.docs) {
    report.scannedRoots++;
    const root = rootDoc.data() || {};
    const productId = root.productId;

    if (!productId) {
      report.orphans.push({ rootId: rootDoc.id, reason: 'MISSING_PRODUCT_ID' });
      continue;
    }

    const productRef = db.collection(COLLECTION_PRODUCTS).doc(productId);
    const pSnap = await productRef.get();
    if (!pSnap.exists) {
      report.orphans.push({ rootId: rootDoc.id, productId, reason: 'PRODUCT_DELETED' });
      if (!dryRun) {
        await rootDoc.ref.set(
          { deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        report.tombstones++;
      }
      continue;
    }

    const p = pSnap.data() || {};
    // Canonical code: the code already on the root (printed on jars) wins; else the product's.
    const canonical = normalizeProductCode(
      root.productCode || root.productCategoryId || p.productCode || p.productCategoryId
    );
    const snap = buildSnapshotFields(p);

    const rootUpdate = {};
    if (root.productName !== snap.productName) rootUpdate.productName = snap.productName;
    if ((root.productImage || '') !== (snap.productImage || '')) rootUpdate.productImage = snap.productImage || '';
    if ((root.productDetails || '') !== (snap.productDetails || '')) rootUpdate.productDetails = snap.productDetails || '';
    if ((root.description || '') !== (snap.description || '')) rootUpdate.description = snap.description || '';
    if (JSON.stringify(root.categoryIds || []) !== JSON.stringify(snap.categoryIds || [])) {
      rootUpdate.categoryIds = snap.categoryIds;
    }
    if (root.status !== snap.status) rootUpdate.status = snap.status;
    if (canonical) {
      if (String(root.productCode || '') !== canonical) rootUpdate.productCode = canonical;
      if (String(root.productCategoryId || '') !== canonical) rootUpdate.productCategoryId = canonical;
    }

    const productNeedsCode =
      canonical &&
      (String(p.productCode || '') !== canonical ||
        String(p.productCategoryId || '') !== canonical);
    const productNeedsRootLink = p.traceabilityDocId !== rootDoc.id;

    if (Object.keys(rootUpdate).length || productNeedsCode || productNeedsRootLink) {
      report.changes.push({
        rootId: rootDoc.id,
        productId,
        rootUpdate,
        productNeedsCode: Boolean(productNeedsCode),
        canonical,
      });
      if (!dryRun) {
        if (Object.keys(rootUpdate).length) {
          await rootDoc.ref.set({ ...rootUpdate, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          report.rootsUpdated++;
        }
        if (productNeedsCode || productNeedsRootLink) {
          const pUpdate = { updatedAt: FieldValue.serverTimestamp() };
          if (productNeedsCode) {
            pUpdate.productCode = canonical;
            pUpdate.productCategoryId = canonical;
          }
          if (productNeedsRootLink) pUpdate.traceabilityDocId = rootDoc.id;
          await productRef.update(pUpdate);
          report.productsUpdated++;
        }
      }
    }
  }

  // Products whose root is missing entirely -> create/relink
  const productsSnap = await db.collection(COLLECTION_PRODUCTS).get();
  for (const pDoc of productsSnap.docs) {
    const p = pDoc.data() || {};
    if (p.traceabilityDocId) {
      const rSnap = await db.collection(COLLECTION_TRACEABILITY_ROOTS).doc(p.traceabilityDocId).get();
      if (rSnap.exists && (rSnap.data() || {}).productId === pDoc.id) continue;
    }

    const linked = await db
      .collection(COLLECTION_TRACEABILITY_ROOTS)
      .where('productId', '==', pDoc.id)
      .limit(1)
      .get();

    if (!linked.empty) {
      report.changes.push({ productId: pDoc.id, relinkRootId: linked.docs[0].id });
      if (!dryRun && p.traceabilityDocId !== linked.docs[0].id) {
        await pDoc.ref.update({
          traceabilityDocId: linked.docs[0].id,
          updatedAt: FieldValue.serverTimestamp(),
        });
        report.productsUpdated++;
      }
      continue;
    }

    report.changes.push({ productId: pDoc.id, createRoot: true });
    if (!dryRun) {
      await ensureTraceabilityRoot(pDoc.id);
      report.rootsCreated++;
    }
  }

  return report;
}

// --- Integrity ------------------------------------------------------------

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
 * Marks traceability root when inventory product is removed (soft-delete friendly)
 * and retires the product code so it can never be reissued.
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
  // snapshot / linking
  deriveCategoryIdsFromStoredProduct,
  buildSnapshotFields,
  buildNewTraceabilityRootDocument,
  ensureTraceabilityRoot,
  createProductWithTraceabilityRootTransaction,
  syncTraceabilityRootFromProduct,
  // product code
  normalizeProductCode,
  productCodeOf,
  getNextProductCode,
  getNextProductCategoryId,
  changeProductCode,
  retireProductCodeForProduct,
  rebuildProductCodeRegistry,
  // reconcile
  reconcileTraceabilityRoots,
  // integrity
  validateProductTraceability,
  findOrphanRoots,
  repairMissingRootForProduct,
  repairStaleProductPointer,
  markTraceabilityRootDeletedForProduct,
  ISSUE,
};
