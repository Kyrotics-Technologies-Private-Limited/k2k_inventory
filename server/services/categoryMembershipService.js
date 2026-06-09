const { db } = require('../firebase/firebase-config');
const { scheduleManifestRebuild } = require('./catalogManifestService');
const { attachStockStatusToMany } = require('./productStockService');

const CATEGORIES = 'categories';
const PRODUCTS = 'products';

function isProductActive(product) {
  const status = product.status;
  return !status || status === 'active';
}

function serializeTimestamp(value) {
  if (value?.toDate) {
    return value.toDate().toISOString();
  }
  return value;
}

function getProductCategoryIds(productData) {
  if (!productData) return [];
  if (Array.isArray(productData.categoryIds) && productData.categoryIds.length > 0) {
    return [...productData.categoryIds];
  }
  if (productData.categoryId) {
    return [productData.categoryId];
  }
  return [];
}

async function findMembershipCategoryIdsForProduct(productId) {
  const categoriesSnap = await db.collection(CATEGORIES).get();
  const checks = await Promise.all(
    categoriesSnap.docs.map(async (catDoc) => {
      const mem = await catDoc.ref.collection('products').doc(productId).get();
      return mem.exists ? catDoc.id : null;
    }),
  );
  return checks.filter(Boolean);
}

async function findCategoryIdBySlug(slug) {
  const bySlug = await db.collection(CATEGORIES).where('slug', '==', slug).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0].id;

  const byPrevious = await db.collection(CATEGORIES).where('previousSlugs', 'array-contains', slug).limit(1).get();
  if (!byPrevious.empty) return byPrevious.docs[0].id;

  return null;
}

async function getCategoryProducts(categoryId, { activeOnly = true } = {}) {
  const categoryRef = db.collection(CATEGORIES).doc(categoryId);
  const categorySnap = await categoryRef.get();
  if (!categorySnap.exists) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  const membershipSnap = await categoryRef.collection('products').orderBy('sortOrder').get();
  const results = [];

  for (const memDoc of membershipSnap.docs) {
    const membership = memDoc.data();
    const productSnap = await db.collection(PRODUCTS).doc(memDoc.id).get();
    if (!productSnap.exists) continue;

    const product = { id: productSnap.id, ...productSnap.data() };
    if (activeOnly && !isProductActive(product)) continue;

    results.push({
      ...product,
      membership: {
        sortOrder: membership.sortOrder,
        isFeatured: membership.isFeatured ?? false,
        addedAt: serializeTimestamp(membership.addedAt),
      },
    });
  }

  return attachStockStatusToMany(results);
}

async function getCategoryProductsBySlug(slug, options = {}) {
  const categoryId = await findCategoryIdBySlug(slug);
  if (!categoryId) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return getCategoryProducts(categoryId, options);
}

async function assignProductToCategory(categoryId, productId, opts = {}) {
  const categoryRef = db.collection(CATEGORIES).doc(categoryId);
  const membershipRef = categoryRef.collection('products').doc(productId);
  const productRef = db.collection(PRODUCTS).doc(productId);

  const result = await db.runTransaction(async (tx) => {
    const [categorySnap, membershipSnap, productSnap] = await Promise.all([
      tx.get(categoryRef),
      tx.get(membershipRef),
      tx.get(productRef),
    ]);

    if (!categorySnap.exists) {
      throw Object.assign(new Error('Category not found'), { status: 404 });
    }
    if (!productSnap.exists) {
      throw Object.assign(new Error('Product not found'), { status: 404 });
    }

    if (membershipSnap.exists) {
      const existing = membershipSnap.data();
      const updates = {};
      if (opts.isFeatured !== undefined && existing.isFeatured !== opts.isFeatured) {
        updates.isFeatured = opts.isFeatured;
      }
      if (opts.sortOrder !== undefined && existing.sortOrder !== opts.sortOrder) {
        updates.sortOrder = opts.sortOrder;
      }
      if (Object.keys(updates).length > 0) {
        tx.update(membershipRef, updates);
      }
      return { productId, ...existing, ...updates, idempotent: true };
    }

    const nextOrder = categorySnap.data().nextProductOrder ?? 100;
    const sortOrder = opts.sortOrder ?? nextOrder;
    const isFeatured = opts.isFeatured ?? false;
    const now = new Date();

    const membership = {
      productId,
      sortOrder,
      isFeatured,
      addedAt: now,
    };

    tx.set(membershipRef, membership);

    if (opts.sortOrder === undefined) {
      tx.update(categoryRef, { nextProductOrder: nextOrder + 100 });
    }

    return membership;
  });

  scheduleManifestRebuild();
  return result;
}

async function removeProductFromCategory(categoryId, productId) {
  const membershipRef = db.collection(CATEGORIES).doc(categoryId).collection('products').doc(productId);
  const membershipSnap = await membershipRef.get();

  if (!membershipSnap.exists) {
    return { removed: false, message: 'Membership not found' };
  }

  await membershipRef.delete();
  scheduleManifestRebuild();
  return { removed: true, categoryId, productId };
}

async function removeProductFromAllCategories(productId) {
  const membershipCategoryIds = await findMembershipCategoryIdsForProduct(productId);
  for (const categoryId of membershipCategoryIds) {
    await removeProductFromCategory(categoryId, productId);
  }
  return { productId, removedCount: membershipCategoryIds.length };
}

async function reorderCategoryProducts(categoryId, items) {
  const categoryRef = db.collection(CATEGORIES).doc(categoryId);
  const categorySnap = await categoryRef.get();
  if (!categorySnap.exists) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  const batch = db.batch();
  for (const item of items) {
    const ref = categoryRef.collection('products').doc(item.productId);
    batch.update(ref, { sortOrder: item.sortOrder });
  }

  await batch.commit();
  scheduleManifestRebuild();
  return { reordered: items.length };
}

async function setProductFeatured(categoryId, productId, isFeatured) {
  const membershipRef = db.collection(CATEGORIES).doc(categoryId).collection('products').doc(productId);
  const membershipSnap = await membershipRef.get();

  if (!membershipSnap.exists) {
    throw Object.assign(new Error('Membership not found'), { status: 404 });
  }

  await membershipRef.update({ isFeatured });
  scheduleManifestRebuild();
  return { productId, isFeatured };
}

async function updateMembership(categoryId, productId, updates) {
  const membershipRef = db.collection(CATEGORIES).doc(categoryId).collection('products').doc(productId);
  const membershipSnap = await membershipRef.get();

  if (!membershipSnap.exists) {
    throw Object.assign(new Error('Membership not found'), { status: 404 });
  }

  const allowed = {};
  if (updates.isFeatured !== undefined) allowed.isFeatured = updates.isFeatured;
  if (updates.sortOrder !== undefined) allowed.sortOrder = updates.sortOrder;

  if (Object.keys(allowed).length === 0) {
    throw Object.assign(new Error('No valid membership fields to update'), { status: 400 });
  }

  await membershipRef.update(allowed);
  scheduleManifestRebuild();

  return { productId, ...membershipSnap.data(), ...allowed };
}

async function syncProductCategories(productId, categoryIds) {
  const productRef = db.collection(PRODUCTS).doc(productId);
  const productSnap = await productRef.get();

  if (!productSnap.exists) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const uniqueIds = [...new Set(categoryIds)];
  const target = [];
  const skippedCategoryIds = [];

  for (const catId of uniqueIds) {
    const catSnap = await db.collection(CATEGORIES).doc(catId).get();
    if (catSnap.exists) {
      target.push(catId);
    } else {
      skippedCategoryIds.push(catId);
    }
  }

  const existingMemberships = await findMembershipCategoryIdsForProduct(productId);

  const toAdd = target.filter((id) => !existingMemberships.includes(id));
  const toRemove = existingMemberships.filter((id) => !target.includes(id));

  for (const catId of toRemove) {
    await removeProductFromCategory(catId, productId);
  }
  for (const catId of toAdd) {
    await assignProductToCategory(catId, productId);
  }

  await productRef.update({ categoryIds: target, updatedAt: new Date() });

  scheduleManifestRebuild();
  return {
    productId,
    categoryIds: target,
    added: toAdd.length,
    removed: toRemove.length,
    skippedCategoryIds,
  };
}

module.exports = {
  getCategoryProducts,
  getCategoryProductsBySlug,
  getProductCategoryIds,
  assignProductToCategory,
  removeProductFromCategory,
  removeProductFromAllCategories,
  reorderCategoryProducts,
  setProductFeatured,
  updateMembership,
  syncProductCategories,
};
