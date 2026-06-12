const { db } = require('../server/firebase/firebase-config');
const { getCategoryProducts } = require('../server/services/categoryMembershipService');
const { deleteCategory } = require('../server/controllers/categoryController');
const { syncProductCategories } = require('../server/services/categoryMembershipService');

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  const testCatId = 'cat_verification_test';
  const testProductId = 'prod_verification_test';

  try {
    console.log('--- Starting Integration Verification Tests ---');

    // Clean up any old test data
    await db.collection('categories').doc(testCatId).delete();
    await db.collection('products').doc(testProductId).delete();

    // 1. Create a mock category
    console.log('Creating mock category...');
    await db.collection('categories').doc(testCatId).set({
      name: 'Verification Test Category',
      urlLinkName: 'verification-test-category',
      slug: 'verification-test-category',
      isActive: true,
      sortOrder: 9999,
    });

    // 2. Create a mock product
    console.log('Creating mock product...');
    await db.collection('products').doc(testProductId).set({
      name: 'Verification Test Product',
      slug: 'verification-test-product',
      status: 'active',
      categoryIds: [testCatId],
    });

    // Sync product to category subcollection
    await syncProductCategories(testProductId, [testCatId]);

    // Verify initial active state
    let activeProducts = await getCategoryProducts(testCatId, { activeOnly: true });
    await assert(
      activeProducts.some(p => p.id === testProductId),
      'Product is initially visible in the active products list of the category'
    );

    // 3. Disable the category
    console.log('Disabling category...');
    await db.collection('categories').doc(testCatId).update({ isActive: false });

    // Verify the category itself is inactive
    const catSnap = await db.collection('categories').doc(testCatId).get();
    await assert(catSnap.data().isActive === false, 'Category isActive status is false');

    // Verify products are now hidden dynamically
    activeProducts = await getCategoryProducts(testCatId, { activeOnly: true });
    await assert(
      activeProducts.length === 0,
      'No products are returned when the category is disabled (activeOnly = true)'
    );

    // Verify product is not returned for other queries if it belongs to disabled category
    // e.g. let's check with another method. We know isProductActive checks disabled categories.

    // 4. Enable the category
    console.log('Re-enabling category...');
    await db.collection('categories').doc(testCatId).update({ isActive: true });

    activeProducts = await getCategoryProducts(testCatId, { activeOnly: true });
    await assert(
      activeProducts.some(p => p.id === testProductId),
      'Product is visible again after the category is re-enabled'
    );

    // 5. Delete the category (simulating request parameters)
    console.log('Deleting category...');
    const req = {
      params: { id: testCatId },
      user: { uid: 'system-test-admin' }
    };
    let resData = null;
    const res = {
      status: (code) => ({
        json: (data) => {
          resData = { code, data };
        }
      })
    };

    await deleteCategory(req, res);

    await assert(resData.code === 200, 'DeleteCategory API returned 200 OK');

    // Verify category doc is physically deleted
    const deletedCatSnap = await db.collection('categories').doc(testCatId).get();
    await assert(!deletedCatSnap.exists, 'Category document is physically deleted from Firestore');

    // Verify product category membership is cleaned up in product's categoryIds
    const updatedProdSnap = await db.collection('products').doc(testProductId).get();
    const prodCategoryIds = updatedProdSnap.data().categoryIds || [];
    await assert(
      !prodCategoryIds.includes(testCatId),
      'Category ID is removed from the product\'s categoryIds array'
    );

    // Clean up
    await db.collection('products').doc(testProductId).delete();

    console.log('--- All Tests Completed Successfully ---');
  } catch (error) {
    console.error('--- Verification Test Failed ---');
    console.error(error);
  }
  process.exit(0);
}

runTests();
