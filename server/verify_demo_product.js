const { db } = require('./firebase/firebase-config');

async function verifyProduct() {
    const productId = 'Zsy3iCacT4FyHcf7gZmj';
    const traceabilityId = 'pzUvqsYS0oiEtH9BxOC1';

    console.log('--- Checking Products Collection ---');
    const productDoc = await db.collection('products').doc(productId).get();
    if (productDoc.exists) {
        console.log('Product found in "products":', productDoc.data().name);
        console.log('Linked Traceability ID:', productDoc.data().traceabilityDocId);
    } else {
        console.log('Product NOT found in "products".');
    }

    console.log('\n--- Checking Traceability Root (productCategory) Collection ---');
    const rootDoc = await db.collection('productCategory').doc(traceabilityId).get();
    if (rootDoc.exists) {
        console.log('Traceability Root found in "productCategory":', rootDoc.data().productName);
        console.log('Linked Product ID:', rootDoc.data().productId);
    } else {
        console.log('Traceability Root NOT found in "productCategory".');
    }
    
    process.exit(0);
}

verifyProduct().catch(err => {
    console.error(err);
    process.exit(1);
});
