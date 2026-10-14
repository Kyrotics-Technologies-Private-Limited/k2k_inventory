const { db } = require('../server/firebase/firebase-config');

async function investigate() {
  try {
    console.log('=== PRODUCT CATEGORY (Traceability Root) ===');
    const catSnap = await db.collection('productCategory').get();
    console.log('Count:', catSnap.size);
    catSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`\nDoc ID: ${doc.id}`);
      console.log(`  productCategoryId: ${d.productCategoryId}`);
      console.log(`  productName: ${d.productName}`);
      console.log(`  productId: ${d.productId}`);
      console.log(`  productImage: ${d.productImage ? d.productImage.substring(0, 80) : 'none'}`);
      console.log(`  status: ${d.status}`);
      console.log(`  isActive: ${d.isActive}`);
      console.log(`  disabled: ${d.disabled}`);
      console.log(`  deletedAt: ${d.deletedAt}`);
      console.log(`  allKeys: ${Object.keys(d).join(', ')}`);
    });

    console.log('\n=== PRODUCTS IN INVENTORY ===');
    const prodSnap = await db.collection('products').get();
    console.log('Total Products:', prodSnap.size);
    prodSnap.docs.forEach(doc => {
      const d = doc.data();
      if (
        (d.name && /oil|ghee|must/i.test(d.name)) ||
        d.traceabilityDocId ||
        d.productCategoryId
      ) {
        console.log(`\nProduct ID: ${doc.id}`);
        console.log(`  Name: ${d.name}`);
        console.log(`  Status: ${d.status}`);
        console.log(`  isActive: ${d.isActive}`);
        console.log(`  traceabilityDocId: ${d.traceabilityDocId}`);
        console.log(`  productCategoryId: ${d.productCategoryId}`);
        console.log(`  Images:`, d.images);
      }
    });

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

investigate();
