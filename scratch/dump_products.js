const { db } = require('../server/firebase/firebase-config');

async function dump() {
  try {
    const snap = await db.collection('products').get();
    console.log('Products count:', snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Product ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  CategoryIds: ${JSON.stringify(data.categoryIds)}`);
      console.log(`  Rank: ${data.rank}`);
      console.log(`  Price: ${JSON.stringify(data.price)}`);
    });
  } catch (error) {
    console.error('Error dumping products:', error);
  }
  process.exit(0);
}

dump();
