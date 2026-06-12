const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const snap = await db.collection('products').get();
    console.log('Total products in database:', snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Product ID: ${doc.id}, Name: ${data.name}, Status: ${data.status}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
