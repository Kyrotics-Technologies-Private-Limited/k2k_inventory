const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const productsSnap = await db.collection('products').get();
    console.log('Searching products...');
    productsSnap.docs.forEach(doc => {
      const data = doc.data();
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes('atta')) {
        console.log(`Found in products: ${doc.id} - Name: ${data.name}, Status: ${data.status}`);
      }
    });

    const categoriesSnap = await db.collection('categories').get();
    console.log('Searching categories...');
    categoriesSnap.docs.forEach(doc => {
      const data = doc.data();
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes('atta')) {
        console.log(`Found in categories: ${doc.id} - Name: ${data.name}, isActive: ${data.isActive}`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
