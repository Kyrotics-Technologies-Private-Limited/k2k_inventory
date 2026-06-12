const { db } = require('../firebase/firebase-config');
const membershipService = require('../services/categoryMembershipService');
const { scheduleManifestRebuild } = require('../services/catalogManifestService');

const CATEGORIES = 'categories';

// --- Helpers ---

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function categoryIdFromUrlLinkName(urlLinkName) {
  const normalized = urlLinkName.toLowerCase().replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
  return `cat_${normalized}`;
}

function serializeCategory(id, data) {
  const result = { id, ...data };
  // Backward compatibility mappings
  if (data.slug && !data.urlLinkName) {
    result.urlLinkName = data.slug;
  }
  result.slug = data.urlLinkName || data.slug;
  
  for (const key of ['createdAt', 'updatedAt']) {
    if (result[key]?.toDate) {
      result[key] = result[key].toDate().toISOString();
    }
  }
  return result;
}

async function urlLinkNameTaken(urlLinkName, excludeId = null) {
  const byUrlName = await db.collection(CATEGORIES).where('urlLinkName', '==', urlLinkName).get();
  for (const doc of byUrlName.docs) {
    if (doc.id !== excludeId) return true;
  }

  const bySlug = await db.collection(CATEGORIES).where('slug', '==', urlLinkName).get();
  for (const doc of bySlug.docs) {
    if (doc.id !== excludeId) return true;
  }

  const byPreviousUrl = await db.collection(CATEGORIES).where('previousUrlLinkNames', 'array-contains', urlLinkName).get();
  for (const doc of byPreviousUrl.docs) {
    if (doc.id !== excludeId) return true;
  }

  const byPreviousSlug = await db.collection(CATEGORIES).where('previousSlugs', 'array-contains', urlLinkName).get();
  for (const doc of byPreviousSlug.docs) {
    if (doc.id !== excludeId) return true;
  }

  return false;
}

async function wouldCreateCycle(categoryId, parentCategoryId) {
  if (!parentCategoryId) return false;
  if (parentCategoryId === categoryId) return true;

  let currentId = parentCategoryId;
  const visited = new Set();

  while (currentId) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const doc = await db.collection(CATEGORIES).doc(currentId).get();
    if (!doc.exists) return false;
    currentId = doc.data().parentCategoryId || null;
  }

  return false;
}

async function resolveParent(parentCategoryId) {
  if (!parentCategoryId) {
    return { parentCategoryId: null, level: 1 };
  }

  const parentDoc = await db.collection(CATEGORIES).doc(parentCategoryId).get();
  if (!parentDoc.exists) {
    throw Object.assign(new Error('Parent category not found'), { status: 400 });
  }

  const parentData = parentDoc.data();
  return {
    parentCategoryId,
    level: (parentData.level || 1) + 1,
  };
}

async function getMaxSortOrder() {
  const snapshot = await db.collection(CATEGORIES).orderBy('sortOrder', 'desc').limit(1).get();
  if (snapshot.empty) return 0;
  return snapshot.docs[0].data().sortOrder || 0;
}

async function resolveDeprecatedCategoryFields(categoryIds) {
  if (!categoryIds?.length) {
    return { category: null, categories: [] };
  }

  const names = [];
  for (const catId of categoryIds) {
    const doc = await db.collection(CATEGORIES).doc(catId).get();
    if (doc.exists) {
      names.push(doc.data().name);
    }
  }

  return {
    category: names[0] || null,
    categories: names,
  };
}

function buildCategoryTree(categories) {
  const map = new Map();
  const roots = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id);
    if (cat.parentCategoryId && map.has(cat.parentCategoryId)) {
      map.get(cat.parentCategoryId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes) => {
    // nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    for (const node of nodes) {
      if (node.children?.length) sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

async function findCategoryBySlug(slug) {
  const byUrlName = await db.collection(CATEGORIES).where('urlLinkName', '==', slug).limit(1).get();
  if (!byUrlName.empty) {
    const doc = byUrlName.docs[0];
    return serializeCategory(doc.id, doc.data());
  }

  const bySlug = await db.collection(CATEGORIES).where('slug', '==', slug).limit(1).get();
  if (!bySlug.empty) {
    const doc = bySlug.docs[0];
    return serializeCategory(doc.id, doc.data());
  }

  const byPreviousUrl = await db.collection(CATEGORIES).where('previousUrlLinkNames', 'array-contains', slug).limit(1).get();
  if (!byPreviousUrl.empty) {
    const doc = byPreviousUrl.docs[0];
    return serializeCategory(doc.id, doc.data());
  }

  const byPreviousSlug = await db.collection(CATEGORIES).where('previousSlugs', 'array-contains', slug).limit(1).get();
  if (!byPreviousSlug.empty) {
    const doc = byPreviousSlug.docs[0];
    return serializeCategory(doc.id, doc.data());
  }

  return null;
}

// --- Controllers ---

exports.createCategory = async (req, res) => {
  try {
    const { name, urlLinkName, image, parentCategoryId, sortOrder, showInMenu, showOnHomepage, showInFooter, isFeatured, rank } = req.body;

    if (!name || !urlLinkName) {
      return res.status(400).json({ error: 'name and urlLinkName are required' });
    }

    const urlLinkNameNormalized = normalizeSlug(urlLinkName);
    if (!urlLinkNameNormalized) {
      return res.status(400).json({ error: 'Invalid URL Link Name' });
    }

    if (await urlLinkNameTaken(urlLinkNameNormalized)) {
      return res.status(409).json({ error: 'URL Link Name already in use' });
    }

    let parentInfo;
    try {
      parentInfo = await resolveParent(parentCategoryId || null);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }

    const id = req.body.id || categoryIdFromUrlLinkName(urlLinkNameNormalized);
    const existingDoc = await db.collection(CATEGORIES).doc(id).get();
    if (existingDoc.exists) {
      return res.status(409).json({ error: 'Category ID already exists' });
    }

    const resolvedSortOrder = sortOrder ?? (await getMaxSortOrder()) + 100;
    const now = new Date();
    const uid = req.user.uid;

    const categoryData = {
      name,
      urlLinkName: urlLinkNameNormalized,
      slug: urlLinkNameNormalized, // Keep duplicate slug for DB consistency
      image: image || null,
      parentCategoryId: parentInfo.parentCategoryId,
      level: parentInfo.level,
      sortOrder: resolvedSortOrder,
      nextProductOrder: 100,
      showInMenu: showInMenu ?? true,
      showOnHomepage: showOnHomepage ?? true,
      showInFooter: showInFooter ?? true,
      isFeatured: isFeatured ?? true,
      isActive: true,
      rank: rank !== undefined && rank !== null && rank !== "" ? Number(rank) : null,
      previousUrlLinkNames: [],
      previousSlugs: [], // Keep duplicate for DB consistency
      createdBy: uid,
      updatedBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(CATEGORIES).doc(id).set(categoryData);
    scheduleManifestRebuild();
    res.status(201).json(serializeCategory(id, categoryData));
  } catch (error) {
    console.error('createCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const { active, showInMenu, tree } = req.query;
    let query = db.collection(CATEGORIES);

    if (active === 'true') {
      query = query.where('isActive', '==', true);
    }
    if (showInMenu === 'true') {
      query = query.where('showInMenu', '==', true);
    }

    const snapshot = await query.get();
    let categories = snapshot.docs
      .map((doc) => serializeCategory(doc.id, doc.data()));

    // Sort categories by rank (commented out as requested)
    /*
    categories.sort((a, b) => {
      const rankA = a.rank !== undefined && a.rank !== null ? a.rank : 999999;
      const rankB = b.rank !== undefined && b.rank !== null ? b.rank : 999999;
      return rankA - rankB;
    });
    */

    // categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (tree === 'true') {
      categories = buildCategoryTree(categories);
    }

    res.status(200).json(categories);
  } catch (error) {
    console.error('getAllCategories error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await findCategoryBySlug(slug);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('getCategoryBySlug error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(CATEGORIES).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json(serializeCategory(doc.id, doc.data()));
  } catch (error) {
    console.error('getCategoryById error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(CATEGORIES).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const existing = doc.data();
    const updates = {};
    const allowedFields = [
      'name', 'image', 'sortOrder', 'showInMenu', 'showOnHomepage',
      'showInFooter', 'isFeatured', 'isActive', 'parentCategoryId', 'rank',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'rank') {
          updates.rank = req.body.rank !== null && req.body.rank !== "" ? Number(req.body.rank) : null;
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (req.body.urlLinkName !== undefined) {
      const newUrlName = normalizeSlug(req.body.urlLinkName);
      if (!newUrlName) {
        return res.status(400).json({ error: 'Invalid URL Link Name' });
      }
      const currentUrlName = existing.urlLinkName || existing.slug;
      if (newUrlName !== currentUrlName) {
        if (await urlLinkNameTaken(newUrlName, id)) {
          return res.status(409).json({ error: 'URL Link Name already in use' });
        }
        const previousUrlLinkNames = [...(existing.previousUrlLinkNames || [])];
        if (currentUrlName && !previousUrlLinkNames.includes(currentUrlName)) {
          previousUrlLinkNames.push(currentUrlName);
        }
        updates.previousUrlLinkNames = previousUrlLinkNames;
        updates.urlLinkName = newUrlName;
        
        // Keep slug sync
        updates.slug = newUrlName;
        const previousSlugs = [...(existing.previousSlugs || [])];
        if (currentUrlName && !previousSlugs.includes(currentUrlName)) {
          previousSlugs.push(currentUrlName);
        }
        updates.previousSlugs = previousSlugs;
      }
    }

    if (req.body.parentCategoryId !== undefined) {
      try {
        const parentInfo = await resolveParent(req.body.parentCategoryId || null);
        updates.parentCategoryId = parentInfo.parentCategoryId;
        updates.level = parentInfo.level;
      } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }

      if (await wouldCreateCycle(id, updates.parentCategoryId)) {
        return res.status(400).json({ error: 'Invalid parentCategoryId — would create a cycle' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updatedBy = req.user.uid;
    updates.updatedAt = new Date();

    await docRef.update(updates);
    scheduleManifestRebuild();
    const updated = await docRef.get();
    res.status(200).json(serializeCategory(updated.id, updated.data()));
  } catch (error) {
    console.error('updateCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(CATEGORIES).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const batch = db.batch();

    // 1. Delete all membership documents in the category's products subcollection
    const productsSubRef = docRef.collection('products');
    const productsSnap = await productsSubRef.get();
    productsSnap.docs.forEach(pDoc => {
      batch.delete(pDoc.ref);
    });

    // 2. Remove this categoryId from all products in the main products collection
    const productsMainSnap = await db.collection('products').where('categoryIds', 'array-contains', id).get();
    for (const pDoc of productsMainSnap.docs) {
      const data = pDoc.data();
      const newCategoryIds = (data.categoryIds || []).filter(catId => catId !== id);
      
      const updates = {
        categoryIds: newCategoryIds,
        updatedAt: new Date()
      };

      // Also update legacy display fields
      const deprecated = await resolveDeprecatedCategoryFields(newCategoryIds);
      updates.category = deprecated.category;
      updates.categories = deprecated.categories;

      batch.update(pDoc.ref, updates);
    }

    // 3. Update child categories that have this category as parent
    const childCatsSnap = await db.collection(CATEGORIES).where('parentCategoryId', '==', id).get();
    childCatsSnap.docs.forEach(cDoc => {
      batch.update(cDoc.ref, {
        parentCategoryId: null,
        level: 1,
        updatedAt: new Date()
      });
    });

    // 4. Delete the category document itself
    batch.delete(docRef);

    await batch.commit();
    scheduleManifestRebuild();

    res.status(200).json({ message: 'Category deleted successfully', id });
  } catch (error) {
    console.error('deleteCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Body must be a non-empty array of { id, sortOrder }' });
    }

    for (const item of items) {
      if (!item.id || item.sortOrder === undefined) {
        return res.status(400).json({ error: 'Each item requires id and sortOrder' });
      }
    }

    const batch = db.batch();
    const now = new Date();
    const uid = req.user.uid;

    for (const item of items) {
      const ref = db.collection(CATEGORIES).doc(item.id);
      batch.update(ref, {
        sortOrder: item.sortOrder,
        updatedBy: uid,
        updatedAt: now,
      });
    }

    await batch.commit();
    scheduleManifestRebuild();
    res.status(200).json({ message: 'Categories reordered', count: items.length });
  } catch (error) {
    console.error('reorderCategories error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Membership handlers (Phase 2) ---

exports.getCategoryProducts = async (req, res) => {
  try {
    const products = await membershipService.getCategoryProducts(req.params.id, { activeOnly: false });
    res.status(200).json(products);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('getCategoryProducts error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoryProductsBySlug = async (req, res) => {
  try {
    const products = await membershipService.getCategoryProductsBySlug(req.params.slug);
    res.status(200).json(products);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('getCategoryProductsBySlug error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.assignProduct = async (req, res) => {
  try {
    const { productId, isFeatured, sortOrder } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const membership = await membershipService.assignProductToCategory(
      req.params.id,
      productId,
      { isFeatured, sortOrder },
    );

    scheduleManifestRebuild();

    res.status(membership.idempotent ? 200 : 201).json(membership);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('assignProduct error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    const result = await membershipService.removeProductFromCategory(
      req.params.id,
      req.params.productId,
    );

    if (!result.removed) {
      return res.status(404).json({ error: result.message });
    }

    scheduleManifestRebuild();

    res.status(200).json(result);
  } catch (error) {
    console.error('removeProduct error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.reorderCategoryProducts = async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Body must be a non-empty array of { productId, sortOrder }' });
    }

    for (const item of items) {
      if (!item.productId || item.sortOrder === undefined) {
        return res.status(400).json({ error: 'Each item requires productId and sortOrder' });
      }
    }

    const result = await membershipService.reorderCategoryProducts(req.params.id, items);
    scheduleManifestRebuild();
    res.status(200).json({ message: 'Products reordered', ...result });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('reorderCategoryProducts error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateMembership = async (req, res) => {
  try {
    const result = await membershipService.updateMembership(
      req.params.id,
      req.params.productId,
      req.body,
    );
    scheduleManifestRebuild();
    res.status(200).json(result);
  } catch (error) {
    if (error.status === 404 || error.status === 400) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('updateMembership error:', error);
    res.status(500).json({ error: error.message });
  }
};
