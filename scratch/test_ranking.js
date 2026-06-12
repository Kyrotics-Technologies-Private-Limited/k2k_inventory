const { db } = require('../server/firebase/firebase-config');
const { getAllProducts } = require('../server/controllers/ProductController');
const { getAllCategories } = require('../server/controllers/categoryController');
const { buildCatalogManifest } = require('../server/services/catalogManifestService');

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  const catId1 = 'cat_rank_test_1';
  const catId2 = 'cat_rank_test_2';
  const prodId1 = 'prod_rank_test_1';
  const prodId2 = 'prod_rank_test_2';

  try {
    console.log('--- Starting Integration Ranking Tests ---');

    // Clean up old test data if present
    await db.collection('categories').doc(catId1).delete();
    await db.collection('categories').doc(catId2).delete();
    await db.collection('products').doc(prodId1).delete();
    await db.collection('products').doc(prodId2).delete();

    // 1. Create categories with sortOrder and rank
    console.log('Creating test categories...');
    // cat1 has sortOrder: 500, rank: 2
    await db.collection('categories').doc(catId1).set({
      name: 'Category B',
      urlLinkName: 'category-b',
      slug: 'category-b',
      sortOrder: 500,
      rank: 2,
      isActive: true
    });
    // cat2 has sortOrder: 100, rank: 1
    await db.collection('categories').doc(catId2).set({
      name: 'Category A',
      urlLinkName: 'category-a',
      slug: 'category-a',
      sortOrder: 100,
      rank: 1,
      isActive: true
    });

    // 2. Create products with rank
    console.log('Creating test products...');
    // prod1 has rank: 2
    await db.collection('products').doc(prodId1).set({
      name: 'Product B',
      slug: 'product-b',
      status: 'active',
      rank: 2,
      price: { amount: 10, currency: 'INR' },
      images: { main: '', gallery: [], banner: '' }
    });
    // prod2 has rank: 1
    await db.collection('products').doc(prodId2).set({
      name: 'Product A',
      slug: 'product-a',
      status: 'active',
      rank: 1,
      price: { amount: 15, currency: 'INR' },
      images: { main: '', gallery: [], banner: '' }
    });

    // 3. Verify Product Ranking
    console.log('Fetching and verifying product sorting by rank...');
    let resProducts = null;
    const reqMock = {};
    const resMock = {
      status: () => ({
        json: (data) => {
          resProducts = data;
        }
      })
    };
    await getAllProducts(reqMock, resMock);

    // Verify Product A (rank 1) appears before Product B (rank 2)
    const testProductsOnly = resProducts.filter(p => p.id === prodId1 || p.id === prodId2);
    await assert(testProductsOnly[0].id === prodId2, 'Product with rank 1 appears before product with rank 2');
    await assert(testProductsOnly[1].id === prodId1, 'Product with rank 2 appears after product with rank 1');

    // 4. Verify Category Sorting (Rank sorting is commented out, should use sortOrder)
    console.log('Fetching and verifying category sorting (should use sortOrder)...');
    let resCategories = null;
    const catReqMock = { query: {} };
    const catResMock = {
      status: () => ({
        json: (data) => {
          resCategories = data;
        }
      })
    };
    await getAllCategories(catReqMock, catResMock);

    const testCategoriesOnly = resCategories.filter(c => c.id === catId1 || c.id === catId2);
    // Category A (cat2) has sortOrder 100. Category B (cat1) has sortOrder 500.
    // So Category A (cat2) should appear before Category B (cat1).
    await assert(testCategoriesOnly[0].id === catId2, 'Category with sortOrder 100 appears before category with sortOrder 500 (rank ignored)');
    await assert(testCategoriesOnly[1].id === catId1, 'Category with sortOrder 500 appears after category with sortOrder 100 (rank ignored)');

    // 5. Verify catalog manifest builder compiles and runs
    console.log('Building manifest...');
    const manifest = await buildCatalogManifest();
    await assert(manifest !== null && manifest.version !== undefined, 'Catalog manifest rebuilt successfully');

    // Clean up database
    console.log('Cleaning up test data...');
    await db.collection('categories').doc(catId1).delete();
    await db.collection('categories').doc(catId2).delete();
    await db.collection('products').doc(prodId1).delete();
    await db.collection('products').doc(prodId2).delete();

    console.log('--- All Verification Tests Passed Successfully ---');
  } catch (err) {
    console.error('--- Verification Test Failed ---');
    console.error(err);
  }
  process.exit(0);
}

runTests();
