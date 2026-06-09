const { db } = require('../firebase/firebase-config');

const CATEGORIES = 'categories';
const PRODUCTS = 'products';
const MANIFEST_COLLECTION = 'catalogManifest';
const MANIFEST_DOC = 'latest';
const BUILD_STATE_DOC = 'build_state';

let rebuildTimer = null;
let isRebuilding = false;

function isProductActive(product) {
  const status = product.status;
  return !status || status === 'active';
}

function toCategorySummary(cat) {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.image || null,
    sortOrder: cat.sortOrder || 0,
  };
}

function buildCategoryTree(categories) {
  const map = new Map();
  const roots = [];

  for (const cat of categories) {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image || null,
      sortOrder: cat.sortOrder || 0,
      level: cat.level || 1,
      parentCategoryId: cat.parentCategoryId || null,
      children: [],
    });
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
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of nodes) {
      if (node.children.length) sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

function bannerKeyForCategory(cat) {
  if (cat.bannerKey) return cat.bannerKey;
  return `hero_${cat.slug.replace(/-/g, '_')}`;
}

async function getFeaturedProductsForCategory(categoryId) {
  const membershipSnap = await db
    .collection(CATEGORIES)
    .doc(categoryId)
    .collection('products')
    .orderBy('sortOrder')
    .get();

  const featured = [];

  for (const memDoc of membershipSnap.docs) {
    const membership = memDoc.data();
    if (!membership.isFeatured) continue;

    const productSnap = await db.collection(PRODUCTS).doc(memDoc.id).get();
    if (!productSnap.exists) continue;

    const product = productSnap.data();
    if (!isProductActive(product)) continue;

    featured.push({
      id: productSnap.id,
      name: product.name,
      slug: product.slug || productSnap.id,
      image: product.images?.main || product.image || null,
      sortOrder: membership.sortOrder || 0,
    });
  }

  return featured.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function buildCatalogManifest() {
  try {
    const categoriesSnap = await db.collection(CATEGORIES).where('isActive', '==', true).get();

    const categories = categoriesSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const menuCategories = buildCategoryTree(
      categories.filter((c) => c.showInMenu),
    );

    const footerCategories = categories
      .filter((c) => c.showInFooter)
      .map(toCategorySummary)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const featuredCategories = categories
      .filter((c) => c.isFeatured)
      .map(toCategorySummary)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const homepageCategories = categories.filter((c) => c.showOnHomepage);
    const homepageSections = await Promise.all(
      homepageCategories.map(async (cat) => ({
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        bannerKey: bannerKeyForCategory(cat),
        link: `/c/${cat.slug}`,
        image: cat.image || null,
        sortOrder: cat.sortOrder || 0,
        featuredProducts: await getFeaturedProductsForCategory(cat.id),
      })),
    );
    homepageSections.sort((a, b) => a.sortOrder - b.sortOrder);

    const latestRef = db.collection(MANIFEST_COLLECTION).doc(MANIFEST_DOC);
    const latestSnap = await latestRef.get();
    const version = (latestSnap.exists ? latestSnap.data().version || 0 : 0) + 1;

    const manifest = {
      version,
      builtAt: new Date().toISOString(),
      buildStatus: 'success',
      lastBuildError: null,
      menuCategories,
      homepageSections,
      footerCategories,
      featuredCategories,
    };

    await latestRef.set(manifest);
    await db.collection(MANIFEST_COLLECTION).doc(BUILD_STATE_DOC).set({
      buildStatus: 'success',
      lastBuildError: null,
      lastBuiltAt: manifest.builtAt,
      version,
    });

    console.log(`[catalogManifest] Built v${version} (${categories.length} categories)`);
    return manifest;
  } catch (error) {
    console.error('[catalogManifest] Build failed:', error);

    await db.collection(MANIFEST_COLLECTION).doc(BUILD_STATE_DOC).set({
      buildStatus: 'error',
      lastBuildError: error.message,
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
}

function scheduleManifestRebuild() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(async () => {
    rebuildTimer = null;

    if (isRebuilding) {
      scheduleManifestRebuild();
      return;
    }

    isRebuilding = true;
    try {
      await buildCatalogManifest();
    } catch (err) {
      console.error('[catalogManifest] Scheduled rebuild failed:', err.message);
    } finally {
      isRebuilding = false;
    }
  }, 500);
}

async function getManifest() {
  const doc = await db.collection(MANIFEST_COLLECTION).doc(MANIFEST_DOC).get();
  if (!doc.exists) return null;
  return doc.data();
}

module.exports = {
  buildCatalogManifest,
  scheduleManifestRebuild,
  getManifest,
};
